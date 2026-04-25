import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShieldCheck, Loader2, Lock, Terminal, Zap, ArrowLeft, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";

// --- SOVEREIGN INFRASTRUCTURE POLYFILLS ---
// Cryptographic engines require backend Node.js variables to evaluate in a browser environment.
import { Buffer } from "buffer";

if (typeof window !== "undefined") {
  console.log("[START] Hydrating Global Cryptographic Polyfills...");
  // Bypassing TypeScript strict window definitions to inject the bare minimum runtime variables
  (window as any).global = (window as any).global || window;
  (window as any).Buffer = (window as any).Buffer || Buffer;
  (window as any).process = (window as any).process || { env: {} };
  console.log("[END] Polyfills Hydrated Successfully.");
}
// ------------------------------------------

export default function SecureVault() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [sdkConstructor, setSdkConstructor] = useState<any>(null);
  const [status, setStatus] = useState("Hydrating Cryptographic Polyfills...");
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    console.log("[START] SecureVault: Initiating Dynamic Native Import...");

    const loadNativeEnclave = async () => {
      try {
        console.log("[INFO] Requesting @circle-fin/w3s-pw-web-sdk from Vite Bundler...");

        const CircleModule = await import("@circle-fin/w3s-pw-web-sdk");
        console.log("[SUCCESS] Module loaded. Extracting Constructor...");

        if (CircleModule && CircleModule.W3SSdk) {
          setSdkConstructor(() => CircleModule.W3SSdk);
          setStatus("AIRLOCK SEALED. NATIVE RAIL ACTIVE.");
          console.log("[END] Native SDK successfully bound to state.");
        } else {
          throw new Error("Module loaded, but W3SSdk constructor is missing.");
        }
      } catch (err: any) {
        console.error(`[FATAL] Native Module Evaluation Failed:`, err);
        setError(`MODULE CRASH: ${err.message}`);
        setStatus("INFRASTRUCTURE SEVERED.");
      }
    };

    loadNativeEnclave();
  }, []);

  const executeChallenge = () => {
    console.log("[START] Physical Confirmation: Engaging PIN Enclave");
    if (!sdkConstructor) return;

    setIsExecuting(true);
    setStatus("ENGAGING SECURE PERIMETER...");
    setError(null);

    const userToken = searchParams.get("userToken");
    const encryptionKey = searchParams.get("encryptionKey");
    const challengeId = searchParams.get("challengeId");

    if (!userToken || !encryptionKey) {
      console.error("[CRITICAL] Missing URL credentials.");
      setError("UNAUTHORIZED: TOKENS MISSING.");
      setIsExecuting(false);
      return;
    }

    if (!challengeId || challengeId === "null") {
      console.log("[INFO] No pending challenge. Vault is already active.");
      setStatus("VAULT ACTIVE. REDIRECTING...");
      setTimeout(() => navigate("/"), 1500);
      return;
    }

    try {
      console.log(`[INFO] Instantiating Circle Web SDK...`);
      const sdkInstance = new sdkConstructor({
        appSettings: { appId: "f8df0c7a-0d24-5103-9acd-82a88e5f18e8" },
      });

      console.log(`[INFO] Applying Cryptographic Payloads...`);
      sdkInstance.setAuthentication({ userToken, encryptionKey });

      console.log(`[INFO] SDK Execution Triggered for Challenge: ${challengeId}`);
      sdkInstance.execute(challengeId, async (err: any) => {
        console.log("[START] Circle UI Callback Response");

        if (err) {
          console.error(`[ERROR] Secure Handshake Aborted: ${err.message}`);
          setError(`HANDSHAKE ABORTED: ${err.message}`);
          setIsExecuting(false);
          setStatus("AIRLOCK SEALED. READY.");
          return;
        }

        console.log("[SUCCESS] PIN Authenticated. Initializing database sync.");
        setStatus("HANDSHAKE CONFIRMED. SYNCING IDENTITY...");

        try {
          const { data: userAuth } = await (supabase.auth as any).getUser();
          if (userAuth?.user) {
            console.log(`[INFO] Syncing Circle ID for user: ${userAuth.user.id}`);
            await (supabase.from("profiles") as any)
              .update({ circle_user_id: userAuth.user.id })
              .eq("user_id", userAuth.user.id);
            console.log("[SUCCESS] Profile database sync complete.");
          }
        } catch (dbError) {
          console.error("[ERROR] Database synchronization interrupted.");
        }

        console.log("[END] Operation Success. Redirecting to Root.");
        navigate("/");
      });
    } catch (e: any) {
      console.error(`[FATAL] Execution Failure: ${e.message}`);
      setError(`EXECUTION FAILED: ${e.message}`);
      setIsExecuting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors duration-500">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center p-6 mt-16 relative">
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-teal-600 blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-emerald-600 blur-[80px]" />
        </div>

        <div className="max-w-md w-full space-y-8 bg-card border border-border rounded-[2.5rem] shadow-2xl p-10 relative z-10">
          <div className="text-center">
            <div className="inline-flex items-center justify-center p-5 bg-primary/10 rounded-3xl mb-6 group transition-all duration-300">
              <ShieldCheck className="w-12 h-12 text-primary group-hover:scale-110" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic leading-none mb-2">
              Sovereign <span className="text-primary">Vault</span>
            </h1>
            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.3em]">
              Native Cryptographic Infrastructure
            </p>
          </div>

          <div className="bg-muted/30 border border-border rounded-2xl p-5 font-mono">
            <div className="flex items-center gap-3">
              {!sdkConstructor && !error ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              ) : (
                <Terminal className="w-4 h-4 text-primary" />
              )}
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground truncate">{status}</p>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/50 rounded-2xl flex items-start gap-3 animate-in fade-in zoom-in">
              <ShieldAlert className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[10px] font-black text-destructive uppercase tracking-tighter">
                  Infrastructure Breach
                </p>
                <p className="text-[11px] text-destructive/90 font-medium leading-tight">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-4 pt-4">
            <Button
              onClick={executeChallenge}
              disabled={!sdkConstructor || isExecuting}
              className="w-full py-8 text-lg font-black uppercase tracking-[0.15em] rounded-2xl shadow-xl transition-all"
            >
              {isExecuting ? (
                <span className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  AUTHENTICATING...
                </span>
              ) : (
                <span className="flex items-center gap-3">
                  <Zap className="w-5 h-5 fill-current" />
                  INITIALIZE VAULT
                </span>
              )}
            </Button>

            <button
              onClick={() => navigate("/")}
              disabled={isExecuting}
              className="w-full flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              Return to Dashboard
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
