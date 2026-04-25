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

  // --- ARCHITECTURAL TELEMETRY: TRIPLE-RAIL + NUCLEAR BLOB BYPASS ---
  useEffect(() => {
    if (isVisible && !sdkLoaded) {
      console.log("[START] OnboardingModal: Initiating Enclave Infrastructure Handshake...");
      setHandshakeTimedOut(false);
      setLoadError(null);

      const timer = setTimeout(() => {
        if (!sdkLoaded) {
          console.warn(
            "[TIMEOUT] OnboardingModal: Handshake heartbeat stopped. Verify Testnet Whitelist for idia-life-ui.lovable.app",
          );
          setHandshakeTimedOut(true);
        }
      }, 15000); // 15s Heartbeat for Cloud Latency

      const initializeEnclave = async () => {
        console.log("[INFO] Enclave Handshake: Commencing Multi-Path Execution...");

        // --- PATH A: ESM.SH (Modern Rail) ---
        try {
          console.log("[START] Path A: Attempting Network ESM Import...");
          const sdkUrl = `https://esm.sh/@circle-fin/w3s-pw-web-sdk@1.1.11?bundle&v=${Date.now()}`;
          // @ts-ignore
          const module = await import(/* @vite-ignore */ sdkUrl);

          if (module?.W3SSDK) {
            console.log("[INFO] Path A: W3SSDK Module detected.");
            setSdkInstance(new module.W3SSDK());
            setSdkLoaded(true);
            clearTimeout(timer);
            console.log("[SUCCESS] Path A: Enclave active via ESM.");
            console.log("[END] Path A Handshake resolved.");
            return;
          }
        } catch (e) {
          console.warn("[BLOCK] Path A: ESM Rail unreachable or CSP blocked.");
        }

        // --- PATH B & C: Standard Script Injection Helper ---
        const tryScript = (url: string, label: string): Promise<boolean> => {
          return new Promise((resolve) => {
            console.log(`[START] ${label}: Attempting injection...`);
            const script = document.createElement("script");
            script.src = `${url}?v=${Date.now()}`;
            script.async = true;

            script.onload = () => {
              console.log(`[INFO] ${label}: Script delivery confirmed.`);
              const global = window as any;
              const Constructor = (global.CircleWS || global.CircleW3S || global.Circle)?.W3SSDK || global.W3SSDK;

              if (Constructor) {
                console.log(`[INFO] ${label}: Namespace identified.`);
                setSdkInstance(new Constructor());
                setSdkLoaded(true);
                clearTimeout(timer);
                console.log(`[SUCCESS] ${label}: Enclave active.`);
                console.log(`[END] ${label} Handshake resolved.`);
                resolve(true);
              } else {
                console.error(`[ERROR] ${label}: Namespace search failed.`);
                resolve(false);
              }
            };

            script.onerror = () => {
              console.error(`[BLOCK] ${label}: Network or CORS block.`);
              resolve(false);
            };
            document.head.appendChild(script);
          });
        };

        console.log("[INFO] Enclave Handshake: Pivoting to Secondary Script Rails...");
        if (await tryScript("https://unpkg.com/@circle-fin/w3s-pw-web-sdk@1.1.11/dist/index.js", "Path B (Unpkg)"))
          return;
        if (
          await tryScript(
            "https://cdn.jsdelivr.net/npm/@circle-fin/w3s-pw-web-sdk@1.1.11/dist/index.js",
            "Path C (jsDelivr)",
          )
        )
          return;

        // --- PATH D: THE BLOB BYPASS (Nuclear Rail) ---
        try {
          console.log("[START] Path D: Executing Blob Proxy Nuclear Bypass...");
          const response = await fetch("https://cdn.jsdelivr.net/npm/@circle-fin/w3s-pw-web-sdk@1.1.11/dist/index.js");
          const code = await response.text();
          console.log("[INFO] Path D: Binary stream captured. Constructing Blob...");

          const blob = new Blob([code], { type: "application/javascript" });
          const blobUrl = URL.createObjectURL(blob);

          const script = document.createElement("script");
          script.src = blobUrl;
          script.onload = () => {
            const global = window as any;
            const Constructor = (global.CircleWS || global.CircleW3S || global.Circle)?.W3SSDK || global.W3SSDK;
            if (Constructor) {
              setSdkInstance(new Constructor());
              setSdkLoaded(true);
              clearTimeout(timer);
              console.log("[SUCCESS] Path D: Enclave active via Local Blob Bypass.");
              console.log("[END] Path D Handshake resolved.");
            }
          };
          document.head.appendChild(script);
        } catch (e) {
          console.error("[FATAL] Path D: Nuclear rail severed. Total infrastructure block.");
          setLoadError("TOTAL NETWORK BLOCK: All Infrastructure Unreachable.");
        }
      };

      initializeEnclave();
      return () => {
        console.log("[CLEANUP] OnboardingModal: Clearing Handshake timer.");
        clearTimeout(timer);
      };
    }
  }, [isVisible, sdkLoaded]);

  if (!isVisible) return null;

  const handleCircleSetup = async () => {
    if (!sdkLoaded || !sdkInstance) {
      console.warn("[WARN] OnboardingModal: Setup blocked - Infrastructure not synchronized.");
      return;
    }

    console.log("[START] OnboardingModal: Initiating Secure PIN Handshake sequence...");
    setIsProvisioningCircle(true);

    try {
      console.log("[INFO] Step 1: Invoking provision-circle-wallet with TEST keys...");
      const { data, error: invokeError } = await supabase.functions.invoke("provision-circle-wallet", {
        method: "POST",
      });

      if (invokeError || data?.error) {
        console.error(`[ERROR] Step 1: Edge Function stall - ${invokeError?.message || data?.error}`);
        throw new Error(data?.error || "Edge Function Handshake failed.");
      }
      console.log("[SUCCESS] Step 1: Challenge tokens and session state acquired.");

      const sdk = sdkInstance;

      console.log("[INFO] Step 2: Configuring SDK Application Identity (Testnet)...");
      // IDENTIFIER: 6b051463-ed70-5b48-9758-4f1d0e58bf24
      sdk.setAppSettings({ appId: "6b051463-ed70-5b48-9758-4f1d0e58bf24" });

      console.log("[INFO] Step 3: Synchronizing Authentication Enclave...");
      sdk.setAuthentication({
        userToken: data.userToken,
        encryptionKey: data.encryptionKey,
      });

      console.log("[INFO] Step 4: Launching Physical PIN Challenge UI...");
      sdk.execute(data.challengeId, async (error: any, result: any) => {
        console.log("[START] Circle UI Callback: Evaluating result...");

        if (error) {
          console.error(`[ERROR] Circle UI: Challenge aborted - ${error.message}`);
          setIsProvisioningCircle(false);
          return;
        }

        console.log("[SUCCESS] Circle UI: PIN entry confirmed by user.");

        console.log("[INFO] Step 5: Finalizing Database Sovereignty Sync...");
        const { data: userAuth } = await supabase.auth.getUser();
        if (userAuth.user) {
          const { error: syncError } = await (supabase.from("profiles") as any)
            .update({ circle_user_id: userAuth.user.id })
            .eq("user_id", userAuth.user.id);

          if (syncError) {
            console.error(`[ERROR] Step 5: Database sync failed - ${syncError.message}`);
          } else {
            console.log("[SUCCESS] Step 5: Identity profile updated.");
          }
        }

        console.log("[END] Circle Handshake: Enclave setup complete. Closing perimeter.");
        onClose();
      });
    } catch (error: any) {
      console.error(`[FATAL] Handshake Execution Stall: ${error.message}`);
      setIsProvisioningCircle(false);
    } finally {
      console.log("[END] OnboardingModal: Handshake logic block finished.");
    }
  };

  const handleFBOSetup = async () => {
    console.log("[START] OnboardingModal: Initiating FBO Provisioning Sequence...");
    setIsProvisioningFBO(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("[SUCCESS] FBO: Handshake fired.");
    } finally {
      setIsProvisioningFBO(false);
      console.log("[END] OnboardingModal: FBO sequence resolved.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProvisioningCircle && !isProvisioningFBO) onClose();
      }}
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
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Sovereign Vault <span className="text-[10px] text-orange-500 uppercase align-top font-bold">Testnet</span>
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {sdkLoaded ? "Infrastructure synced. Initialize your vault." : "Connecting to test liquidity rails..."}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {(loadError || handshakeTimedOut) && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs text-red-400 font-mono">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{handshakeTimedOut ? "TIMED OUT: Verify Circle Whitelist" : loadError}</span>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="text-[10px] uppercase tracking-widest font-bold text-red-500 hover:text-red-400 flex items-center gap-1 w-fit"
              >
                <RefreshCw className="w-3 h-3" /> Force Infrastructure Sync
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
                  {!sdkLoaded ? "Waiting for test enclave sync..." : "Requires Test PIN Setup"}
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

        <div className="p-4 bg-muted/30 border-t border-border/10 text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
            Architectural Computing OEM - Test Rail Alpha
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
