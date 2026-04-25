import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShieldCheck, Loader2, Lock, Terminal, Zap, ArrowLeft, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";

export default function SecureVault() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [sdkConstructor, setSdkConstructor] = useState<any>(null);
  const [status, setStatus] = useState("Isolating Native Core...");
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    console.log("[START] SecureVault: Initiating Dynamic Native Import Sequence");

    const loadNativeEnclave = async () => {
      console.log("[START] loadNativeEnclave execution");
      try {
        if (typeof window !== "undefined") {
          console.log("[START] Hydrating stealth polyfills");

          console.log("[START] Polyfill window.global");
          window["global"] = window["global"] || window;
          console.log("[END] Polyfill window.global");

          console.log("[START] Polyfill window.process");
          // FIX applied here: Casting to any to satisfy strict DOM/Node interfaces
          window["process"] = window["process"] || ({ env: {} } as any);
          console.log("[END] Polyfill window.process");

          console.log("[START] Import buffer module");
          try {
            const bufferMod = await import("buffer");
            console.log("[START] Assign Buffer to window");
            window["Buffer"] = window["Buffer"] || bufferMod.Buffer;
            console.log("[END] Assign Buffer to window");
          } catch (bErr) {
            console.error("[START] Buffer module error handler");
            console.warn("[WARN] Buffer module fetch failed, cryptographic engine may stall.", bErr);
            console.error("[END] Buffer module error handler");
          }
          console.log("[END] Import buffer module");

          console.log("[END] Hydrating stealth polyfills");
        }

        console.log("[START] Requesting @circle-fin/w3s-pw-web-sdk from Vite Bundler");
        const CircleModule = await import("@circle-fin/w3s-pw-web-sdk");
        console.log("[END] Requesting @circle-fin/w3s-pw-web-sdk from Vite Bundler");

        console.log("[START] Validating CircleModule Constructor");
        if (CircleModule && CircleModule.W3SSdk) {
          console.log("[START] Binding W3SSdk to state");
          setSdkConstructor(() => CircleModule.W3SSdk);
          setStatus("AIRLOCK SEALED. NATIVE RAIL ACTIVE.");
          console.log("[END] Binding W3SSdk to state");
        } else {
          throw new Error("Module loaded, but W3SSdk constructor is missing in the payload.");
        }
        console.log("[END] Validating CircleModule Constructor");
      } catch (err: any) {
        console.error("[START] Native Module Evaluation Error Handler");
        console.error(`[FATAL] Native Module Evaluation Failed:`, err);
        setError(`MODULE CRASH: ${err.message}`);
        setStatus("INFRASTRUCTURE SEVERED.");
        console.error("[END] Native Module Evaluation Error Handler");
      }
      console.log("[END] loadNativeEnclave execution");
    };

    loadNativeEnclave();
    console.log("[END] SecureVault: Initiating Dynamic Native Import Sequence");
  }, []);

  const executeChallenge = () => {
    console.log("[START] executeChallenge: Engaging PIN Enclave");

    if (!sdkConstructor) {
      console.warn("[WARN] executeChallenge aborted: sdkConstructor is null");
      return;
    }

    setIsExecuting(true);
    setStatus("ENGAGING SECURE PERIMETER...");
    setError(null);

    console.log("[START] Extracting URL Credentials");
    const userToken = searchParams.get("userToken");
    const encryptionKey = searchParams.get("encryptionKey");
    const challengeId = searchParams.get("challengeId");
    console.log("[END] Extracting URL Credentials");

    if (!userToken || !encryptionKey) {
      console.error("[START] Missing URL credentials error handler");
      console.error("[CRITICAL] Missing userToken or encryptionKey.");
      setError("UNAUTHORIZED: TOKENS MISSING.");
      setIsExecuting(false);
      console.error("[END] Missing URL credentials error handler");
      return;
    }

    if (!challengeId || challengeId === "null") {
      console.log("[START] Challenge bypass redirect");
      setStatus("VAULT ACTIVE. REDIRECTING...");
      setTimeout(() => {
        console.log("[START] Executing navigate to root");
        navigate("/");
        console.log("[END] Executing navigate to root");
      }, 1500);
      console.log("[END] Challenge bypass redirect");
      return;
    }

    try {
      console.log("[START] Instantiating Circle Web SDK");
      const sdkInstance = new sdkConstructor({
        appSettings: { appId: "f8df0c7a-0d24-5103-9acd-82a88e5f18e8" },
      });
      console.log("[END] Instantiating Circle Web SDK");

      console.log("[START] Applying Cryptographic Payloads");
      sdkInstance.setAuthentication({ userToken, encryptionKey });
      console.log("[END] Applying Cryptographic Payloads");

      console.log(`[START] SDK Execution Triggered for Challenge: ${challengeId}`);
      sdkInstance.execute(challengeId, async (err: any) => {
        console.log("[START] SDK Execute Callback Handler");

        if (err) {
          console.error("[START] SDK Execute Error Handler");
          console.error(`[ERROR] Secure Handshake Aborted: ${err.message}`);
          setError(`HANDSHAKE ABORTED: ${err.message}`);
          setIsExecuting(false);
          setStatus("AIRLOCK SEALED. READY.");
          console.error("[END] SDK Execute Error Handler");
          return;
        }

        console.log("[SUCCESS] PIN Authenticated. Initializing database sync.");
        setStatus("HANDSHAKE CONFIRMED. SYNCING IDENTITY...");

        console.log("[START] Supabase Identity Sync");
        try {
          console.log("[START] Fetching Supabase User");
          const { data: userAuth } = await (supabase.auth as any).getUser();
          console.log("[END] Fetching Supabase User");

          if (userAuth?.user) {
            console.log(`[START] Updating profiles table for user_id: ${userAuth.user.id}`);
            await (supabase.from("profiles") as any)
              .update({ circle_user_id: userAuth.user.id })
              .eq("user_id", userAuth.user.id);
            console.log("[END] Updating profiles table");
          }
        } catch (dbError) {
          console.error("[START] Supabase Database Error Handler");
          console.error("[ERROR] Database synchronization interrupted.", dbError);
          console.error("[END] Supabase Database Error Handler");
        }
        console.log("[END] Supabase Identity Sync");

        console.log("[START] Final Redirect Operation");
        navigate("/");
        console.log("[END] Final Redirect Operation");

        console.log("[END] SDK Execute Callback Handler");
      });
      console.log(`[END] SDK Execution Triggered for Challenge: ${challengeId}`);
    } catch (e: any) {
      console.error("[START] Main Execution Block Error Handler");
      console.error(`[FATAL] Execution Failure: ${e.message}`);
      setError(`EXECUTION FAILED: ${e.message}`);
      setIsExecuting(false);
      console.error("[END] Main Execution Block Error Handler");
    }

    console.log("[END] executeChallenge: Engaging PIN Enclave");
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

          <div className="pt-8 border-t border-border/50 text-center opacity-40">
            <div className="flex items-center justify-center gap-2">
              <Lock className="w-3 h-3 text-primary" />
              <span className="text-[9px] font-black uppercase tracking-[0.4em]">IDIA Data Native Infrastructure</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
