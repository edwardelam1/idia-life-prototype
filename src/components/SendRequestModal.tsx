import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownLeft, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWalletBalance } from '@/hooks/useWalletBalance';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'send' | 'receive';
}

const SendRequestModal: React.FC<Props> = ({ isOpen, onClose, defaultTab = 'send' }) => {
  const [activeTab, setActiveTab] = useState<'send' | 'receive'>(defaultTab);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const { toast } = useToast();
  
  // Pulls the user's unified USDC balance and public address
  const { balance, usdcAddress } = useWalletBalance();

  // Dynamically generates a generic QR code for the user's wallet address
  const qrImageUrl = useMemo(() => {
    if (!usdcAddress) return '';
    // Formats as a standard Ethereum URI
    const encoded = encodeURIComponent(`ethereum:${usdcAddress}`);
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encoded}`;
  }, [usdcAddress]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Address copied to clipboard" });
  };

  const handleSendDeepLink = () => {
    if (!recipient || !amount) {
      toast({ title: "Error", description: "Please enter a recipient and amount", variant: "destructive" });
      return;
    }

    // Deep link to MetaMask dApp browser to execute the transfer natively.
    // We pass the intended transaction details via URL parameters so IDIA Life 
    // can auto-hydrate them once it opens inside the MetaMask sandbox.
    const dAppUrl = `https://life.thebigidia.com/transfer?to=${recipient}&amount=${amount}`;
    const metaMaskDeepLink = `https://metamask.app.link/dapp/${dAppUrl.replace('https://', '')}`;
    
    console.log("[SendRequestModal][DeepLink] Bouncing to MetaMask:", metaMaskDeepLink);
    window.location.href = metaMaskDeepLink;
    onClose();
  };

  const handleClose = () => {
    setRecipient('');
    setAmount('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {activeTab === 'send' ? <ArrowUpRight className="w-5 h-5 text-teal-600" /> : <ArrowDownLeft className="w-5 h-5 text-teal-600" />}
            <span>{activeTab === 'send' ? 'Send USDC' : 'Receive USDC'}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-2">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'send' | 'receive')}>
            <TabsList className="grid w-full grid-cols-2 bg-muted/50 rounded-xl p-1">
              <TabsTrigger value="send" className="rounded-lg">Send</TabsTrigger>
              <TabsTrigger value="receive" className="rounded-lg">Receive</TabsTrigger>
            </TabsList>

            {/* ─── SEND TAB ─── */}
            <TabsContent value="send" className="space-y-4 mt-4 animate-in fade-in slide-in-from-left-2">
              <div className="flex justify-between items-center bg-slate-50 dark:bg-muted/20 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <Label className="text-muted-foreground text-xs uppercase tracking-widest">Available Balance</Label>
                <div className="text-sm font-black">{balance.usdc_balance.toFixed(2)} USDC</div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipient" className="text-xs uppercase tracking-widest text-muted-foreground ml-1">Recipient Address</Label>
                <Input
                  id="recipient"
                  placeholder="0x..."
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="font-mono text-sm h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-xs uppercase tracking-widest text-muted-foreground ml-1">Amount (USDC)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-12 rounded-xl text-lg font-bold"
                />
              </div>

              <Button 
                onClick={handleSendDeepLink} 
                className="w-full h-12 rounded-xl bg-[#F6851B] hover:bg-[#E2761B] text-white mt-4 transition-all"
              >
                Sign in MetaMask <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </TabsContent>

            {/* ─── RECEIVE TAB ─── */}
            <TabsContent value="receive" className="space-y-4 mt-4 animate-in fade-in slide-in-from-right-2">
              <Card className="border-none shadow-none bg-slate-50 dark:bg-muted/20 rounded-2xl">
                <CardContent className="p-6 flex flex-col items-center space-y-4">
                  {usdcAddress ? (
                    <>
                      <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                        <img
                          src={qrImageUrl}
                          alt="Wallet QR Code"
                          className="w-48 h-48 rounded-lg"
                        />
                      </div>
                      <div className="text-center space-y-2 w-full">
                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Your Base Wallet Address</Label>
                        <div className="flex items-center justify-between p-3 bg-white dark:bg-background rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                          <code className="text-xs font-mono truncate mr-2 text-slate-700 dark:text-slate-300">
                            {usdcAddress.slice(0, 12)}...{usdcAddress.slice(-10)}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(usdcAddress)}
                            className="h-8 w-8 p-0 shrink-0 hover:bg-teal-50 hover:text-teal-600"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      No wallet connected.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SendRequestModal;