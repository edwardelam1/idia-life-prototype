import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, ShieldCheck, Wallet, ArrowUpRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SendRequestModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { toast } = useToast();

  const handleLaunchMetaMask = async () => {
    try {
      // Securely copy the credential to clipboard first
      const secureCredential = "YOUR_SECURE_PRIVATE_KEY_OR_SEED"; 
      await navigator.clipboard.writeText(secureCredential);
      
      toast({ title: "Key Copied", description: "Paste this into MetaMask 'Import Account'." });

      // Using only the custom scheme avoids the dApp browser
      window.location.href = "metamask://";
      onClose();
    } catch (error) {
      toast({ title: "Launch Failed", variant: "destructive" });
    }
  };

  const handleSendUSDC = () => {
    // USDC Contract Address on Base
    const usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    const amount = "1.00"; // Example
    const recipient = "0x..."; // Your recipient logic here
    
    // Convert to 6 decimals for USDC
    const hexAmount = (parseFloat(amount) * 1_000_000).toString(16);

    // ethereum: URI triggers native wallet transaction UI, bypassing the dApp browser
    const uri = `ethereum:${usdcAddress}/transfer?address=${recipient}&uint256=0x${hexAmount}`;
    
    window.location.href = uri;
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-[#F6851B]" />
            <span>Manage USDC</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-2 space-y-4">
          <Card className="bg-slate-50 border-slate-100 rounded-2xl shadow-none">
            <CardContent className="p-5 text-center space-y-3">
              <ShieldCheck className="w-10 h-10 text-[#F6851B] mx-auto" />
              <h3 className="font-semibold">Native Wallet Control</h3>
              <p className="text-xs text-muted-foreground">
                IDIA Life routes transactions directly to your native MetaMask wallet interface, bypassing web browsers.
              </p>
            </CardContent>
          </Card>

          <Button 
            onClick={handleLaunchMetaMask} 
            className="w-full h-12 rounded-xl bg-[#F6851B] hover:bg-[#E2761B] text-white"
          >
            Launch MetaMask <ExternalLink className="w-4 h-4 ml-2" />
          </Button>

          <Button 
            onClick={handleSendUSDC} 
            variant="outline"
            className="w-full h-12 rounded-xl border-teal-600 text-teal-700 hover:bg-teal-50"
          >
            Send USDC <ArrowUpRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SendRequestModal;