import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShieldCheck, Loader2, AlertCircle, Lock, Terminal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function SecureVault() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [sdkInstance, setSdkInstance] = useState<any>(null);
  const [status, setStatus] = useState("Synchronizing core infrastructure...");
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // --- CORE INFRASTRUCTURE HYDRATION ---
  useEffect(() => {
    console.log("[START] SecureVault: Initializing Airlock Environment...");

    const userToken = searchParams.get("userToken");
    const encryptionKey = searchParams.get("encryptionKey");

    if (!userToken || !encryptionKey) {
      console.error("[ERROR] SecureVault: Missing cryptographic URL parameters.");
      setError("Unauthorized Protocol: Missing security tokens in URL.");
      return;
    }

    console.log("[INFO] SecureVault: Security tokens confirmed. Injecting Circle Web SDK...");

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@circle-fin/w3s-pw-web-sdk@1.1.11/dist/index.js";
    script.async = true;
    script.crossOrigin = "anonymous";

    script.onload = () => {
      console.log("[INFO] SecureVault: SDK script loaded. Hunting for W3SSDK namespace...");
      const global = window as any;
      const Constructor = (global.CircleWS || global.CircleW3S || global.Circle)?.W3SSDK || global.W3SSDK;

      if (Constructor) {
        try {
          const instance = new Constructor();
          setSdkInstance(instance);
          setStatus("Airlock sealed. Ready for physical confirmation.");
          console.log("[SUCCESS] SecureVault: Enclave Constructor mounted into memory.");
        } catch (e: any) {
          console.error(`[FATAL] SecureVault: Constructor failed to instantiate - ${e.message}`);
          setError(`Cryptographic library failed to mount: ${e.message}`);
        }
      } else {
        console.error("[FATAL] SecureVault: W3SSDK Namespace not found on window object.");
        setError("Cryptographic library namespace is missing.");
      }
    };

    script.onerror = () => {
      console.error("[FATAL] SecureVault: Network level block on SDK injection.");
      setError("Network blocked the Circle infrastructure injection.");
    };

    document.head.appendChild(script);

    return () => {
      console.log("[END] SecureVault: Cleaning up script injection.");
    };
  }, [searchParams]);

  // --- CRYPTOGRAPHIC EXECUTION ---
  const executeChallenge = () => {
    if (!sdkInstance) {
      console.warn("[WARN] SecureVault: Execution attempted before SDK was loaded.");
      return;
    }

    console.log("[START] SecureVault: Engaging PIN Enclave...");
    setIsExecuting(true);
    setStatus("Engaging secure perimeter...");
    setError(null);

    const userToken = searchParams.get("userToken");
    const encryptionKey = searchParams.get("encryptionKey");
    const challengeId = searchParams.get("challengeId");

    if (!challengeId || challengeId === "null") {
      console.log("[INFO] SecureVault: No pending challenge. Wallet is already active.");
      setStatus("Wallet already initialized. Redirecting...");
      setTimeout(() => {
        console.log("[END] SecureVault: Redirecting to root.");
        navigate("/");
      }, 2000);
      return;
    }

    try {
      console.log("[INFO] SecureVault: Setting Application Identity (Testnet)...");
      sdkInstance.setAppSettings({
        appId: "f8df0c7a-0d24-5103-9acd-82a88e5f18e8",
        clientKey: "TEST_CLIENT_KEY:713c965e89a558509893d5a15152a553",
      });

      console.log("[INFO] SecureVault: Applying User Authentication payload...");
      sdkInstance.setAuthentication({ userToken, encryptionKey });

      console.log(`[INFO] SecureVault: Executing Challenge ID: ${challengeId}`);
      sdkInstance.execute(challengeId, async (err: any) => {
        console.log("[START] SecureVault: Circle UI Callback triggered...");

        if (err) {
          console.error(`[ERROR] SecureVault: Circle UI aborted or failed: ${err.message}`);
          setError(`Circle UI closed: ${err.message}`);
          setIsExecuting(false);
          setStatus("Airlock sealed. Ready for physical confirmation.");
          return;
        }

        console.log("[SUCCESS] SecureVault: PIN Confirmed by user.");
        setStatus("PIN Confirmed. Finalizing identity protocol...");

        try {
          console.log("[START] SecureVault: Synchronizing database profile...");
          const { data: userAuth, error: authError } = await supabase.auth.getUser();

          if (authError || !userAuth.user) {
            throw new Error(authError?.message || "Lost Supabase session during execution.");
          }

          const { error: syncError } = await supabase
            .from("profiles")
            .update({ circle_user_id: userAuth.user.id })
            .eq("user_id", userAuth.user.id);

          if (syncError) throw syncError;

          console.log("[SUCCESS] SecureVault: Profile synchronized with Circle ID.");
        } catch (dbError: any) {
          console.error(`[ERROR] SecureVault: Database sync failed - ${dbError.message}`);
        }

        console.log("[END] SecureVault: Operation complete. Returning to application.");
        navigate("/");
      });
    } catch (e: any) {
      console.error(`[FATAL] SecureVault: Execution block failed - ${e.message}`);
      setError(`Execution failed: ${e.message}`);
      setIsExecuting(false);
      setStatus("Airlock sealed. Ready for physical confirmation.");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col items-center justify-center p-4 selection:bg-yellow-500/30">
      <div className="max-w-md w-full space-y-8 text-center bg-[#0a0a0a] p-10 rounded-3xl border border-zinc-800/50 shadow-2xl relative overflow-hidden">
        {/* Aesthetic Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-blue-500/5 blur-[100px] pointer-events-none" />

        <div className="flex justify-center relative z-10">
          <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-full shadow-inner">
            <Lock className="w-10 h-10 text-zinc-300" />
          </div>
        </div>

        <div className="space-y-3 relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Sovereign Airlock</h1>
          <div className="flex items-center justify-center gap-2 text-zinc-400">
            <Terminal className="w-4 h-4" />
            <p className="text-sm font-mono tracking-tight">{status}</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-xl flex items-start gap-3 text-left relative z-10">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400 font-mono tracking-tight">{error}</p>
          </div>
        )}

        <button
          onClick={executeChallenge}
          disabled={!sdkInstance || isExecuting}
          className="relative z-10 w-full py-4 bg-zinc-100 text-zinc-900 font-bold rounded-xl hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex justify-center items-center gap-2 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
        >
          {isExecuting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Initializing Handshake...
            </>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5" />
              Authorize Secure PIN
            </>
          )}
        </button>

        <div className="pt-6 border-t border-zinc-800/50 relative z-10">
          <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold">
            IDIA Data Inc. Non-Custodial Infrastructure
          </p>
        </div>
      </div>
    </div>
  );
}
