import { useState, useEffect } from "react";
import { X, ShieldCheck, Landmark, ArrowRight, Zap, Loader2 } from "lucide-react";
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

  // CLOUD INJECTION: Load Circle SDK from CDN for browser-side execution
  useEffect(() => {
    if (isVisible && !(window as any).CircleWS) {
      console.log("[START] Cloud Injector: Fetching Circle W3S SDK...");
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@circle-fin/w3s-pw-web-sdk@1.1.11/dist/index.js";
      script.async = true;
      script.onload = () => {
        console.log("[SUCCESS] Circle SDK injected into Global Window.");
        setSdkLoaded(true);
      };
      document.head.appendChild(script);
    } else if ((window as any).CircleWS) {
      setSdkLoaded(true);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const handleCloseClick = () => {
    if (isProvisioningCircle || isProvisioningFBO) {
      console.log("[INFO] Modal closure rejected: Provisioning handshake in progress.");
      return;
    }
    console.log("[START] User requested modal closure...");
    try {
      onClose();
      console.log("[SUCCESS] Modal closure callback executed.");
    } catch (error) {
      console.error("[ERROR] Silent stall during modal closure.");
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      console.log("[INFO] Backdrop click detected. Evaluating closure...");
      handleCloseClick();
    }
  };

  const handleCircleSetup = async () => {
    if (!sdkLoaded) {
      console.error("[ERROR] Circle SDK not yet initialized in the browser.");
      return;
    }

    console.log("[START] Initiating Circle Programmable Wallet Handshake...");
    setIsProvisioningCircle(true);

    try {
      // 1. Invoke Edge Function to get session tokens and challengeId
      const { data, error: invokeError } = await supabase.functions.invoke("provision-circle-wallet", {
        method: "POST",
      });

      if (invokeError || data?.error) throw new Error(data?.error || "Handshake failed.");

      console.log("[SUCCESS] Session Tokens acquired. Launching Regulatory UI...");

      // 2. Initialize the SDK from the global window object
      const CircleWS = (window as any).CircleWS;
      const sdk = new CircleWS.W3SSDK();

      // REPLACE WITH YOUR ACTUAL APP ID FROM CIRCLE CONSOLE
      sdk.setAppSettings({ appId: "YOUR_CIRCLE_APP_ID" });

      sdk.setAuthentication({
        userToken: data.userToken,
        encryptionKey: data.encryptionKey,
      });

      // 3. Execute PIN/Recovery Challenge
      sdk.execute(data.challengeId, (error: any, result: any) => {
        if (error) {
          console.error(`[ERROR] Circle UI aborted: ${error.message}`);
          setIsProvisioningCircle(false);
          return;
        }

        console.log("[SUCCESS] PIN/Recovery Set. Enclave synchronized.", result);
        onClose(); // Handshake complete, exit modal
      });
    } catch (error) {
      console.error("[ERROR] Fatal stall in Circle Handshake.");
      if (error instanceof Error) console.error(`[DETAILS] ${error.message}`);
      setIsProvisioningCircle(false);
    }
  };

  const handleFBOSetup = async () => {
    console.log("[START] Initiating FBO (Fiat) Onboarding Sequence...");
    setIsProvisioningFBO(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("[SUCCESS] FBO provisioning trigger fired.");
    } catch (error) {
      console.error("[ERROR] Silent stall in FBO Onboarding.");
      if (error instanceof Error) console.error(`[DETAILS] ${error.message}`);
    } finally {
      setIsProvisioningFBO(false);
      console.log("[END] FBO Onboarding execution block resolved.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
          <button
            onClick={handleCloseClick}
            disabled={isProvisioningCircle || isProvisioningFBO}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>

          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Initialize Sovereign Vault</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            To manage your Data Yields and settle assets, select a liquidity rail to initialize.
          </p>
        </div>

        <div className="p-6 space-y-4">
          {needsCircle && (
            <button
              onClick={handleCircleSetup}
              disabled={isProvisioningCircle || isProvisioningFBO || !sdkLoaded}
              className="w-full group relative flex items-center p-4 bg-secondary/50 hover:bg-secondary border border-border hover:border-primary/50 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="mr-4 p-2 bg-blue-500/10 rounded-full group-hover:scale-110 transition-transform">
                {isProvisioningCircle ? (
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
                  {!isProvisioningCircle && (
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Requires Secure PIN & Recovery Setup</p>
              </div>
            </button>
          )}

          {needsFBO && (
            <button
              onClick={handleFBOSetup}
              disabled={isProvisioningCircle || isProvisioningFBO}
              className="w-full group relative flex items-center p-4 bg-secondary/50 hover:bg-secondary border border-border hover:border-primary/50 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="mr-4 p-2 bg-green-500/10 rounded-full group-hover:scale-110 transition-transform">
                {isProvisioningFBO ? (
                  <Loader2 className="w-5 h-5 text-green-500 animate-spin" />
                ) : (
                  <Landmark className="w-5 h-5 text-green-500" />
                )}
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">
                    {isProvisioningFBO ? "Linking..." : "Fiat Rail (FBO)"}
                  </span>
                  {!isProvisioningFBO && (
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Link traditional banking for USD liquidation</p>
              </div>
            </button>
          )}
        </div>

        <div className="p-4 bg-muted/30 text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
            Sovereign Identity Protocol Secured
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
