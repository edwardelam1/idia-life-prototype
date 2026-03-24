import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Lock, AlertCircle } from 'lucide-react';

interface SSNCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ssn: string) => Promise<void>;
}

const SSN_REGEX = /^\d{3}-?\d{2}-?\d{4}$/;

function formatSSN(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

const SSNCollectionModal: React.FC<SSNCollectionModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [ssn, setSSN] = useState('');
  const [confirmSSN, setConfirmSSN] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError('');
    const cleanSSN = ssn.replace(/-/g, '');
    const cleanConfirm = confirmSSN.replace(/-/g, '');

    if (!SSN_REGEX.test(ssn)) {
      setError('Please enter a valid SSN (XXX-XX-XXXX)');
      return;
    }
    if (cleanSSN !== cleanConfirm) {
      setError('SSN entries do not match');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(cleanSSN);
      onClose();
    } catch (err) {
      setError('Failed to save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Social Security Number
          </DialogTitle>
          <DialogDescription>
            Required for regulatory compliance as a money transmitting application.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Lock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Your SSN is encrypted and hashed immediately. We never store it in plain text. This is required by federal regulations for financial services.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Social Security Number</Label>
            <Input
              value={ssn}
              onChange={(e) => setSSN(formatSSN(e.target.value))}
              placeholder="XXX-XX-XXXX"
              maxLength={11}
              type="password"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label>Confirm SSN</Label>
            <Input
              value={confirmSSN}
              onChange={(e) => setConfirmSSN(formatSSN(e.target.value))}
              placeholder="XXX-XX-XXXX"
              maxLength={11}
              type="password"
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Encrypting & Saving...' : 'Save Securely'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SSNCollectionModal;
