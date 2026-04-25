import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShieldCheck, Loader2, AlertCircle, Lock, Terminal, Cpu, Zap, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button"; // Standard UI component
import polishedLogo from "@/assets/IDIA_Life_Logo_Polished.png"; // Brand consistency

export default function SecureVault() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [sdkInstance, setSdkInstance] = useState<any>(null);
  const [status, setStatus] = useState("Initializing Secure Handshake...");
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

      const script = document.createElement("script");
      script.src = `${currentRail.url}?v=${Date.now()}`;
      script.async = true;
      script.crossOrigin = "anonymous";

      script.onload = () => {
        const global = window as any;
        const Constructor = (global.CircleWS || global.CircleW3S || global.Circle)?.W3SSDK || global.W3SSDK;

        if (Constructor) {
          console.log(`[SUCCESS] SecureVault: established via ${currentRail.label}`);
          setSdkInstance(new Constructor());
          setStatus("Airlock sealed. Ready for confirmation.");
        } else {
          loadScript(index + 1);
        }
      };

      script.onerror = () => loadScript(index + 1);
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
            setSdkInstance(new Constructor());
            setStatus("Airlock sealed (Proxy Mode).");
          }
        };
        document.head.appendChild(script);
      } catch (e) {
        setError("Total Infrastructure Block: External security scripts cannot be injected.");
      }
    };

    loadScript();
  }, [searchParams]);

  // --- CRYPTOGRAPHIC EXECUTION ---
  const executeChallenge = () => {
    if (!sdkInstance) return;

    setIsExecuting(true);
    setStatus("Engaging secure perimeter...");
    setError(null);

    const userToken = searchParams.get("userToken");
    const encryptionKey = searchParams.get("encryptionKey");
    const challengeId = searchParams.get("challengeId");

    if (!challengeId || challengeId === "null") {
      setStatus("Vault already active. Redirecting...");
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

        setStatus("Handshake Confirmed. Syncing Identity...");

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
      setStatus("Airlock sealed. Ready.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 sm:p-12 transition-colors duration-500">
      {/* Absolute Logo Placement mirroring Landing Screen */}
      <div className="absolute top-12 left-1/2 transform -translate-x-1/2">
        <img src={polishedLogo} alt="IDIA Life Logo" className="w-16 h-16 rounded-2xl shadow-lg" />
      </div>

      <div className="max-w-md w-full space-y-8 bg-card border border-border rounded-3xl shadow-2xl p-10 relative overflow-hidden">
        {/* Subtle Background Glow mirroring Landing aesthetics */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-32 h-32 rounded-full bg-primary/20 blur-2xl" />
          <div className="absolute bottom-0 right-0 w-24 h-24 rounded-full bg-primary/30 blur-xl" />
        </div>

        <div className="text-center relative z-10">
          <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-2xl mb-6">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2 leading-tight">Sovereign Vault</h1>
          <p className="text-muted-foreground text-sm font-medium">Non-Custodial Data Encryption Protocol</p>
        </div>

        {/* Status Indicator Bar */}
        <div className="relative z-10 bg-muted/50 rounded-xl p-4 border border-border">
          <div className="flex items-center gap-3">
            {!sdkInstance ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            ) : (
              <Terminal className="w-4 h-4 text-primary" />
            )}
            <p className="text-[10px] font-mono font-bold tracking-widest uppercase truncate">{status}</p>
          </div>
        </div>

        {error && (
          <div className="relative z-10 p-4 bg-destructive/10 border border-destructive/50 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-xs text-destructive font-semibold uppercase tracking-wide">{error}</p>
          </div>
        )}

        <div className="relative z-10 space-y-4">
          <Button
            onClick={executeChallenge}
            disabled={!sdkInstance || isExecuting}
            className="w-full py-7 text-lg font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isExecuting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Validating...
              </span>
            ) : (
              <span className="flex items-center gap-2 uppercase tracking-widest">Authorize Secure PIN</span>
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            disabled={isExecuting}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            Cancel and Return
          </Button>
        </div>

        <div className="pt-6 border-t border-border/50 text-center relative z-10">
          <div className="flex items-center justify-center gap-2 opacity-50">
            <Lock className="w-3 h-3" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
              IDIA Data Inc. Infrastructure Rail
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
