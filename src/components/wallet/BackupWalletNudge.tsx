import { X, ShieldAlert, KeyRound, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BackupWalletNudgeProps {
  isVisible: boolean;
  onDismiss: () => void;
  onBackUp: () => void;
}

const BackupWalletNudge = ({ isVisible, onDismiss, onBackUp }: BackupWalletNudgeProps) => {
  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-wallet-nudge-title"
    >
      <div
        className="relative w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="p-6 bg-gradient-to-br from-[hsl(178,42%,32%)] to-[hsl(178,42%,42%)] text-primary-foreground">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/15 rounded-xl">
              <ShieldAlert className="w-6 h-6 text-amber-300" />
            </div>
            <h2 id="backup-wallet-nudge-title" className="text-lg font-black tracking-tight">
              Back Up Your Vault
            </h2>
          </div>
          <p className="text-xs opacity-80 leading-relaxed">
            Your recovery phrase is the only way to restore this wallet. IDIA cannot recover it for you.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-muted border border-border">
            <KeyRound className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Create an encrypted backup file protected by a password you choose. It takes less than a minute.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={onDismiss} className="rounded-xl">
              Later
            </Button>
            <Button onClick={onBackUp} className="rounded-xl">
              Back Up Now
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackupWalletNudge;
