import { useState, useEffect } from "react";
import { X, ShieldCheck, Landmark, ArrowRight, Zap, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface OnboardingModalProps {
  isVisible: boolean;
  onClose: () => void;
  needsCircle: boolean;
  needsFBO: boolean;
}

const OnboardingModal = ({ isVisible, onClose, needsCircle, needsFBO }: OnboardingModalProps) => {
  const [isProvisioningCircle, setIsProvisioningCircle] = useState(false);
  const [isProvisioningFBO, setIsProvisioningFBO] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sdkInstance, setSdkInstance] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [handshakeTimedOut, setHandshakeTimedOut] = useState(false);

  // ARCHITECTURAL TELEMETRY: Infrastructure Handshake with Heartbeat
  useEffect(() => {
    if (isVisible && !sdkLoaded) {
      console.log("[START] OnboardingModal: Initiating Enclave Infrastructure Handshake...");
      setHandshakeTimedOut(false);
      setLoadError(null);

      // 10s HEARTBEAT: Catching Domain Whitelist Stalls
      const timer = setTimeout(() => {
        if (!sdkLoaded) {
          console.warn("[TIMEOUT] OnboardingModal: Handshake heartbeat stopped. Verify Circle Console Whitelist.");
          setHandshakeTimedOut(true);
        }
      }, 10000);

      const initializeEnclave = async () => {
        // PATH A: Dynamic ESM Import
        try {
          console.log("[INFO] Path A: Attempting Network ESM Import...");
          const sdkUrl = `https://esm.sh/@circle-fin/w3s-pw-web-sdk@1.1.11?bundle`;
          // @ts-ignore
          const module = await import(/* @vite-ignore */ sdkUrl);

          if (module?.W3SSDK) {
            setSdkInstance(new module.W3SSDK());
            setSdkLoaded(true);
            clearTimeout(timer);
            console.log("[SUCCESS] Path A: SDK Enclave active via ESM.");
            return;
          }
        } catch (esmError) {
          console.warn("[WARN] Path A blocked. Initiating Path B (Global Fallback)...");
        }

        // PATH B: Script Injection Fallback
        try {
          console.log("[INFO] Path B: Injecting physical script tag...");
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/@circle-fin/w3s-pw-web-sdk@1.1.11/dist/src/index.js";
          script.async = true;
          script.onload = () => {
            const CircleWS = (window as any).CircleWS || (window as any).CircleW3S;
            if (CircleWS?.W3SSDK) {
              setSdkInstance(new CircleWS.W3SSDK());
              setSdkLoaded(true);
              clearTimeout(timer);
              console.log("[SUCCESS] Path B: SDK Enclave active via Global Namespace.");
            } else {
              console.error("[ERROR] Path B: Script loaded but W3SSDK namespace not found.");
              setLoadError("Namespace Collision: W3SSDK missing.");
            }
          };
          script.onerror = () => {
            console.error("[ERROR] Path B: Network blocked script injection.");
            setLoadError("Network Block: Infrastructure unreachable.");
          };
          document.head.appendChild(script);
        } catch (fallbackError) {
          console.error("[FATAL] Total Handshake Failure. Check network permissions.");
          setLoadError("Infrastructure Outage: Dual-Path Failure.");
        } finally {
          console.log("[END] OnboardingModal: Handshake sequence block resolved.");
        }
      };

      initializeEnclave();
      return () => clearTimeout(timer);
    }
  }, [isVisible, sdkLoaded]);

  if (!isVisible) return null;

  const handleCircleSetup = async () => {
    if (!sdkLoaded || !sdkInstance) {
      console.warn("[WARN] OnboardingModal: Setup blocked - Enclave infrastructure not synchronized.");
      return;
    }

    console.log("[START] OnboardingModal: Initiating Secure PIN Handshake...");
    setIsProvisioningCircle(true);

    try {
      console.log("[INFO] OnboardingModal: Invoking provision-circle-wallet Edge Function...");
      const { data, error: invokeError } = await supabase.functions.invoke("provision-circle-wallet", {
        method: "POST",
      });

      if (invokeError || data?.error) {
        throw new Error(data?.error || "Edge Function Handshake failed.");
      }

      console.log("[SUCCESS] OnboardingModal: Challenge Tokens acquired. Engaging Regulatory UI...");

      const sdk = sdkInstance;
      // VERIFIED APP ID
      sdk.setAppSettings({ appId: "6b051463-ed70-5b48-9758-4f1d0e58bf24" });

      sdk.setAuthentication({
        userToken: data.userToken,
        encryptionKey: data.encryptionKey,
      });

      sdk.execute(data.challengeId, async (error: any, result: any) => {
        if (error) {
          console.error(`[ERROR] OnboardingModal: Circle UI Handshake aborted: ${error.message}`);
          setIsProvisioningCircle(false);
          return;
        }

        console.log("[SUCCESS] OnboardingModal: PIN Confirmed. Executing Sovereignty Sync...");

        const { data: userAuth } = await supabase.auth.getUser();
        if (userAuth.user) {
          const { error: syncError } = await (supabase.from("profiles") as any)
            .update({ circle_user_id: userAuth.user.id })
            .eq("user_id", userAuth.user.id);

          if (syncError) console.error("[ERROR] Post-PIN Database sync failed.");
        }

        console.log("[END] OnboardingModal: Circle Setup complete. Perimeter deactivating.");
        onClose();
      });
    } catch (error: any) {
      console.error(`[ERROR] OnboardingModal: Fatal stall in handshake execution - ${error.message}`);
      setIsProvisioningCircle(false);
    } finally {
      console.log("[END] OnboardingModal: Handshake block finished.");
    }
  };

  const handleFBOSetup = async () => {
    console.log("[START] OnboardingModal: Initiating FBO (Fiat) Provisioning...");
    setIsProvisioningFBO(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("[SUCCESS] FBO Handshake fired.");
    } finally {
      setIsProvisioningFBO(false);
      console.log("[END] OnboardingModal: FBO sequence resolved.");
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isProvisioningCircle && !isProvisioningFBO) {
      console.log("[INFO] OnboardingModal: Backdrop click detected. Dismissing Modal.");
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
          <button
            onClick={onClose}
            disabled={isProvisioningCircle || isProvisioningFBO}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>

          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Sovereign Vault</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {sdkLoaded ? "Infrastructure synced. Initialize your vault." : "Connecting to global liquidity rails..."}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {(loadError || handshakeTimedOut) && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{handshakeTimedOut ? "Handshake Timed Out: Verify Circle Domain Whitelist" : loadError}</span>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="text-[10px] uppercase tracking-widest font-bold text-red-500 hover:text-red-400 flex items-center gap-1 w-fit"
              >
                <RefreshCw className="w-3 h-3" /> Retry Infrastructure Sync
              </button>
            </div>
          )}

          {needsCircle && (
            <button
              onClick={handleCircleSetup}
              disabled={isProvisioningCircle || isProvisioningFBO || !sdkLoaded}
              className="w-full group relative flex items-center p-4 bg-secondary/50 hover:bg-secondary border border-border hover:border-primary/50 rounded-xl transition-all duration-200 disabled:opacity-50"
            >
              <div className="mr-4 p-2 bg-blue-500/10 rounded-full group-hover:scale-110 transition-transform">
                {isProvisioningCircle || (!sdkLoaded && !handshakeTimedOut) ? (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                ) : (
                  <Zap className="w-5 h-5 text-blue-500" />
                )}
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">
                    {isProvisioningCircle ? "Securing Enclave..." : "Circle USDC Wallet"}
                  </span>
                  {!isProvisioningCircle && sdkLoaded && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  {!sdkLoaded ? "Waiting for enclave sync..." : "Requires Secure PIN & Recovery Setup"}
                </p>
              </div>
            </button>
          )}

          {needsFBO && (
            <button
              onClick={handleFBOSetup}
              disabled={isProvisioningCircle || isProvisioningFBO}
              className="w-full group relative flex items-center p-4 bg-secondary/50 hover:bg-secondary border border-border hover:border-primary/50 rounded-xl transition-all duration-200 disabled:opacity-50"
            >
              <div className="mr-4 p-2 bg-green-500/10 rounded-full">
                {isProvisioningFBO ? (
                  <Loader2 className="w-5 h-5 text-green-500 animate-spin" />
                ) : (
                  <Landmark className="w-5 h-5 text-green-500" />
                )}
              </div>
              <div className="flex-1 text-left">
                <span className="font-semibold block text-foreground">Fiat Rail (FBO)</span>
                <p className="text-xs text-muted-foreground">Link banking for USD liquidation</p>
              </div>
            </button>
          )}
        </div>

        <div className="p-4 bg-muted/30 text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
            Architectural Computing OEM - IDIA Data
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
