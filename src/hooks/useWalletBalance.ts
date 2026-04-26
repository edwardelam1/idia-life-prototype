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
  console.log("🧹 [CACHE_PURGE_LOG] START: Executing legacy wallet cache purge.");
  try {
    const keys = ["wallet_balance", "user_wallet", "user_wallets", "cash_balance", "idia_balance"];
    keys.forEach((k) => {
      window.localStorage.removeItem(k);
      window.sessionStorage.removeItem(k);
    });
    console.log("🧹 [CACHE_PURGE_LOG] END: Cache purge completed successfully.");
  } catch (error) {
    console.error("🚨 [CACHE_PURGE_LOG] ERROR_START: purgeLegacyWalletCache failed.");
    console.error("🚨 [CACHE_PURGE_LOG] ERROR_DETAILS:", error instanceof Error ? error.message : String(error));
    console.error("🚨 [CACHE_PURGE_LOG] ERROR_END: purgeLegacyWalletCache terminated.");
  }
};

export const useWalletBalance = () => {
  const [balance, setBalance] = useState<WalletBalance>(ZERO_FLOOR);
  const [loading, setLoading] = useState(true);

  const applyRow = useCallback((row: any | null, userId: string) => {
    console.log("⚙️ [DATA_APPLY_LOG] START: Executing applyRow for user:", userId);
    try {
      if (!row) {
        console.info(`⚙️ [DATA_APPLY_LOG] ACTION: No vault row for ${userId} — anchoring to Zero Floor`);
        setBalance(ZERO_FLOOR);
        return;
      }

      console.info(`⚙️ [DATA_APPLY_LOG] PAYLOAD:`, row);
      setBalance({
        cash_balance: Number(row.cash_balance) || 0,
        idia_beta_balance: Number(row.idia_beta_balance) || 0,
        idia_token_balance: Number(row.idia_token_balance) || 0,
        total_earned: 0,
      });
      console.log("⚙️ [DATA_APPLY_LOG] END: Successfully applied new wallet balances.");
    } catch (error) {
      console.error("🚨 [DATA_APPLY_LOG] ERROR_START: applyRow execution failed.");
      console.error("🚨 [DATA_APPLY_LOG] ERROR_DETAILS:", error instanceof Error ? error.message : String(error));
      console.error("🚨 [DATA_APPLY_LOG] ERROR_END: applyRow terminated.");
    }
  }, []);

  const fetchBalance = useCallback(async () => {
    console.log("🌐 [FETCH_BALANCE_LOG] START: Initializing fetchBalance routine.");
    purgeLegacyWalletCache();

    try {
      console.log("🌐 [FETCH_BALANCE_LOG] ACTION: Awaiting Supabase Auth User.");
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error("🚨 [FETCH_BALANCE_LOG] ERROR_START: Supabase auth fetch failed.");
        console.error("🚨 [FETCH_BALANCE_LOG] ERROR_DETAILS:", authError.message);
        console.error("🚨 [FETCH_BALANCE_LOG] ERROR_END: Auth check terminated.");
        throw authError;
      }

      if (!user) {
        console.log("🌐 [FETCH_BALANCE_LOG] END: No active user session. Anchoring to Zero Floor.");
        setBalance(ZERO_FLOOR);
        setLoading(false);
        return;
      }

      console.log(`🌐 [FETCH_BALANCE_LOG] ACTION: Ingesting LKS (Ledger State) for User: ${user.id}`);
      const { data, error } = await supabase
        .from("wallets")
        .select("cash_balance, idia_beta_balance, idia_token_balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("🚨 [FETCH_BALANCE_LOG] ERROR_START: Supabase 'wallets' query failed.");
        console.error(
          "🚨 [FETCH_BALANCE_LOG] ERROR_DETAILS: Unreachable state. Check Database connection.",
          error.message,
        );
        console.error("🚨 [FETCH_BALANCE_LOG] ERROR_END: Supabase query terminated.");
        setBalance(ZERO_FLOOR);
      } else {
        applyRow(data, user.id);
        console.log("🌐 [FETCH_BALANCE_LOG] END: Wallet fetch routine completed successfully.");
      }
    } catch (err) {
      console.error("🚨 [FETCH_BALANCE_LOG] ERROR_START: Fatal exception during fetchBalance.");
      console.error("🚨 [FETCH_BALANCE_LOG] ERROR_DETAILS:", err instanceof Error ? err.message : String(err));
      console.error("🚨 [FETCH_BALANCE_LOG] ERROR_END: fetchBalance execution terminated.");
      setBalance(ZERO_FLOOR);
    } finally {
      setLoading(false);
    }
  }, [applyRow]);

  useEffect(() => {
    console.log("🔄 [REALTIME_SYNC_LOG] START: Initializing useWalletBalance effect hook.");
    let channel: any;
    let cancelled = false;

    const setup = async () => {
      console.log("🔄 [REALTIME_SYNC_LOG] ACTION: Beginning channel setup.");
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || cancelled) {
          console.log("🔄 [REALTIME_SYNC_LOG] ABORT: User missing or hook cancelled. Bypassing setup.");
          setLoading(false);
          return;
        }

        await fetchBalance();

        console.log(`🔄 [REALTIME_SYNC_LOG] ACTION: Subscribing to postgres_changes for user: ${user.id}`);
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
              console.log("📡 [REALTIME_SYNC_LOG] DATA_RECEIVED: Realtime Delta Detected:", payload);
              if (payload.eventType === "DELETE") {
                console.log("📡 [REALTIME_SYNC_LOG] ACTION: Delete event received. Anchoring to Zero Floor.");
                setBalance(ZERO_FLOOR);
                return;
              }
              applyRow(payload.new, user.id);
            },
          )
          .subscribe((status, err) => {
            console.log(`📡 [REALTIME_SYNC_LOG] STATUS_UPDATE: Channel state is now: ${status}`);
            if (err) {
              console.error("🚨 [REALTIME_SYNC_LOG] ERROR_START: Supabase channel subscription failed.");
              console.error("🚨 [REALTIME_SYNC_LOG] ERROR_DETAILS:", err);
              console.error("🚨 [REALTIME_SYNC_LOG] ERROR_END: Subscription error logged.");
            }
          });

        console.log("🔄 [REALTIME_SYNC_LOG] END: Channel setup completed.");
      } catch (error) {
        console.error("🚨 [REALTIME_SYNC_LOG] ERROR_START: Setup routine exception.");
        console.error("🚨 [REALTIME_SYNC_LOG] ERROR_DETAILS:", error instanceof Error ? error.message : String(error));
        console.error("🚨 [REALTIME_SYNC_LOG] ERROR_END: Setup routine terminated.");
      }
    };

    setup();

    // React to auth changes — purge state on sign-out, refetch on sign-in
    console.log("🔐 [AUTH_STATE_LOG] START: Attaching AuthState listener.");
    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      console.log(`🔐 [AUTH_STATE_LOG] EVENT_DETECTED: Auth state shifted to [${event}]`);
      try {
        if (event === "SIGNED_OUT") {
          console.log("🔐 [AUTH_STATE_LOG] ACTION: Purging context and channels due to sign out.");
          purgeLegacyWalletCache();
          setBalance(ZERO_FLOOR);
          if (channel) supabase.removeChannel(channel);
        } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          console.log("🔐 [AUTH_STATE_LOG] ACTION: Firing fetchBalance due to valid session.");
          fetchBalance();
        }
        console.log("🔐 [AUTH_STATE_LOG] END: Auth event handled successfully.");
      } catch (error) {
        console.error("🚨 [AUTH_STATE_LOG] ERROR_START: Auth state change handler failed.");
        console.error("🚨 [AUTH_STATE_LOG] ERROR_DETAILS:", error instanceof Error ? error.message : String(error));
        console.error("🚨 [AUTH_STATE_LOG] ERROR_END: Auth state change handler terminated.");
      }
    });

    return () => {
      console.log("🧹 [HOOK_CLEANUP_LOG] START: Unmounting useWalletBalance.");
      cancelled = true;
      if (channel) {
        console.log("🧹 [HOOK_CLEANUP_LOG] ACTION: Removing Supabase realtime channel.");
        supabase.removeChannel(channel);
      }
      authSub.subscription.unsubscribe();
      console.log("🧹 [HOOK_CLEANUP_LOG] END: Unmount operations completed.");
    };
  }, [fetchBalance, applyRow]);

  return { balance, loading, refreshBalance: fetchBalance };
};
