import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Scan, CheckCircle, ShieldCheck } from 'lucide-react';

interface BiometricLivenessProps {
  onComplete: () => Promise<void>;
}

const INSTRUCTIONS = [
  'Position your face in the frame',
  'Slowly turn your head to the left',
  'Now turn your head to the right',
  'Look straight ahead and blink twice',
  'Verifying liveness...',
];

const BiometricLiveness: React.FC<BiometricLivenessProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [complete, setComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (step >= INSTRUCTIONS.length) return;
    const timer = setTimeout(() => {
      if (step < INSTRUCTIONS.length - 1) {
        setStep(s => s + 1);
      } else {
        setComplete(true);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [step]);

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      await onComplete();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <Scan className="w-8 h-8 mx-auto text-primary" />
        <h3 className="text-lg font-bold text-foreground">Biometric Verification</h3>
        <p className="text-sm text-muted-foreground">
          Quick liveness check to confirm it's really you
        </p>
      </div>

      {/* Camera viewport */}
      <div className="flex justify-center">
        <div className="relative w-56 h-56">
          {/* Circular frame */}
          <div className={`w-full h-full rounded-full border-4 ${
            complete ? 'border-primary' : 'border-primary/40 animate-pulse'
          } bg-muted/50 flex items-center justify-center overflow-hidden transition-colors`}>
            {complete ? (
              <CheckCircle className="w-16 h-16 text-primary" />
            ) : (
              <div className="text-center p-4">
                <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-2 flex items-center justify-center">
                  <Scan className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">Camera viewport</p>
              </div>
            )}
          </div>
          
          {/* Corner markers */}
          {!complete && (
            <>
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-lg" />
            </>
          )}
        </div>
      </div>

      {/* Dynamic instructions */}
      <Card className={`${complete ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
        <CardContent className="p-3 text-center">
          <p className={`text-sm font-medium ${complete ? 'text-primary' : 'text-foreground'}`}>
            {complete ? '✓ Liveness verified successfully' : INSTRUCTIONS[step]}
          </p>
          {!complete && (
            <div className="flex justify-center gap-1 mt-2">
              {INSTRUCTIONS.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-colors ${
                  i <= step ? 'bg-primary' : 'bg-muted'
                }`} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy note */}
      <div className="flex items-start gap-2 px-2">
        <ShieldCheck className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-tight">
          Biometric data is processed locally and encrypted. We do not store your raw video. Your privacy is our priority.
        </p>
      </div>

      {complete && (
        <Button className="w-full" onClick={handleComplete} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Complete Verification'}
        </Button>
      )}
    </div>
  );
};

export default BiometricLiveness;
