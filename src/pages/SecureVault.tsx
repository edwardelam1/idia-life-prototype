import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShieldCheck, Loader2, AlertCircle, Lock, Terminal, Cpu, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function SecureVault() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [sdkInstance, setSdkInstance] = useState<any>(null);
  const [status, setStatus] = useState("Initializing Multi-Rail Handshake...");
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // --- ARCHITECTURAL FAILOVER: TRIPLE-RAIL SDK INJECTION ---
  useEffect(() => {
    console.log("[START] SecureVault: Deploying Failover Infrastructure...");

    const userToken = searchParams.get("userToken");
    const encryptionKey = searchParams.get("encryptionKey");

    if (!userToken || !encryptionKey) {
      console.error("[ERROR] SecureVault: Missing cryptographic URL parameters.");
      setError("Unauthorized Protocol: Security tokens missing from Airlock.");
      return;
    }

    const rails = [
      {
        url: "https://cdn.jsdelivr.net/npm/@circle-fin/w3s-pw-web-sdk@1.1.11/dist/index.js",
        label: "Rail A (jsDelivr)",
      },
      { url: "https://unpkg.com/@circle-fin/w3s-pw-web-sdk@1.1.11/dist/index.js", label: "Rail B (Unpkg)" },
    ];

    const loadScript = async (index = 0) => {
      if (index >= rails.length) {
        console.log("[CRITICAL] CDN Rails Severed. Attempting Nuclear Blob Bypass...");
        return attemptNuclearBypass();
      }

      const currentRail = rails[index];
      setStatus(`Engaging ${currentRail.label}...`);
      console.log(`[INFO] SecureVault: Attempting injection via ${currentRail.label}`);

      const script = document.createElement("script");
      script.src = `${currentRail.url}?v=${Date.now()}`; // Cache buster
      script.async = true;
      script.crossOrigin = "anonymous";

      script.onload = () => {
        const global = window as any;
        const Constructor = (global.CircleWS || global.CircleW3S || global.Circle)?.W3SSDK || global.W3SSDK;

        if (Constructor) {
          console.log(`[SUCCESS] SecureVault: Handshake established via ${currentRail.label}`);
          setSdkInstance(new Constructor());
          setStatus("Airlock sealed. Ready for physical confirmation.");
        } else {
          console.warn(`[WARN] Namespace missing on ${currentRail.label}. Rotating...`);
          loadScript(index + 1);
        }
      };

      script.onerror = () => {
        console.warn(`[BLOCK] ${currentRail.label} blocked by network. Rotating...`);
        loadScript(index + 1);
      };

      document.head.appendChild(script);
    };

    const attemptNuclearBypass = async () => {
      setStatus("Executing Nuclear Blob Bypass...");
      try {
        const response = await fetch("https://cdn.jsdelivr.net/npm/@circle-fin/w3s-pw-web-sdk@1.1.11/dist/index.js");
        const code = await response.text();
        const blob = new Blob([code], { type: "application/javascript" });
        const blobUrl = URL.createObjectURL(blob);

        const script = document.createElement("script");
        script.src = blobUrl;
        script.onload = () => {
          const global = window as any;
          const Constructor = (global.CircleWS || global.CircleW3S || global.Circle)?.W3SSDK || global.W3SSDK;
          if (Constructor) {
            console.log("[SUCCESS] SecureVault: Perimeter breached via Blob Proxy.");
            setSdkInstance(new Constructor());
            setStatus("Airlock sealed (Proxy Mode). Ready.");
          }
        };
        document.head.appendChild(script);
      } catch (e) {
        console.error("[FATAL] All infrastructure rails severed.");
        setError("Total Infrastructure Block: Circle security scripts cannot be injected.");
      }
    };

    loadScript();
    return () => console.log("[END] SecureVault: Cleaning up script rails.");
  }, [searchParams]);

  // --- CRYPTOGRAPHIC EXECUTION ---
  const executeChallenge = () => {
    if (!sdkInstance) return;

    console.log("[START] SecureVault: Engaging PIN Enclave...");
    setIsExecuting(true);
    setStatus("Engaging secure perimeter...");
    setError(null);

    const userToken = searchParams.get("userToken");
    const encryptionKey = searchParams.get("encryptionKey");
    const challengeId = searchParams.get("challengeId");

    if (!challengeId || challengeId === "null") {
      setStatus("Wallet already initialized. Redirecting...");
      setTimeout(() => navigate("/"), 2000);
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
          setError(`Handshake Aborted: ${err.message}`);
          setIsExecuting(false);
          setStatus("Airlock sealed. Ready.");
          return;
        }

        setStatus("Handshake Confirmed. Finalizing identity...");

        try {
          const { data: userAuth } = await (supabase.auth as any).getUser();
          if (userAuth?.user) {
            await supabase
              .from("profiles")
              .update({ circle_user_id: userAuth.user.id } as any)
              .eq("user_id", userAuth.user.id);
          }
        } catch (dbError: any) {
          console.error(`[ERROR] Database sync failed - ${dbError.message}`);
        }

        navigate("/");
      });
    } catch (e: any) {
      setError(`Execution failed: ${e.message}`);
      setIsExecuting(false);
      setStatus("Airlock sealed. Ready for physical confirmation.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 transition-colors duration-500">
      <div className="max-w-md w-full space-y-8 text-center bg-card p-10 rounded-3xl border border-border shadow-2xl relative overflow-hidden">
        {/* Adaptive Primary Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-primary/5 blur-[80px] pointer-events-none" />

        <div className="flex justify-center relative z-10">
          <div className="p-5 bg-muted border border-border rounded-full shadow-inner">
            <Cpu className={`w-10 h-10 text-primary ${!sdkInstance ? "animate-pulse" : ""}`} />
          </div>
        </div>

        <div className="space-y-3 relative z-10">
          <h1 className="text-3xl font-black tracking-tighter uppercase italic">
            Sovereign <span className="text-primary underline decoration-primary/30 underline-offset-8">Airlock</span>
          </h1>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Terminal className="w-4 h-4" />
            <p className="text-[10px] font-mono font-black tracking-widest uppercase">{status}</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/50 rounded-xl flex items-start gap-3 text-left relative z-10 animate-in fade-in zoom-in duration-300">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-xs text-destructive font-mono font-bold leading-tight uppercase">{error}</p>
          </div>
        )}

        <div className="relative z-10 pt-4">
          <button
            onClick={executeChallenge}
            disabled={!sdkInstance || isExecuting}
            className="w-full group relative py-5 bg-primary text-primary-foreground font-black uppercase tracking-[0.2em] text-xs rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-30 shadow-[0_10px_30px_-10px_rgba(var(--primary),0.5)] flex justify-center items-center gap-3"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                HANDSHAKE ACTIVE
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                INITIATE VAULT SYNC
              </>
            )}
          </button>
        </div>

        <div className="pt-6 border-t border-border relative z-10 opacity-40">
          <div className="flex items-center justify-center gap-2">
            <Lock className="w-3 h-3 text-primary" />
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.5em] font-black">
              IDIA Data Infrastructure Rail
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
