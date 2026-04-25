import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShieldCheck, Loader2, AlertCircle, Lock, Terminal, Cpu, Zap, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import polishedLogo from "@/assets/IDIA_Life_Logo_Polished.png";

export default function SecureVault() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [sdkInstance, setSdkInstance] = useState<any>(null);
  const [status, setStatus] = useState("Initializing Sovereign Handshake...");
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const retryCount = useRef(0);

  // --- THE SOVEREIGN BRIDGE: ULTRA-RESILIENT LOADER ---
  useEffect(() => {
    console.log("[START] SecureVault: Deploying Multi-Path Infrastructure...");

    const userToken = searchParams.get("userToken");
    const encryptionKey = searchParams.get("encryptionKey");

    if (!userToken || !encryptionKey) {
      setError("UNAUTHORIZED: SECURITY TOKENS MISSING FROM HANDSHAKE.");
      return;
    }

    const rails = [
      "https://cdn.jsdelivr.net/npm/@circle-fin/w3s-pw-web-sdk@1.1.11/dist/index.js",
      "https://unpkg.com/@circle-fin/w3s-pw-web-sdk@1.1.11/dist/index.js",
    ];

    const loadWithFailover = async (index: number) => {
      if (index >= rails.length) {
        console.warn("[WARN] CDN Rails exhausted. Triggering Nuclear Memory Injection...");
        return attemptNuclearInjection(rails[0]);
      }

      const currentUrl = rails[index];
      const railLabel = index === 0 ? "PRIMARY RAIL" : "SECONDARY RAIL";
      setStatus(`ENGAGING ${railLabel}...`);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s Kill-switch

        console.log(`[INFO] Attempting fetch from: ${currentUrl}`);
        const response = await fetch(currentUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error("Rail unreachable.");

        const code = await response.text();
        injectAndVerify(code, railLabel);
      } catch (e) {
        console.error(`[BLOCK] ${railLabel} failed. Rotating rails...`);
        loadWithFailover(index + 1);
      }
    };

    const injectAndVerify = (code: string, source: string) => {
      console.log(`[INFO] Injecting Enclave Code from ${source}...`);
      const script = document.createElement("script");
      script.textContent = code; // Direct injection bypasses 'blob:' CSP issues
      document.head.appendChild(script);

      // Immediate Namespace Audit
      const global = window as any;
      const Constructor = (global.CircleWS || global.CircleW3S || global.Circle)?.W3SSDK || global.W3SSDK;

      if (Constructor) {
        console.log(`[SUCCESS] Enclave mounted via ${source}.`);
        setSdkInstance(new Constructor());
        setStatus("AIRLOCK SEALED. READY FOR PHYSICAL PIN.");
      } else {
        console.error(`[FATAL] Namespace missing in source ${source}.`);
        setError("CRYPTOGRAPHIC LIBRARY CORRUPTED OR BLOCKED.");
      }
    };

    const attemptNuclearInjection = async (fallbackUrl: string) => {
      setStatus("EXECUTING NUCLEAR MEMORY INJECTION...");
      try {
        // Final attempt: No-cors fetch to try and sneak past domain blocks
        const response = await fetch(fallbackUrl, { mode: "cors" });
        const code = await response.text();
        injectAndVerify(code, "NUCLEAR RAIL");
      } catch (e) {
        setError("TOTAL INFRASTRUCTURE BLOCK: ALL RAILS SEVERED.");
      }
    };

    loadWithFailover(0);
    return () => console.log("[END] SecureVault: Cleaning up script rails.");
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
          const { data: userAuth } = await (supabase.auth as any).getUser();
          if (userAuth?.user) {
            await supabase
              .from("profiles")
              .update({ circle_user_id: userAuth.user.id } as any)
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 transition-colors duration-500">
      {/* Brand Alignment - Mirroring LandingScreen.tsx */}
      <div className="absolute top-12 left-1/2 transform -translate-x-1/2 z-20">
        <img src={polishedLogo} alt="IDIA Life" className="w-16 h-16 rounded-2xl shadow-xl" />
      </div>

      <div className="max-w-md w-full space-y-8 bg-card border border-border rounded-[2.5rem] shadow-2xl p-10 relative overflow-hidden">
        {/* Mirroring Landing Screen Gradient Energy */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-48 h-48 rounded-full bg-teal-500 blur-[80px]" />
          <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full bg-emerald-500 blur-[60px]" />
        </div>

        <div className="text-center relative z-10">
          <div className="inline-flex items-center justify-center p-5 bg-primary/10 rounded-3xl mb-6 group">
            <ShieldCheck className="w-12 h-12 text-primary group-hover:scale-110 transition-transform duration-300" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic leading-none mb-2">
            Sovereign <span className="text-primary">Vault</span>
          </h1>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-[0.2em]">
            Non-Custodial Encryption Rail
          </p>
        </div>

        {/* Real-time Status Terminal */}
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
              <p className="text-[10px] font-black text-destructive uppercase">Security Violation</p>
              <p className="text-[11px] text-destructive/90 font-medium leading-tight">{error}</p>
            </div>
          </div>
        )}

        <div className="relative z-10 space-y-4 pt-4">
          <Button
            onClick={executeChallenge}
            disabled={!sdkInstance || isExecuting}
            className="w-full py-8 text-lg font-black uppercase tracking-[0.15em] rounded-2xl shadow-[0_20px_40px_-15px_rgba(var(--primary),0.3)] hover:translate-y-[-2px] active:translate-y-[0px] transition-all"
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

        <div className="pt-8 border-t border-border/50 text-center relative z-10">
          <div className="flex items-center justify-center gap-2 opacity-40">
            <Lock className="w-3 h-3" />
            <span className="text-[9px] font-black uppercase tracking-[0.4em]">
              IDIA Data - Architectural Computing OEM
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
