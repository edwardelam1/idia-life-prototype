// Identity Ledger — user-scoped fetcher + CSV builder.
// Pulls only the authenticated user's records from `user_aca_records`
// (filtered by platform_guid) and a zero-PII slice of `profiles`.

import { supabase } from "@/integrations/supabase/client";
import { saveFileToDevice } from "@/utils/nativeDownload";

export interface LedgerProfile {
  display_name: string | null;
  subscription_tier: string | null;
  kyc_status: string | null;
  created_at: string | null;
}

export interface LedgerRecord {
  created_at: string;
  source_id: string | null;
  consent_type: string | null;
  consent_scope: string[] | null;
  aca_hash_key: string;
  tx_hash: string | null;
}

export interface LedgerPayload {
  profile: LedgerProfile | null;
  records: LedgerRecord[];
}

export async function fetchLedger(userId: string): Promise<LedgerPayload> {
  const [profileRes, recordsRes] = await Promise.all([
    (supabase as any)
      .from("profiles")
      .select("display_name, subscription_tier, kyc_status, created_at")
      .eq("user_id", userId)
      .maybeSingle(),
    (supabase as any)
      .from("user_aca_records")
      .select("created_at, source_id, consent_type, consent_scope, aca_hash_key, tx_hash")
      .eq("platform_guid", userId)
      .order("created_at", { ascending: false }),
  ]);

  if (recordsRes.error) throw recordsRes.error;

  return {
    profile: (profileRes?.data as LedgerProfile) ?? null,
    records: (recordsRes.data as LedgerRecord[]) ?? [],
  };
}

const q = (v: unknown): string => {
  const s = v === null || v === undefined ? "" : Array.isArray(v) ? v.join("; ") : String(v);
  return `"${s.replace(/"/g, '""')}"`;
};

export function buildLedgerCsv({ profile, records }: LedgerPayload): string {
  const rows: string[][] = [];

  rows.push(["--- SOVEREIGN IDENTITY PROFILE ---"]);
  rows.push(["Display Name", "Subscription Tier", "KYC Status", "Created At"]);
  rows.push([
    profile?.display_name ?? "N/A",
    profile?.subscription_tier ?? "N/A",
    profile?.kyc_status ?? "N/A",
    profile?.created_at ?? "N/A",
  ]);
  rows.push([]);

  rows.push(["--- CONSENT RECORDS (ACA LEDGER) ---"]);
  rows.push(["Timestamp", "Source", "Consent Type", "Consent Scope", "ACA Hash", "Tx Hash"]);
  if (records.length === 0) {
    rows.push(["No consent records on file."]);
  } else {
    for (const r of records) {
      rows.push([
        r.created_at,
        r.source_id ?? "",
        r.consent_type ?? "",
        (r.consent_scope ?? []).join("; "),
        r.aca_hash_key,
        r.tx_hash ?? "",
      ]);
    }
  }

  return rows.map((row) => row.map(q).join(",")).join("\n");
}

export async function downloadLedgerCsv(payload: LedgerPayload): Promise<void> {
  const csv = buildLedgerCsv(payload);
  const filename = `IDIA_Sovereign_Export_${new Date().toISOString().split("T")[0]}.csv`;
  await saveFileToDevice({ filename, data: csv, mimeType: "text/csv;charset=utf-8;" });
}
