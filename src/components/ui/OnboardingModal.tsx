import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, ShieldCheck, Landmark, ArrowRight, Zap, Loader2, Activity, AlertCircle, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ConnectButton } from "@rainbow-me/rainbowkit";

interface OnboardingModalProps {
  isVisible: boolean;
  onClose: () => void;
  needsWallet: boolean;
  needsFBO: boolean;
}

const OnboardingModal = ({ isVisible, onClose, needsWallet, needsFBO }: OnboardingModalProps) => {
  const [isProvisioningFBO, setIsProvisioningFBO] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const navigate = useNavigate();

  if (!isVisible) return null;

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
            disabled={isProvisioningFBO}
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
          <p className="text-sm text-muted-foreground">Link your self-custodial infrastructure.</p>
        </div>

        <div className="p-6 space-y-4">
          {loadError && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-2 text-xs text-red-400 font-mono font-bold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{loadError}</span>
            </div>
          )}

          {needsWallet && (
            <ConnectButton.Custom>
              {({ account, chain, openConnectModal, mounted }) => {
                const ready = mounted;
                const connected = ready && account && chain;

                return (
                  <button
                    onClick={() => {
                      console.log(`\n========== [START] Onboarding: Self-Custody Handshake ==========`);
                      openConnectModal();
                    }}
                    type="button"
                    className="w-full group relative flex items-center p-4 bg-secondary/50 hover:bg-secondary border border-border hover:border-primary/50 rounded-xl transition-all duration-200"
                  >
                    <div className="mr-4 p-2 bg-blue-500/10 rounded-full">
                      <Zap className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1 text-left">
                      <span className="font-semibold block text-foreground">
                        {connected ? "Vault Authenticated" : "Link Private Vault"}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {connected ? account.displayName : "External Self-Custody (MetaMask/Coinbase)"}
                      </p>
                    </div>
                    {!connected && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
                  </button>
                );
              }}
            </ConnectButton.Custom>
          )}

          {needsFBO && (
            <button
              onClick={handleFBOSetup}
              disabled={isProvisioningFBO}
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
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold">IDIA Data - Sovereign Infrastructure</span>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
