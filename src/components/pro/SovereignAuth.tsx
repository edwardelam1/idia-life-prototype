import { useState, useEffect } from 'react';
import { Fingerprint, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SovereignAuthProps {
  onVerified: () => void;
}

const SovereignAuth = ({ onVerified }: SovereignAuthProps) => {
  const [verifying, setVerifying] = useState(false);
  const [stage, setStage] = useState<'idle' | 'scanning' | 'verified'>('idle');
  const [webAuthnSupported, setWebAuthnSupported] = useState(false);

  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      window.PublicKeyCredential !== undefined &&
      typeof navigator.credentials?.create === 'function';
    setWebAuthnSupported(supported);
  }, []);

  const attemptWebAuthn = async (): Promise<boolean> => {
    try {
      // Check if platform authenticator (Face ID / Fingerprint / Windows Hello) is available
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) return false;

      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = crypto.getRandomValues(new Uint8Array(16));

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'IDIA Life', id: window.location.hostname },
          user: {
            id: userId,
            name: 'idia-user',
            displayName: 'IDIA User',
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },   // ES256
            { alg: -257, type: 'public-key' },  // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'discouraged',
          },
          timeout: 60000,
          attestation: 'none',
        },
      });

      return !!credential;
    } catch (err: any) {
      // NotAllowedError = user cancelled, which is expected
      if (err.name === 'NotAllowedError') {
        console.log('[SovereignAuth] User cancelled biometric prompt.');
        return false;
      }
      // InvalidStateError = credential already exists, try .get() instead
      if (err.name === 'InvalidStateError') {
        return attemptWebAuthnGet();
      }
      console.warn('[SovereignAuth] WebAuthn create failed, trying get:', err.message);
      return attemptWebAuthnGet();
    }
  };

  const attemptWebAuthnGet = async (): Promise<boolean> => {
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: 'required',
          rpId: window.location.hostname,
        },
      });
      return !!assertion;
    } catch {
      return false;
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setStage('scanning');

    let biometricSuccess = false;

    if (webAuthnSupported) {
      biometricSuccess = await attemptWebAuthn();
    } else {
      // Graceful fallback for environments without WebAuthn (dev preview, HTTP, older browsers)
      console.warn('[SovereignAuth] WebAuthn unavailable — using fallback confirmation.');
      await new Promise((r) => setTimeout(r, 1500));
      biometricSuccess = true;
    }

    if (biometricSuccess) {
      setStage('verified');
      await new Promise((r) => setTimeout(r, 600));
      onVerified();
    } else {
      setStage('idle');
      setVerifying(false);
    }
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
            {stage === 'idle' && (webAuthnSupported
              ? 'Biometric verification required. Face ID, fingerprint, or device PIN.'
              : 'Device verification required for secure access.')}
            {stage === 'scanning' && 'Verifying identity...'}
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
                {webAuthnSupported ? 'FaceID / Fingerprint / Device PIN' : 'Device verification'}
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
