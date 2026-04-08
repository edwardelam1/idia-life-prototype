import { useState } from 'react';
import { Fingerprint, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SovereignAuthProps {
  onVerified: () => void;
}

const SovereignAuth = ({ onVerified }: SovereignAuthProps) => {
  const [verifying, setVerifying] = useState(false);
  const [stage, setStage] = useState<'idle' | 'scanning' | 'verified'>('idle');

  const handleVerify = async () => {
    setVerifying(true);
    setStage('scanning');

    // Simulate biometric challenge + pattern-of-life check
    await new Promise((r) => setTimeout(r, 2000));
    setStage('verified');
    await new Promise((r) => setTimeout(r, 800));
    onVerified();
  };

  return (
    <div className="p-4 pb-24 flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="rounded-3xl border border-white/20 bg-card/60 backdrop-blur-xl p-8 max-w-sm w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${
            stage === 'scanning'
              ? 'bg-[hsl(28,80%,55%)]/20 animate-pulse'
              : stage === 'verified'
              ? 'bg-[hsl(142,71%,45%)]/20'
              : 'bg-muted'
          }`}>
            {stage === 'verified' ? (
              <ShieldCheck className="w-10 h-10 text-[hsl(142,71%,45%)]" />
            ) : (
              <Fingerprint className={`w-10 h-10 transition-colors ${
                stage === 'scanning' ? 'text-[hsl(28,80%,55%)] animate-pulse' : 'text-muted-foreground'
              }`} />
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-foreground mb-1">Sovereign Auth</h2>
          <p className="text-xs text-muted-foreground">
            {stage === 'idle' && 'Biometric verification required for Pure Alpha access.'}
            {stage === 'scanning' && 'Verifying pattern of life...'}
            {stage === 'verified' && 'Identity confirmed. Access granted.'}
          </p>
        </div>

        {stage === 'idle' && (
          <>
            <div className="rounded-lg bg-muted/50 p-3 text-left space-y-1.5">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <AlertTriangle className="w-3 h-3 text-[hsl(28,80%,55%)]" />
                Pattern of Life anomaly check
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Fingerprint className="w-3 h-3 text-[hsl(178,42%,32%)]" />
                FaceID / Biometric challenge
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <ShieldCheck className="w-3 h-3 text-[hsl(270,60%,50%)]" />
                Bio-Key signature validation
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-[hsl(270,60%,50%)] to-[hsl(270,60%,35%)] text-white border-0"
              onClick={handleVerify}
              disabled={verifying}
            >
              <Fingerprint className="w-4 h-4 mr-2" />
              Verify Identity
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default SovereignAuth;
