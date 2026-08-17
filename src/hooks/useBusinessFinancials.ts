import { useCallback, useEffect, useState } from "react";
import { getCachedUser } from "@/lib/authUser";
import { supabase } from "@/integrations/supabase/client";

/**
 * Reads the double-entry ledger (gl_accounts / journal_entries / journal_lines)
 * plus bank_transactions for the signed-in user's active business.
 *
 * Zero mock data: every figure is derived from posted ledger rows. When the
 * ledger is empty the hook reports isEmpty so panels can show an honest state.
 */

const ORG_ADMIN_VALUES = ["org_admin", "Org Admin", "org admin", "admin"];

export interface PeriodPnl {
  period: string;
  revenue: number;
  expense: number;
  netIncome: number;
}

export interface BalanceRow {
  code: string;
  name: string;
  balance: number;
}

export interface BalanceSheet {
  assets: BalanceRow[];
  liabilities: BalanceRow[];
  equity: BalanceRow[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  balanced: boolean;
}

export interface CashTxn {
  id: string;
  date: string;
  description: string | null;
  amount: number;
  bucket: "operating" | "investing" | "financing";
}

export interface CashFlow {
  operating: number;
  investing: number;
  financing: number;
  netChange: number;
  recent: CashTxn[];
}

interface State {
  loading: boolean;
  businessId: string | null;
  isOrgAdmin: boolean;
  pnl: PeriodPnl[];
  balanceSheet: BalanceSheet;
  cashFlow: CashFlow;
  isEmpty: boolean;
  error: string | null;
}

const EMPTY_BS: BalanceSheet = {
  assets: [], liabilities: [], equity: [],
  totalAssets: 0, totalLiabilities: 0, totalEquity: 0, balanced: true,
};

const EMPTY_CF: CashFlow = { operating: 0, investing: 0, financing: 0, netChange: 0, recent: [] };

const INITIAL: State = {
  loading: true,
  businessId: null,
  isOrgAdmin: false,
  pnl: [],
  balanceSheet: EMPTY_BS,
  cashFlow: EMPTY_CF,
  isEmpty: true,
  error: null,
};

const bucketFor = (category?: string | null): CashTxn["bucket"] => {
  const c = (category || "").toLowerCase();
  if (c.includes("invest")) return "investing";
  if (c.includes("financ") || c.includes("loan") || c.includes("equity")) return "financing";
  return "operating";
};

const num = (v: any) => (typeof v === "number" ? v : parseFloat(v || "0") || 0);

export const useBusinessFinancials = (enabled = true) => {
  const [state, setState] = useState<State>(INITIAL);

  const load = useCallback(async () => {
    if (!enabled) return;
    setState((s) => ({ ...s, loading: true }));

    try {
      const { data: userData } = await getCachedUser();
      const user = userData?.user;
      if (!user) {
        setState({ ...INITIAL, loading: false });
        return;
      }

      const { data: empRows } = await supabase
        .from("employees" as any)
        .select("business_id, platform_role")
        .eq("user_id", user.id)
        .eq("status", "active");

      const rows = (empRows || []) as any[];
      const adminRow = rows.find((r) => ORG_ADMIN_VALUES.includes(r.platform_role));
      const isOrgAdmin =
        !!adminRow || (user.app_metadata as any)?.role === "org_admin";
      const businessId = (adminRow || rows[0])?.business_id || null;

      if (!businessId) {
        setState({ ...INITIAL, loading: false, isOrgAdmin });
        return;
      }

      // Chart of accounts
      const { data: acctRows } = await supabase
        .from("gl_accounts" as any)
        .select("id, code, name, type, normal_balance, is_active")
        .eq("business_id", businessId);

      const accounts = (acctRows || []) as any[];
      const acctById = new Map(accounts.map((a) => [a.id, a]));

      // Posted journal entries for this business
      const { data: entryRows } = await supabase
        .from("journal_entries" as any)
        .select("id, period, entry_date, posted_at, reversed_by")
        .eq("business_id", businessId)
        .order("entry_date", { ascending: false })
        .limit(2000);

      const entries = ((entryRows || []) as any[]).filter((e) => !e.reversed_by);
      const entryById = new Map(entries.map((e) => [e.id, e]));

      let lines: any[] = [];
      if (entries.length > 0) {
        const { data: lineRows } = await supabase
          .from("journal_lines" as any)
          .select("journal_entry_id, gl_account_id, debit, credit")
          .in(
            "journal_entry_id",
            entries.slice(0, 500).map((e) => e.id),
          );
        lines = (lineRows || []) as any[];
      }

      // ---- P&L by period ----
      const periodMap = new Map<string, PeriodPnl>();
      // ---- Balance sheet balances ----
      const balances = new Map<string, number>();

      for (const l of lines) {
        const acct = acctById.get(l.gl_account_id);
        const entry = entryById.get(l.journal_entry_id);
        if (!acct || !entry) continue;

        const debit = num(l.debit);
        const credit = num(l.credit);
        const type = (acct.type || "").toLowerCase();

        if (type === "revenue" || type === "expense") {
          const period = entry.period || String(entry.entry_date || "").slice(0, 7);
          const bucket =
            periodMap.get(period) || { period, revenue: 0, expense: 0, netIncome: 0 };
          if (type === "revenue") bucket.revenue += credit - debit;
          else bucket.expense += debit - credit;
          bucket.netIncome = bucket.revenue - bucket.expense;
          periodMap.set(period, bucket);
        } else {
          const normal = (acct.normal_balance || (type === "asset" ? "debit" : "credit")).toLowerCase();
          const delta = normal === "debit" ? debit - credit : credit - debit;
          balances.set(acct.id, (balances.get(acct.id) || 0) + delta);
        }
      }

      const pnl = Array.from(periodMap.values())
        .sort((a, b) => a.period.localeCompare(b.period))
        .slice(-6);

      const toRows = (type: string): BalanceRow[] =>
        accounts
          .filter((a) => (a.type || "").toLowerCase() === type)
          .map((a) => ({ code: a.code, name: a.name, balance: balances.get(a.id) || 0 }))
          .filter((r) => r.balance !== 0)
          .sort((a, b) => String(a.code).localeCompare(String(b.code)));

      const assets = toRows("asset");
      const liabilities = toRows("liability");
      const equity = toRows("equity");
      const sum = (rs: BalanceRow[]) => rs.reduce((t, r) => t + r.balance, 0);
      const totalAssets = sum(assets);
      const totalLiabilities = sum(liabilities);
      const totalEquity = sum(equity);

      const balanceSheet: BalanceSheet = {
        assets, liabilities, equity,
        totalAssets, totalLiabilities, totalEquity,
        balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
      };

      // ---- Cash flow from bank transactions ----
      const { data: bankRows } = await supabase
        .from("bank_transactions" as any)
        .select("id, txn_date, description, amount, direction, category")
        .eq("business_id", businessId)
        .order("txn_date", { ascending: false })
        .limit(200);

      const txns: CashTxn[] = ((bankRows || []) as any[]).map((t) => {
        const signed =
          (t.direction || "").toLowerCase() === "out" ? -Math.abs(num(t.amount)) : num(t.amount);
        return {
          id: t.id,
          date: t.txn_date,
          description: t.description,
          amount: signed,
          bucket: bucketFor(t.category),
        };
      });

      const cashFlow: CashFlow = {
        operating: txns.filter((t) => t.bucket === "operating").reduce((s, t) => s + t.amount, 0),
        investing: txns.filter((t) => t.bucket === "investing").reduce((s, t) => s + t.amount, 0),
        financing: txns.filter((t) => t.bucket === "financing").reduce((s, t) => s + t.amount, 0),
        netChange: txns.reduce((s, t) => s + t.amount, 0),
        recent: txns.slice(0, 8),
      };

      setState({
        loading: false,
        businessId,
        isOrgAdmin,
        pnl,
        balanceSheet,
        cashFlow,
        isEmpty: pnl.length === 0 && assets.length === 0 && liabilities.length === 0 && equity.length === 0 && txns.length === 0,
        error: null,
      });
    } catch (err: any) {
      console.error("[BUSINESS_FINANCIALS_ERROR]", err);
      setState({ ...INITIAL, loading: false, error: err?.message || "Ledger read failed" });
    }
  }, [enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refresh: load };
};
