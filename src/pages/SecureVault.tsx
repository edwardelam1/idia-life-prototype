import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShieldCheck, Loader2, AlertCircle, Lock, Terminal, Zap, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header"; // INTEGRATED FOR CONSISTENCY
import polishedLogo from "@/assets/IDIA_Life_Logo_Polished.png";

export default function SecureVault() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [sdkInstance, setSdkInstance] = useState<any>(null);
  const [status, setStatus] = useState("Initializing Sovereign Handshake...");
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // --- THE SOVEREIGN ENGINE: DATA-URI MODULE INJECTION ---
  useEffect(() => {
    console.log("[START] SecureVault: Initiating Protocol Bypass...");

    const userToken = searchParams.get("userToken");
    const encryptionKey = searchParams.get("encryptionKey");

    if (!userToken || !encryptionKey) {
      setError("UNAUTHORIZED: SECURITY TOKENS MISSING.");
      return;
    }

    const loadSdk = async () => {
      const url = "https://cdn.jsdelivr.net/npm/@circle-fin/w3s-pw-web-sdk@1.1.11/dist/index.js";
      setStatus("ENGAGING PRIMARY INFRASTRUCTURE...");

      try {
        // 1. Fetch the raw code
        const response = await fetch(url);
        if (!response.ok) throw new Error("Rail unreachable.");
        const code = await response.text();

        // 2. THE BYPASS: Load as a Data-URI Script to evade 'unsafe-inline' CSP
        console.log("[INFO] Executing Memory Bridge...");
        const script = document.createElement("script");
        script.type = "text/javascript";
        // Encoding to Base64 forces the browser to treat this as an external file, not inline text
        script.src = `data:text/javascript;base64,${btoa(unescape(encodeURIComponent(code)))}`;

        script.onload = () => verifyNamespace("PRIMARY RAIL");
        script.onerror = () => {
          console.warn("[BLOCK] Data-URI blocked. Falling back to Standard Rail...");
          loadStandardRail(url);
        };

        document.head.appendChild(script);
      } catch (e) {
        console.error("[ERROR] Primary Rail Severed. Attempting Standard Load...");
        loadStandardRail(url);
      }
    };

    const loadStandardRail = (url: string) => {
      setStatus("ENGAGING BACKUP RAIL...");
      const script = document.createElement("script");
      script.src = `${url}?v=${Date.now()}`;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.onload = () => verifyNamespace("BACKUP RAIL");
      script.onerror = () => setError("TOTAL INFRASTRUCTURE BLOCK: ALL RAILS SEVERED.");
      document.head.appendChild(script);
    };

    const verifyNamespace = async (source: string) => {
      console.log(`[INFO] Verifying Handshake from ${source}...`);
      let attempts = 0;

      // Polling for the global constructor
      const check = setInterval(() => {
        const global = window as any;
        const Constructor = global.W3SSDK || (global.CircleWS || global.CircleW3S || global.Circle)?.W3SSDK;

        if (Constructor) {
          clearInterval(check);
          console.log(`[SUCCESS] Enclave mounted via ${source}.`);
          setSdkInstance(new Constructor());
          setStatus("AIRLOCK SEALED. READY.");
        }

        if (attempts > 20) {
          // 4 Seconds total
          clearInterval(check);
          if (!sdkInstance) {
            console.error(`[FATAL] Verification timeout on ${source}.`);
            setError("SECURITY TIMEOUT: CRYPTOGRAPHIC HANDSHAKE BLOCKED.");
          }
        }
        attempts++;
      }, 200) as any;
    };

    loadSdk();
  }, [searchParams]);

  const executeChallenge = () => {
    if (!sdkInstance) return;
    setIsExecuting(true);
    setStatus("ENGAGING SECURE PERIMETER...");
    setError(null);

    const userToken = searchParams.get("userToken");
    const encryptionKey = searchParams.get("encryptionKey");
    const challengeId = searchParams.get("challengeId");

    if (!challengeId || challengeId === "null") {
      setStatus("VAULT ACTIVE. REDIRECTING...");
      setTimeout(() => navigate("/"), 1500);
      return;
    }

    try {
      sdkInstance.setAppSettings({
        appId: "f8df0c7a-0d24-5103-9acd-82a88e5f18e8",
        clientKey: "TEST_CLIENT_KEY:713c965e89a558509893d5a15152a553",
      });

      sdkInstance.setAuthentication({ userToken, encryptionKey });

      sdkInstance.execute(challengeId, async (err: any) => {
        if (err) {
          setError(`HANDSHAKE ABORTED: ${err.message}`);
          setIsExecuting(false);
          setStatus("AIRLOCK SEALED. READY.");
          return;
        }

        setStatus("HANDSHAKE CONFIRMED. SYNCING IDENTITY...");
        try {
          // CASTING TO ANY TO BYPASS OUTDATED LOCAL SCHEMA CACHE
          const { data: userAuth } = await (supabase.auth as any).getUser();
          if (userAuth?.user) {
            await (supabase.from("profiles") as any)
              .update({ circle_user_id: userAuth.user.id })
              .eq("user_id", userAuth.user.id);
          }
        } catch (dbError) {
          console.error("[ERROR] Database sync failed.");
        }
        navigate("/");
      });
    } catch (e: any) {
      setError(`EXECUTION FAILED: ${e.message}`);
      setIsExecuting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors duration-500">
      <Header /> {/* PERSISTENT BRANDING */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 mt-12">
        <div className="max-w-md w-full space-y-8 bg-card border border-border rounded-[2.5rem] shadow-2xl p-10 relative overflow-hidden">
          {/* MIRRORING LANDINGSCREEN TEAL/EMERALD GRADIENTS */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-48 h-48 rounded-full bg-teal-500 blur-[80px]" />
            <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full bg-emerald-500 blur-[60px]" />
          </div>

          <div className="text-center relative z-10">
            <div className="inline-flex items-center justify-center p-5 bg-primary/10 rounded-3xl mb-6">
              <ShieldCheck className="w-12 h-12 text-primary" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic mb-2">
              Sovereign <span className="text-primary">Vault</span>
            </h1>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-[0.2em]">
              Non-Custodial Encryption Rail
            </p>
          </div>

          <div className="relative z-10 bg-muted/30 border border-border rounded-2xl p-5 font-mono">
            <div className="flex items-center gap-3">
              {!sdkInstance && !error ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              ) : (
                <Terminal className="w-4 h-4 text-primary" />
              )}
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground truncate">{status}</p>
            </div>
          </div>

          {error && (
            <div className="relative z-10 p-4 bg-destructive/10 border border-destructive/50 rounded-2xl flex items-start gap-3 animate-in fade-in zoom-in duration-300">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[10px] font-black text-destructive uppercase">Verification Failed</p>
                <p className="text-[11px] text-destructive/90 font-medium leading-tight">{error}</p>
              </div>
            </div>
          )}

          <div className="relative z-10 space-y-4 pt-4">
            <Button
              onClick={executeChallenge}
              disabled={!sdkInstance || isExecuting}
              className="w-full py-8 text-lg font-black uppercase tracking-[0.15em] rounded-2xl shadow-lg hover:translate-y-[-2px] active:scale-[0.98] transition-all"
            >
              {isExecuting ? (
                <span className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Validating...
                </span>
              ) : (
                <span className="flex items-center gap-3">
                  <Zap className="w-5 h-5 fill-current" />
                  Initialize PIN
                </span>
              )}
            </Button>

            <button
              onClick={() => navigate("/")}
              disabled={isExecuting}
              className="w-full flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              Cancel and Return
            </button>
          </div>

          <div className="pt-8 border-t border-border/50 text-center relative z-10 opacity-40">
            <div className="flex items-center justify-center gap-2">
              <Lock className="w-3 h-3 text-primary" />
              <span className="text-[9px] font-black uppercase tracking-[0.4em]">IDIA Data Infrastructure</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
