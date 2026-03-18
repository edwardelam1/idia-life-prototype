import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Shield, Loader2 } from "lucide-react";

interface DataSourceModalProps {
  isOpen: boolean;
  source: any;
  onClose: () => void;
  onConsent: () => void;
}

export default function DataSourceModal({ isOpen, source, onClose, onConsent }: DataSourceModalProps) {
  // Initialize toggles based on the source's dataTypes
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    source?.dataTypes?.reduce((acc: any, type: string) => ({ ...acc, [type]: true }), {}) || {},
  );
  const [isProcessing, setIsProcessing] = useState(false);

  if (!source) return null;

  const handleToggle = (key: string) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConsent = async () => {
    setIsProcessing(true);
    // Simulate native bridge API handshake
    await new Promise((r) => setTimeout(r, 1200));
    setIsProcessing(false);
    onConsent();
  };

  const Icon = source.icon;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#111827] border-white/10 text-white sm:max-w-md rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${source.bg} flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${source.color}`} />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">{source.name}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">Select data to sync</p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-2">
            <Shield className="w-5 h-5 text-[#4f8aff] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-100/70 leading-relaxed">
              Your data is encrypted locally. You maintain total sovereignty and can revoke connection access at any
              time.
            </p>
          </div>

          {source.dataTypes.map((type: string) => (
            <div
              key={type}
              className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl"
            >
              <span className="text-sm font-medium">{type}</span>
              <Switch
                checked={toggles[type]}
                onCheckedChange={() => handleToggle(type)}
                className="data-[state=checked]:bg-[#4f8aff]"
              />
            </div>
          ))}
        </div>

        <div className="p-6 pt-2 bg-[#111827]">
          <Button
            onClick={handleConsent}
            disabled={isProcessing}
            className="w-full h-14 bg-[#4f8aff] hover:bg-[#4f8aff]/90 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(79,138,255,0.2)]"
          >
            {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : "You have my consent"}
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full mt-2 text-muted-foreground hover:text-white hover:bg-white/5"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
