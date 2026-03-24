import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Shield, Clock, Sparkles } from 'lucide-react';

interface VerificationSuccessProps {
  onDone: () => Promise<void>;
}

const VerificationSuccess: React.FC<VerificationSuccessProps> = ({ onDone }) => {
  const [showCelebration, setShowCelebration] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowCelebration(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleDone = async () => {
    setSubmitting(true);
    try {
      await onDone();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-center pt-8">
      {/* Celebration animation */}
      <div className="relative inline-block">
        <div className={`w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto transition-transform ${
          showCelebration ? 'scale-110' : 'scale-100'
        }`}>
          <CheckCircle className={`w-12 h-12 text-primary transition-all ${
            showCelebration ? 'animate-bounce' : ''
          }`} />
        </div>
        {showCelebration && (
          <>
            <Sparkles className="w-5 h-5 text-primary absolute -top-1 -right-1 animate-ping" />
            <Sparkles className="w-4 h-4 text-primary absolute -bottom-1 -left-1 animate-ping" style={{ animationDelay: '0.3s' }} />
            <Sparkles className="w-3 h-3 text-primary absolute top-2 -left-3 animate-ping" style={{ animationDelay: '0.6s' }} />
          </>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-foreground">Identity Submitted!</h2>
        <p className="text-sm text-muted-foreground">
          Thank you for verifying your identity. We're reviewing your documents now.
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">Verification Pending</p>
              <p className="text-xs text-muted-foreground">Typically verified in &lt; 5 minutes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <p className="text-sm font-medium text-foreground">What happens next?</p>
          </div>
          <ul className="text-xs text-muted-foreground space-y-2 text-left">
            <li className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-primary">1</span>
              Our system reviews your documents automatically
            </li>
            <li className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-primary">2</span>
              You'll receive a notification once verified
            </li>
            <li className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-primary">3</span>
              All Tier 2 features unlock instantly
            </li>
          </ul>
        </CardContent>
      </Card>

      <Button className="w-full" onClick={handleDone} disabled={submitting}>
        {submitting ? 'Processing...' : 'Return to Wallet'}
      </Button>
    </div>
  );
};

export default VerificationSuccess;
