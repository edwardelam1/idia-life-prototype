import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface WalletBalance {
  cash_balance: number;
  idia_beta_balance: number;
  idia_token_balance: number;
  total_earned: number;
}

const ZERO_FLOOR: WalletBalance = {
  cash_balance: 0,
  idia_beta_balance: 0,
  idia_token_balance: 0,
  total_earned: 0,
};

// Purge any legacy persisted wallet state (no-persistence rule)
const purgeLegacyWalletCache = () => {
  console.log("BEGIN: Executing purgeLegacyWalletCache");
  try {
    const keys = ["wallet_balance", "user_wallet", "user_wallets", "cash_balance", "idia_balance"];
    keys.forEach((k) => {
      window.localStorage.removeItem(k);
      window.sessionStorage.removeItem(k);
    });
  } catch (error) {
    console.error("BEGIN ERROR: purgeLegacyWalletCache failed.");
    console.error("ERROR DETAILS:", error instanceof Error ? error.message : String(error));
    console.error("END ERROR: purgeLegacyWalletCache terminated.");
  } finally {
    console.log("END: Executing purgeLegacyWalletCache");
  }
};

export const useWalletBalance = () => {
  const [balance, setBalance] = useState<WalletBalance>(ZERO_FLOOR);
  const [loading, setLoading] = useState(true);

  const applyRow = useCallback((row: any | null, userId: string) => {
    console.log("BEGIN: Executing applyRow in useWalletBalance");
    try {
      if (!row) {
        console.info(`[IDIA-LIFE: Vault_Sync] No vault row for ${userId} — anchoring to Zero Floor`);
        setBalance(ZERO_FLOOR);
        return;
      }
      console.info(`[IDIA-LIFE: Vault_Sync] Payload:`, row);
      setBalance({
        cash_balance: Number(row.cash_balance) || 0,
        idia_beta_balance: Number(row.idia_beta_balance) || 0,
        idia_token_balance: Number(row.idia_token_balance) || 0,
        total_earned: 0,
      });
    } catch (error) {
      console.error("BEGIN ERROR: applyRow execution failed.");
      console.error("ERROR DETAILS:", error instanceof Error ? error.message : String(error));
      console.error("END ERROR: applyRow terminated.");
    } finally {
      console.log("END: Executing applyRow in useWalletBalance");
    }
  }, []);

  const fetchBalance = useCallback(async () => {
    console.log("BEGIN: Executing fetchBalance in useWalletBalance");
    purgeLegacyWalletCache();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setBalance(ZERO_FLOOR);
        setLoading(false);
        return;
      }

      console.info(`[IDIA-LIFE: Vault_Sync] Ingesting LKS for User: ${user.id}`);

      const { data, error } = await supabase
        .from("wallets")
        .select("cash_balance, idia_beta_balance, idia_token_balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("BEGIN ERROR: Supabase query failed in fetchBalance.");
        console.error("[FATAL: Vault_Sync] Unreachable state. Check Supabase connection.", error);
        console.error("END ERROR: Supabase query failed.");
        setBalance(ZERO_FLOOR);
      } else {
        applyRow(data, user.id);
      }
    } catch (err) {
      console.error("BEGIN ERROR: fetchBalance execution failed.");
      console.error("[FATAL: Vault_Sync] Unreachable state. Check Supabase connection.", err);
      console.error("END ERROR: fetchBalance execution terminated.");
      setBalance(ZERO_FLOOR);
    } finally {
      setLoading(false);
      console.log("END: Executing fetchBalance in useWalletBalance");
    }
  }, [applyRow]);

  useEffect(() => {
    console.log("BEGIN: Executing useEffect setup in useWalletBalance");
    let channel: any;
    let cancelled = false;

    const setup = async () => {
      console.log("BEGIN: Executing setup function inside useEffect");
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) {
          setLoading(false);
          return;
        }

        await fetchBalance();

        channel = supabase
          .channel(`vault-sync-${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "wallets",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              console.info("[IDIA-LIFE: Vault_Sync] Realtime delta:", payload);
              if (payload.eventType === "DELETE") {
                setBalance(ZERO_FLOOR);
                return;
              }
              applyRow(payload.new, user.id);
            },
          )
          .subscribe((status, err) => {
            console.info("[IDIA-LIFE: Vault_Sync] Channel status:", status);
            if (err) {
              console.error("BEGIN ERROR: Supabase channel subscription error.");
              console.error("[FATAL: Vault_Sync] Channel error:", err);
              console.error("END ERROR: Supabase channel subscription error.");
            }
          });
      } catch (error) {
        console.error("BEGIN ERROR: useEffect setup function failed.");
        console.error("ERROR DETAILS:", error instanceof Error ? error.message : String(error));
        console.error("END ERROR: useEffect setup function terminated.");
      } finally {
        console.log("END: Executing setup function inside useEffect");
      }
    };

    setup();

    // React to auth changes — purge state on sign-out, refetch on sign-in
    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      console.log(`BEGIN: auth state changed to ${event}`);
      try {
        if (event === "SIGNED_OUT") {
          purgeLegacyWalletCache();
          setBalance(ZERO_FLOOR);
          if (channel) supabase.removeChannel(channel);
        } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          fetchBalance();
        }
      } catch (error) {
        console.error("BEGIN ERROR: auth state change handler failed.");
        console.error("ERROR DETAILS:", error instanceof Error ? error.message : String(error));
        console.error("END ERROR: auth state change handler terminated.");
      } finally {
        console.log("END: auth state change handler completed");
      }
    });

    return () => {
      console.log("BEGIN: Executing useEffect cleanup");
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      authSub.subscription.unsubscribe();
      console.log("END: Executing useEffect cleanup");
    };
  }, [fetchBalance, applyRow]);

  return { balance, loading, refreshBalance: fetchBalance };
};
