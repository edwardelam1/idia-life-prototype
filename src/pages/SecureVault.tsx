/** * [START] SecureVault: Sovereign Infrastructure Terminal
 * Logic: Mandatory Verified RPC Handshake & Hub Entry Gate
 */
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { useToast } from "@/components/ui/use-toast";
import { Activity, ShieldCheck, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSovereignWallet } from "@/hooks/useSovereignWallet";

const SecureVault = () => {
  const [userId, setUserId] = useState<string | undefined>();
  const [handshakeStatus, setHandshakeStatus] = useState<"probing" | "committing" | "verified" | "failed">("probing");
  const { isConnected, address } = useAccount();
  const { syncWalletToSupabase } = useSovereignWallet(userId);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Guard to prevent redundant handshake triggers
  const handshakeInProgress = useRef(false);

  // 1. Session Retrieval
  useEffect(() => {
    const fetchSession = async () => {
      console.log("[START] IDIA_AUTH_PROBE: Probing Session...");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        console.log(`[SUCCESS] IDIA_AUTH_PROBE: User ID ${user.id} Active.`);
      }
    };
    fetchSession();
  }, []);

  // 2. Mandatory Deterministic Handshake Sequence
  useEffect(() => {
    const executeHandshakeSequence = async () => {
      // Requirements Gate
      if (handshakeInProgress.current || !userId || !isConnected || !address) return;

      try {
        handshakeInProgress.current = true;
        setHandshakeStatus("committing");
        console.log(`\n========== [START] Handshake Protocol: ${address} ==========`);

        // Mandatory Handshake: Logic Awaits Verification
        const isVerified = await syncWalletToSupabase(address);

        if (isVerified) {
          setHandshakeStatus("verified");
          console.log("[SUCCESS] Handshake Authenticated. Releasing to Hub.");

          // Terminal Step: Immediate Redirection
          navigate("/");
        } else {
          setHandshakeStatus("failed");
          handshakeInProgress.current = false;
        }
      } catch (error: any) {
        console.error(`🚨 [FATAL] verifySovereignInfrastructure: Failure`, error.message);
        setHandshakeStatus("failed");
        handshakeInProgress.current = false;
      } finally {
        console.log(`========== [END] Handshake Protocol ==========\n`);
      }
    };

    executeHandshakeSequence();
  }, [isConnected, address, userId, syncWalletToSupabase, navigate]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-black gap-8 p-6 text-center">
      <div className="relative">
        <Activity
          className={`w-16 h-16 ${handshakeStatus === "failed" ? "text-red-500" : "text-teal-500"} animate-spin`}
        />
        <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-teal-200" />
      </div>

      <div className="space-y-3">
        <h1 className="text-teal-500 font-bold uppercase tracking-[0.4em] text-sm">Sovereign Vault Terminal</h1>
        <div className="text-white/40 text-[10px] uppercase tracking-widest font-mono">
          {handshakeStatus === "probing" && "Initializing Sovereign Bridge..."}
          {handshakeStatus === "committing" && "Executing Deterministic Handshake..."}
          {handshakeStatus === "verified" && "Commitment Verified. Finalizing Sync..."}
          {handshakeStatus === "failed" && "Handshake Failed. Network Latency Detected."}
        </div>
      </div>

      {isConnected && (
        <code className="text-[10px] text-teal-500/50 bg-teal-500/5 px-4 py-2 rounded border border-teal-500/10 font-mono">
          Handshaking: {address.slice(0, 10)}...{address.slice(-10)}
        </code>
      )}

      {handshakeStatus === "failed" && (
        <button
          onClick={() => window.location.reload()}
          className="mt-4 flex items-center gap-2 text-red-500 border border-red-500/20 px-6 py-3 rounded text-[10px] uppercase font-bold hover:bg-red-500/5 transition-colors"
        >
          <AlertTriangle className="w-4 h-4" /> Force Retry Infrastructure
        </button>
      )}
    </div>
  );
};

export default SecureVault;
