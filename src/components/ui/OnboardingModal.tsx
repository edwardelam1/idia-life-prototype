import { useState } from "react";
import { X, ShieldCheck, Landmark, ArrowRight, Zap, Loader2, Activity } from "lucide-react";
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

  if (!isVisible) return null;

  const handleCircleSetup = async () => {
    setIsProvisioningCircle(true);
    console.log("[START] Sovereign Airlock: Initiating secure redirect...");

    try {
      // 1. Generate the Challenge Tokens on the backend
      const { data, error: invokeError } = await supabase.functions.invoke("provision-circle-wallet", {
        method: "POST",
      });

      if (invokeError || data?.error) {
        throw new Error(data?.error || invokeError?.message || "Failed to provision wallet challenge.");
      }

      console.log("[SUCCESS] Tokens acquired. Opening Airlock...");

      // 2. Redirect to the pristine, standalone PIN portal
      // You will host a simple HTML file at this URL that runs the Circle SDK cleanly
      const userToken = encodeURIComponent(data.userToken);
      const encryptionKey = encodeURIComponent(data.encryptionKey);
      const challengeId = encodeURIComponent(data.challengeId);

      // Construct the secure URL
      const securePortalUrl = `https://vault.thebigidia.com/auth?userToken=${userToken}&encryptionKey=${encryptionKey}&challengeId=${challengeId}`;

      // Execute the top-level redirect (Bypasses all Iframe/ITP restrictions)
      window.location.assign(securePortalUrl);
    } catch (error: any) {
      console.error(`[FATAL] Airlock Failure: ${error.message}`);
      setIsProvisioningCircle(false);
    }
  };

  const handleFBOSetup = async () => {
    setIsProvisioningFBO(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } finally {
      setIsProvisioningFBO(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
          <button
            onClick={onClose}
            disabled={isProvisioningCircle}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Sovereign Vault</h2>
          </div>
          <p className="text-sm text-muted-foreground">Secure non-custodial wallet provisioning.</p>
        </div>

        <div className="p-6 space-y-4">
          {needsCircle && (
            <button
              onClick={handleCircleSetup}
              disabled={isProvisioningCircle || isProvisioningFBO}
              className="w-full group relative flex items-center p-4 bg-secondary/50 hover:bg-secondary border border-border hover:border-primary/50 rounded-xl transition-all duration-200 disabled:opacity-50"
            >
              <div className="mr-4 p-2 bg-blue-500/10 rounded-full">
                {isProvisioningCircle ? (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                ) : (
                  <Zap className="w-5 h-5 text-blue-500" />
                )}
              </div>
              <div className="flex-1 text-left">
                <span className="font-semibold block text-foreground">Circle USDC Wallet</span>
                <p className="text-xs text-muted-foreground">
                  {isProvisioningCircle ? "Opening secure portal..." : "Requires Test PIN Setup"}
                </p>
              </div>
              {!isProvisioningCircle && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
            </button>
          )}

          {needsFBO && (
            <button
              onClick={handleFBOSetup}
              disabled={isProvisioningCircle || isProvisioningFBO}
              className="w-full group flex items-center p-4 bg-secondary/50 hover:bg-secondary border border-border rounded-xl transition-all disabled:opacity-50"
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
                <p className="text-xs text-muted-foreground">Link banking</p>
              </div>
            </button>
          )}
        </div>

        <div className="p-4 bg-muted/30 border-t border-border/10 flex justify-center opacity-50">
          <Activity className="w-3 h-3 text-primary mr-2" />
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold">IDIA Data - Unlicensed Safe Harbor</span>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
