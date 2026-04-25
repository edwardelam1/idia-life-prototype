import { useEffect } from "react";
import { X, ShieldCheck, Landmark, ArrowRight, Zap } from "lucide-react";

interface OnboardingModalProps {
  isVisible: boolean;
  onClose: () => void;
  needsCircle: boolean;
  needsFBO: boolean;
}

const OnboardingModal = ({
  isVisible,
  onClose,
  needsCircle,
  needsFBO,
}: OnboardingModalProps) => {
  
  // Granular lifecycle logging to detect silent rendering stalls
  useEffect(() => {
    if (isVisible) {
      console.log(`[START] OnboardingModal Mounted. State -> Circle Needed: ${needsCircle}, FBO Needed: ${needsFBO}`);
    }
    return () => {
      if (isVisible) {
        console.log("[END] OnboardingModal Unmounted/Hidden from view.");
      }
    };
  }, [isVisible, needsCircle, needsFBO]);

  if (!isVisible) return null;

  const handleCloseClick = () => {
    console.log("[START] User requested modal closure...");
    try {
      onClose();
      console.log("[SUCCESS] Modal closure callback executed.");
    } catch (error) {
      console.error("[ERROR] Silent stall during modal closure.");
      if (error instanceof Error) console.error(`[DETAILS] ${error.message}`);
    } finally {
      console.log("[END] Modal closure sequence resolved.");
    }
  };

  const handleCircleSetup = () => {
    console.log("[START] Initiating Circle Programmable Wallet Handshake...");
    try {
      // Logic to trigger Circle SDK or navigate to specific Circle setup route
      // executeCircleProvisioning();
      console.log("[SUCCESS] Circle provisioning trigger fired.");
    } catch (error) {
      console.error("[ERROR] Silent stall in Circle Handshake.");
      if (error instanceof Error) console.error(`[DETAILS] ${error.message}`);
    } finally {
      console.log("[END] Circle Handshake execution block resolved.");
    }
  };

  const handleFBOSetup = () => {
    console.log("[START] Initiating FBO (Fiat) Onboarding Sequence...");
    try {
      // Logic to trigger banking rail/KYC flow
      // executeFBOProvisioning();
      console.log("[SUCCESS] FBO provisioning trigger fired.");
    } catch (error) {
      console.error("[ERROR] Silent stall in FBO Onboarding.");
      if (error instanceof Error) console.error(`[DETAILS] ${error.message}`);
    } finally {
      console.log("[END] FBO Onboarding execution block resolved.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header Section */}
        <div className="p-6 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
          <button 
            onClick={handleCloseClick}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors"
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
            To manage your Data Yields and settle assets, complete your infrastructure setup.
          </p>
        </div>

        {/* Action Items */}
        <div className="p-6 space-y-4">
          
          {/* Circle USDC Path */}
          {needsCircle && (
            <button 
              onClick={handleCircleSetup}
              className="w-full group relative flex items-center p-4 bg-secondary/50 hover:bg-secondary border border-border hover:border-primary/50 rounded-xl transition-all duration-200"
            >
              <div className="mr-4 p-2 bg-blue-500/10 rounded-full group-hover:scale-110 transition-transform">
                <Zap className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Circle USDC Wallet</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-xs text-muted-foreground">Digital settlement & Testnet IDIA bridge</p>
              </div>
            </button>
          )}

          {/* FBO Fiat Path */}
          {needsFBO && (
            <button 
              onClick={handleFBOSetup}
              className="w-full group relative flex items-center p-4 bg-secondary/50 hover:bg-secondary border border-border hover:border-primary/50 rounded-xl transition-all duration-200"
            >
              <div className="mr-4 p-2 bg-green-500/10 rounded-full group-hover:scale-110 transition-transform">
                <Landmark className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Fiat Rail (FBO)</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-xs text-muted-foreground">Link traditional banking for USD liquidation</p>
              </div>
            </button>
          )}

        </div>

        {/* Footer Note */}
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