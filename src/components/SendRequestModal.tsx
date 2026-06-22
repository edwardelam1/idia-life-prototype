import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, ShieldCheck, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SendRequestModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { toast } = useToast();

  const handleLaunchMetaMask = async () => {
    console.log("[WalletSync][START] Initiating secure export and routing to MetaMask");

    try {
      // 1. Retrieve the secure credential 
      // (Replace this with the actual secure retrieval of the user's private key or seed phrase from your vault)
      const secureCredential = "YOUR_SECURE_PRIVATE_KEY_OR_SEED"; 

      // 2. Securely copy the key to the device clipboard
      await navigator.clipboard.writeText(secureCredential);
      
      toast({ 
        title: "Key Copied Securely", 
        description: "Paste this into MetaMask's 'Import Account' screen." 
      });

      // 3. Wake up the MetaMask native app
      console.log("[WalletSync][DEEP_LINK] Waking up MetaMask native shell");
      
      // The raw metamask:// scheme forces the OS to open the app natively
      window.location.href = "metamask://";
      
      onClose();
    } catch (error) {
      console.error("[WalletSync][FATAL_FAIL] Failed to execute sync:", error);
      toast({ 
        title: "Launch Failed", 
        description: "Could not securely copy the wallet credentials or route to the app.", 
        variant: "destructive" 
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-[#F6851B]" />
            <span>Send & Receive USDC</span>
          </DialogTitle>
          <DialogDescription className="text-sm mt-2">
            Manage your sovereign funds natively and securely.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-2 space-y-4">
          <Card className="bg-slate-50 dark:bg-muted/20 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-none mt-2">
            <CardContent className="p-5 flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-2">
                <ShieldCheck className="w-7 h-7 text-[#F6851B]" />
              </div>
              
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                Secure Native Routing
              </h3>
              
              <p className="text-sm text-muted-foreground leading-relaxed">
                To send, receive, or buy USDC, you will be securely routed to the native MetaMask application on your device.
              </p>
              
              <div className="text-xs text-left text-muted-foreground bg-white dark:bg-background p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 w-full mt-2">
                <strong className="text-slate-700 dark:text-slate-300 block mb-1">First Time Setup:</strong> 
                Your IDIA wallet key will be temporarily copied to your clipboard. If your wallet is not yet linked, paste it into MetaMask's <strong>"Import Account"</strong> screen.
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={handleLaunchMetaMask} 
            className="w-full h-14 rounded-xl bg-[#F6851B] hover:bg-[#E2761B] text-white text-base font-semibold mt-2 transition-all shadow-sm"
          >
            Launch MetaMask <ExternalLink className="w-5 h-5 ml-2" />
          </Button>
          
          <Button 
            onClick={onClose} 
            variant="ghost" 
            className="w-full h-10 text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SendRequestModal;