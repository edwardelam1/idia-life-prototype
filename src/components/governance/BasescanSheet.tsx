import React, { useEffect, useState } from "react";
import { X, ExternalLink, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface BasescanSheetProps {
  open: boolean;
  onClose: () => void;
  contract: string;
}

/**
 * In-app viewer for the Basescan token page.
 * Works in every shell (iOS custom ContentView WebView, Android Capacitor, web) because
 * it never leaves the app: an embedded frame with a guaranteed exit, plus a details
 * fallback when Basescan refuses to be embedded.
 */
const BasescanSheet: React.FC<BasescanSheetProps> = ({ open, onClose, contract }) => {
  const [frameFailed, setFrameFailed] = useState(false);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = `https://basescan.org/token/${contract}`;

  useEffect(() => {
    if (!open) return;
    setFrameFailed(false);
    setFrameLoaded(false);
    setCopied(false);
  }, [open, contract]);

  useEffect(() => {
    if (!open || frameLoaded || frameFailed) return;
    // If the embed is blocked, nothing ever loads — surface the fallback instead of a blank sheet.
    const timer = window.setTimeout(() => setFrameFailed(true), 6000);
    return () => window.clearTimeout(timer);
  }, [open, frameLoaded, frameFailed]);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(contract);
      setCopied(true);
      toast.success("Contract address copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy address");
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-xl flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-2xl h-full max-h-[90vh] flex flex-col rounded-[2rem] border border-border bg-card shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-border bg-gradient-to-br from-[hsl(178,42%,32%)]/10 to-transparent flex items-center gap-3 shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold tracking-tight truncate">IDIA Token · Basescan</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest truncate">
              {contract.slice(0, 10)}…{contract.slice(-6)}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Basescan view"
            className="p-2 rounded-full hover:bg-muted/60 transition-colors shrink-0"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden bg-muted/20 relative">
          {!frameFailed ? (
            <iframe
              title="Basescan token explorer"
              src={url}
              onLoad={() => setFrameFailed(false)}
              onError={() => setFrameFailed(true)}
              className="w-full h-full border-0 bg-white"
            />
          ) : (
            <div className="h-full overflow-y-auto p-6 flex flex-col items-center justify-center gap-5 text-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  IDIA Governance Token · Base Mainnet
                </p>
                <p className="mt-2 text-sm font-mono break-all text-foreground">{contract}</p>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest border border-border hover:bg-muted/60 transition-colors"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy Contract Address"}
              </button>
              <p className="text-xs text-muted-foreground max-w-sm">
                Basescan does not allow its explorer to be shown inside other apps. You can copy the
                address above, or open the explorer in your browser.
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[hsl(178,42%,32%)] underline text-sm font-semibold"
              >
                Open Basescan in browser <ExternalLink size={13} />
              </a>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border bg-background/60 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-widest bg-[hsl(178,42%,32%)] text-white hover:bg-[hsl(178,42%,25%)] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default BasescanSheet;
