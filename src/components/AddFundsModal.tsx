
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  CreditCard, 
  Building2,
  CheckCircle,
  Plus,
  X
} from 'lucide-react';

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddFundsModal = ({ isOpen, onClose }: AddFundsModalProps) => {
  const [step, setStep] = useState<'select' | 'add-card' | 'success'>('select');
  const [cardType, setCardType] = useState<'debit' | 'credit'>('debit');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  const handleAddCard = () => {
    // Here you'll integrate with your payment API
    console.log('Adding card:', { cardType, cardNumber, expiryDate, cvv, cardholderName });
    setStep('success');
    
    // Reset form and close after success
    setTimeout(() => {
      setStep('select');
      setCardNumber('');
      setExpiryDate('');
      setCvv('');
      setCardholderName('');
      onClose();
    }, 2000);
  };

  if (step === 'success') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Card Added Successfully!</h3>
            <p className="text-gray-600">
              Your {cardType} card has been added and is ready to use.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (step === 'add-card') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Add {cardType === 'debit' ? 'Debit' : 'Credit'} Card</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setStep('select')}
                className="h-auto p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                maxLength={19}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input
                  id="expiry"
                  placeholder="MM/YY"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  maxLength={5}
                />
              </div>
              <div>
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  placeholder="123"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  maxLength={4}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="cardholder">Cardholder Name</Label>
              <Input
                id="cardholder"
                placeholder="John Doe"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
              />
            </div>

            <Button 
              onClick={handleAddCard}
              className="w-full bg-teal-500 hover:bg-teal-600"
              disabled={!cardNumber || !expiryDate || !cvv || !cardholderName}
            >
              Add Card
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Funds</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            Choose how you'd like to add funds to your IDIA wallet:
          </p>

          <Card 
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => {
              setCardType('debit');
              setStep('add-card');
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Debit Card</h3>
                  <p className="text-sm text-gray-600">Add funds directly from your bank account</p>
                </div>
                <Plus className="w-5 h-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => {
              setCardType('credit');
              setStep('add-card');
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Credit Card</h3>
                  <p className="text-sm text-gray-600">Add funds using your credit card</p>
                </div>
                <Plus className="w-5 h-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddFundsModal;
