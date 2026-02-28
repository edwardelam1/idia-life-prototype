import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ShieldCheck, 
  Loader2, 
  Landmark,
  Fingerprint,
  Lock
} from 'lucide-react';

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bioKeyStatus?: string;
  kycTier?: number;
}

const AddFundsModal = ({ isOpen, onClose, bioKeyStatus = 'STABLE', kycTier = 1 }: AddFundsModalProps) => {
  const [amount, setAmount] = useState('100.00');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDeposit = kycTier >= 1 && bioKeyStatus === 'STABLE';

  const handleDeposit = async () => {
    setIsProcessing(true);
    setError(null);

    // Simulate processing delay
    setTimeout(() => {
      console.log('Deposit authorized:', { amount: parseFloat(amount), method: 'WORLDPAY_HPP' });
      setIsProcessing(false);
      onClose();
    }, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-slate-950 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Landmark className="w-5 h-5 text-indigo-400" />
            Add Funds
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {!canDeposit ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <Lock className="w-7 h-7 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Security Lock Active</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Deposits are disabled. Ensure your Bio-Key is stable and KYC Tier 1 is verified in the Life App before adding fiat funds.
              </p>
            </div>
          ) : (
            <>
              {/* Amount Input */}
              <div className="space-y-2">
                <Label className="text-slate-400 text-xs font-medium">
                  Deposit Amount (USD)
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-slate-500 font-mono">$</span>
                  <Input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-16 bg-slate-900 border-slate-800 text-2xl font-mono pl-10 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Payment Gateway Info */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">Worldpay Secure</p>
                    <p className="text-xs text-slate-500">PCI-DSS Compliant Egress</p>
                  </div>
                </div>
                <Lock className="w-4 h-4 text-slate-600" />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              {/* Authorize Button */}
              <Button
                onClick={handleDeposit}
                disabled={isProcessing || !amount}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Fingerprint className="w-5 h-5 mr-2" />
                    Authorize with Bio-Key
                  </>
                )}
              </Button>

              {/* Footer Info */}
              <div className="space-y-1.5 pt-1">
                <p className="text-xs text-slate-500 text-center">
                  Funds will settle in your FBO account
                </p>
                <p className="text-xs text-slate-600 text-center leading-relaxed">
                  By authorizing, you initiate a secure ingress move to the IDIA Treasury.
                  Digital value will be available in your IDIA-USD ledger immediately upon bank confirmation.
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddFundsModal;
