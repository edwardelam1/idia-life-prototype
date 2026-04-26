/** * [START] SecureVault: Sovereign Infrastructure Page
 * Logic: Self-Custodial Vault Verification, Database Sync & Hub Entry
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { useToast } from "@/components/ui/use-toast";
import { Activity, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSovereignWallet } from "@/hooks/useSovereignWallet";

const SecureVault = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [userId, setUserId] = useState<string | undefined>();
  const { isConnected, address } = useAccount();
  const { syncWalletToSupabase } = useSovereignWallet(userId);
  const { toast } = useToast();
  const navigate = useNavigate();

  // 1. Retrieve the active Supabase session ID on mount
  useEffect(() => {
    const fetchSession = async () => {
      console.log("[START] fetchSession: Retrieving Auth User");
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          console.log(`[SUCCESS] fetchSession: User identified as ${user.id}`);
        } else {
          console.warn("[WARN] fetchSession: No active session found.");
        }
      } catch (error) {
        console.error("[ERROR] fetchSession: Failed to retrieve user", error);
      }
      console.log("[END] fetchSession: Sequence complete");
    };
    fetchSession();
  }, []);

  // 2. Verification and Commitment Sequence
  useEffect(() => {
    const verifySovereignInfrastructure = async () => {
      console.log(`\n========== [START] verifySovereignInfrastructure: Executing Sequence ==========`);
      try {
        console.log(`[INFO] Probing for Active Vault Connection...`);

        // Delay to ensure Wagmi state hydration
        await new Promise((resolve) => setTimeout(resolve, 800));

        if (!isConnected) {
          console.warn(`[WARN] No Active Vault Detected. Awaiting connection...`);
          setIsInitializing(false);
          return;
        }

        console.log(`[SUCCESS] Self-Custodial Vault Detected: ${address}`);

        // If we have both the wallet and the Supabase user, commit the sync
        if (address && userId) {
          console.log(`[ACTION] Initiating Sovereign Sync for User: ${userId}`);

          // Surgical Fix: Commit the address to the profile to unlock the Hub
          const success = await syncWalletToSupabase(address);

          if (success) {
            console.log(`[SUCCESS] IDIA Infrastructure Handshake: Complete.`);

            toast({
              title: "Identity Secured",
              description: "Sovereign vault bridged successfully.",
            });

            // Redirect to the root dashboard now that the account is "locked in"
            console.log("[ACTION] Navigating to Hub Dashboard...");
            navigate("/");
          }
        } else if (!userId) {
          console.warn("[STALL] verifySovereignInfrastructure: Waiting for Auth userId...");
        }

        setIsInitializing(false);
      } catch (error: any) {
        console.error(`\n[FATAL ERROR] verifySovereignInfrastructure: Sequence Failure`);
        console.error(`[FATAL ERROR] Stack/Message: ${error.stack || error.message}`);
        toast({
          variant: "destructive",
          title: "Vault Infrastructure Failure",
          description: "Could not verify the self-custodial infrastructure.",
        });
      } finally {
        console.log(`========== [END] verifySovereignInfrastructure: Executing Sequence ==========\n`);
      }
    };

    // Only run the verification sequence once we have the userId or if connection changes
    if (userId || !isConnected) {
      verifySovereignInfrastructure();
    }
  }, [isConnected, address, userId, syncWalletToSupabase, navigate, toast]);

  if (isInitializing) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-black gap-4">
        <Activity className="w-8 h-8 text-teal-500 animate-spin" />
        <div className="text-teal-500/80 animate-pulse text-xs tracking-[0.3em] font-bold uppercase">
          Verifying Sovereign Bridge...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <header className="border-b border-white/10 pb-4 mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sovereign Wallet</h1>
          <div className="flex items-center gap-2 mt-1">
            <ShieldCheck className="w-3 h-3 text-teal-500" />
            <p className="text-[10px] text-white/40 uppercase tracking-widest">
              Infrastructure: Verified (Self-Custody)
            </p>
          </div>
        </div>

        {isConnected && (
          <div className="text-right">
            <p className="text-[10px] text-white/20 uppercase font-bold mb-1">Active Vault Address</p>
            <code className="text-xs text-teal-500/70 bg-teal-500/5 px-2 py-1 rounded border border-teal-500/10">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </code>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2 aspect-video border border-white/5 bg-white/[0.02] rounded-xl flex items-center justify-center italic text-white/20">
          Vault Infrastructure Online - Awaiting Data Streams
        </div>
      </div>
    </div>
  );
};

export default SecureVault;
