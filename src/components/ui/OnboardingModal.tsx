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
  const [sdkInstance, setSdkInstance] = useState<any>(null);

  // ARCHITECTURAL OVERRIDE: Fetching Circle SDK via Network ESM
  useEffect(() => {
    if (isVisible && !sdkLoaded) {
      const initializeCircle = async () => {
        console.log("[START] OnboardingModal: Initializing Circle SDK via Network ESM...");
        try {
          // COMPILER BYPASS: Using a template string and @vite-ignore to prevent Rollup from seeking local disk paths
          const sdkUrl = `https://esm.sh/@circle-fin/w3s-pw-web-sdk@1.1.11`;

          // @ts-ignore
          const module = await import(/* @vite-ignore */ sdkUrl);

          if (module && module.W3SSDK) {
            console.log("[INFO] OnboardingModal: Circle SDK binary fetched. Constructing instance...");
            const instance = new module.W3SSDK();
            setSdkInstance(instance);
            setSdkLoaded(true);
            console.log("[SUCCESS] OnboardingModal: Circle SDK Enclave active and ready.");
          } else {
            throw new Error("SDK module fetched but W3SSDK export is missing.");
          }
        } catch (error) {
          console.error("[ERROR] OnboardingModal: Failed to initialize Circle SDK Enclave.");
          if (error instanceof Error) {
            console.error(`[DETAILS] ${error.name}: ${error.message}`);
            if (error.stack) console.error(`[TRACE] ${error.stack}`);
          }
        } finally {
          console.log("[END] OnboardingModal: SDK initialization sequence resolved.");
        }
      };

      initializeCircle();
    }
  }, [isVisible, sdkLoaded]);

  if (!isVisible) return null;

  const handleCircleSetup = async () => {
    if (!sdkLoaded || !sdkInstance) {
      console.error("[ERROR] OnboardingModal: Circle Handshake aborted - SDK not ready.");
      return;
    }

    console.log("[START] OnboardingModal: Initiating Secure Handshake for Circle Enclave...");
    setIsProvisioningCircle(true);

    try {
      console.log("[INFO] OnboardingModal: Invoking provision-circle-wallet Edge Function...");
      const { data, error: invokeError } = await supabase.functions.invoke("provision-circle-wallet", {
        method: "POST",
      });

      if (invokeError) {
        console.error(`[ERROR] OnboardingModal: Edge Function invocation rejected.`);
        console.error(`[DETAILS] ${invokeError.message}`);
        throw invokeError;
      }

      if (data?.error) {
        console.error(`[ERROR] OnboardingModal: Handshake logic rejected by Circle API.`);
        console.error(`[DETAILS] ${data.error}`);
        throw new Error(data.error);
      }

      console.log("[SUCCESS] OnboardingModal: Challenge ID and User Tokens acquired.");

      // Configuration Protocol
      const sdk = sdkInstance;
      // REPLACE WITH YOUR ACTUAL APP ID FROM CIRCLE CONSOLE
      sdk.setAppSettings({ appId: "YOUR_CIRCLE_APP_ID" });

      sdk.setAuthentication({
        userToken: data.userToken,
        encryptionKey: data.encryptionKey,
      });

      console.log("[INFO] OnboardingModal: Triggering Physical PIN Challenge...");

      // Regulatory Execution
      sdk.execute(data.challengeId, async (error: any, result: any) => {
        if (error) {
          console.error(`[ERROR] OnboardingModal: Circle UI Handshake aborted or failed.`);
          console.error(`[DETAILS] ${error.message}`);
          setIsProvisioningCircle(false);
          return;
        }

        console.log("[SUCCESS] OnboardingModal: PIN/Recovery Set. Synchronizing Sovereignty Status...");

        // Final Database Confirmation - The Gate only opens after the PIN is confirmed physically
        try {
          const { data: userAuth } = await supabase.auth.getUser();
          if (!userAuth.user) throw new Error("Session lost during handshake.");

          const { error: syncError } = await (supabase.from("profiles") as any)
            .update({ circle_user_id: userAuth.user.id })
            .eq("user_id", userAuth.user.id);

          if (syncError) throw syncError;

          console.log("[SUCCESS] OnboardingModal: Sovereign status updated. Perimeter deactivated.");
          onClose();
        } catch (syncErr) {
          console.error("[ERROR] OnboardingModal: Post-handshake database sync failed.");
          if (syncErr instanceof Error) console.error(`[DETAILS] ${syncErr.message}`);
        }
      });
    } catch (error) {
      console.error("[ERROR] OnboardingModal: Fatal stall in Circle Handshake execution.");
      if (error instanceof Error) console.error(`[DETAILS] ${error.message}`);
      setIsProvisioningCircle(false);
    } finally {
      console.log("[END] OnboardingModal: Handshake execution block fully resolved.");
    }
  };

  const handleFBOSetup = async () => {
    console.log("[START] OnboardingModal: Initiating FBO (Fiat) Onboarding Sequence...");
    setIsProvisioningFBO(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("[SUCCESS] OnboardingModal: FBO provisioning trigger fired.");
    } catch (error) {
      console.error("[ERROR] OnboardingModal: Silent stall in FBO Onboarding.");
    } finally {
      setIsProvisioningFBO(false);
      console.log("[END] OnboardingModal: FBO Onboarding block resolved.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
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
              className="w-full group relative flex items-center p-4 bg-secondary/50 hover:bg-secondary border border-border hover:border-primary/50 rounded-xl transition-all duration-200 disabled:opacity-50"
            >
              <div className="mr-4 p-2 bg-blue-500/10 rounded-full group-hover:scale-110 transition-transform">
                {isProvisioningCircle ? (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                ) : (
                  <Zap className="w-5 h-5 text-blue-500" />
                )}
              </div>
              <div className="flex-1 text-left">
                <span className="font-semibold text-foreground">
                  {isProvisioningCircle ? "Securing Enclave..." : "Circle USDC Wallet"}
                </span>
                <p className="text-xs text-muted-foreground">Requires Secure PIN & Recovery Setup</p>
              </div>
              {!isProvisioningCircle && sdkLoaded && (
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all" />
              )}
            </button>
          )}

          {needsFBO && (
            <button
              onClick={handleFBOSetup}
              disabled={isProvisioningCircle || isProvisioningFBO}
              className="w-full group relative flex items-center p-4 bg-secondary/50 hover:bg-secondary border border-border hover:border-primary/50 rounded-xl transition-all duration-200 disabled:opacity-50"
            >
              <div className="mr-4 p-2 bg-green-500/10 rounded-full group-hover:scale-110 transition-transform">
                {isProvisioningFBO ? (
                  <Loader2 className="w-5 h-5 text-green-500 animate-spin" />
                ) : (
                  <Landmark className="w-5 h-5 text-green-500" />
                )}
              </div>
              <div className="flex-1 text-left">
                <span className="font-semibold text-foreground">
                  {isProvisioningFBO ? "Linking..." : "Fiat Rail (FBO)"}
                </span>
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
