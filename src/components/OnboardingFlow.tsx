import React, { useState, useEffect } from 'react';
import { ShieldCheck, Fingerprint, Database, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import FriendAssistant from './FriendAssistant';
import { PrivacySettings } from './settings/PrivacySettings';

// --- SUB-COMPONENTS ---

interface OAuthOnboardingProps {
  onKYCCaptured: (data: any) => void;
}

const OAuthOnboarding: React.FC<OAuthOnboardingProps> = ({ onKYCCaptured }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleOAuth = async (provider: 'apple' | 'google') => {
    setIsAuthenticating(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      if (error) throw error;
    } catch (err) {
      console.error('OAuth Error:', err);
      setIsAuthenticating(false);
    }
  };

  // Listen for auth state to capture profile
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const user = session.user;
        const meta = user.user_metadata || {};
        const profileUpdate = {
          first_name: meta.full_name?.split(' ')[0] || meta.name?.split(' ')[0] || '',
          last_name: meta.full_name?.split(' ').slice(1).join(' ') || meta.name?.split(' ').slice(1).join(' ') || '',
          email: user.email || '',
          kyc_tier: 1,
          auth_provider: user.app_metadata?.provider || 'unknown',
          is_verified: true
        };
        onKYCCaptured(profileUpdate);
      }
    });
    return () => subscription.unsubscribe();
  }, [onKYCCaptured]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 border-2 border-primary/20">
        <ShieldCheck className="w-10 h-10 text-primary" />
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Identity Mobilization</h2>
        <p className="text-muted-foreground">Sign in securely to auto-verify your Tier 1 identity.</p>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <Button
          disabled={isAuthenticating}
          onClick={() => handleOAuth('apple')}
          className="w-full h-14 rounded-2xl font-bold"
          variant="outline"
        >
          Continue with Apple
        </Button>
        <Button
          disabled={isAuthenticating}
          onClick={() => handleOAuth('google')}
          className="w-full h-14 rounded-2xl font-bold"
        >
          Continue with Google
        </Button>
      </div>
    </div>
  );
};

interface KYCAutoConfirmationProps {
  capturedData: any;
  onConfirm: () => void;
}

const KYCAutoConfirmation: React.FC<KYCAutoConfirmationProps> = ({ capturedData, onConfirm }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
    <div className="flex items-center gap-4 mb-8">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary border-2 border-primary/20">
        {capturedData.first_name?.[0]}{capturedData.last_name?.[0]}
      </div>
      <div>
        <h3 className="text-lg font-bold text-foreground">Identity Verified</h3>
        <p className="text-sm text-muted-foreground">Source: {capturedData.auth_provider}</p>
      </div>
    </div>

    <div className="w-full max-w-sm space-y-4 mb-8">
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-muted border">
          <p className="text-xs text-muted-foreground mb-1">First Name</p>
          <p className="font-medium text-foreground">{capturedData.first_name}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted border">
          <p className="text-xs text-muted-foreground mb-1">Last Name</p>
          <p className="font-medium text-foreground">{capturedData.last_name}</p>
        </div>
      </div>
      <div className="p-3 rounded-lg bg-muted border">
        <p className="text-xs text-muted-foreground mb-1">Verified Email</p>
        <p className="font-medium text-foreground">{capturedData.email}</p>
      </div>
    </div>

    <Button onClick={onConfirm} className="w-full max-w-sm h-12 rounded-2xl font-bold">
      Confirm Identity
    </Button>
  </div>
);

interface BioKeyMintingProps {
  onMinted: () => void;
}

const BioKeyMinting: React.FC<BioKeyMintingProps> = ({ onMinted }) => {
  const [mintStatus, setMintStatus] = useState<'initializing' | 'syncing' | 'minted'>('initializing');

  useEffect(() => {
    const timer1 = setTimeout(() => setMintStatus('syncing'), 500);
    const timer2 = setTimeout(() => setMintStatus('minted'), 4000);
    const timer3 = setTimeout(onMinted, 6000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onMinted]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="relative w-32 h-32 mb-8">
        {/* Pulsing rings */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping"
            style={{
              animationDelay: `${i * 0.4}s`,
              animationDuration: '2s',
            }}
          />
        ))}
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-primary/10 border-2 border-primary/20">
          {mintStatus === 'minted' ? (
            <CheckCircle2 className="w-12 h-12 text-primary animate-bounce" />
          ) : (
            <Fingerprint className="w-12 h-12 text-primary animate-pulse" />
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-bold text-foreground transition-all duration-500">
          {mintStatus === 'minted' ? 'Bio-Key Minted' : 'Establishing Baseline'}
        </h3>
        <p className="text-sm text-muted-foreground transition-all duration-500">
          {mintStatus === 'syncing'
            ? 'Syncing Health Sensors...'
            : mintStatus === 'minted'
            ? 'Secure Enclave Locked'
            : 'Initializing...'}
        </p>
      </div>
    </div>
  );
};

// --- MASTER ORCHESTRATOR ---

interface OnboardingFlowProps {
  onComplete: () => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<'oauth' | 'confirm' | 'minting' | 'privacy'>('oauth');
  const [capturedData, setCapturedData] = useState<any>(null);
  const [isFriendVisible, setIsFriendVisible] = useState(true);

  const handleKYCCaptured = (data: any) => {
    setCapturedData(data);
    setStep('confirm');
  };

  const handleIdentityConfirmed = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update(capturedData).eq('user_id', user.id);
    }
    setStep('minting');
  };

  const stepsArray = ['oauth', 'confirm', 'minting', 'privacy'] as const;

  return (
    <div className="min-h-screen bg-background relative">
      {/* Friend AI Guide */}
      <FriendAssistant
        isVisible={isFriendVisible}
        onClose={() => setIsFriendVisible(false)}
        trigger="onboarding"
      />

      <div className="relative">
        {step === 'oauth' && <OAuthOnboarding onKYCCaptured={handleKYCCaptured} />}

        {step === 'confirm' && capturedData && (
          <KYCAutoConfirmation capturedData={capturedData} onConfirm={handleIdentityConfirmed} />
        )}

        {step === 'minting' && (
          <BioKeyMinting onMinted={() => setStep('privacy')} />
        )}

        {step === 'privacy' && (
          <div className="flex flex-col items-center min-h-[60vh] px-6 pt-8">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Data Sovereignty</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6 text-center">
              Your identity is secured. Now, configure your ecosystem permissions.
            </p>

            <div className="w-full max-w-md mb-6">
              <PrivacySettings />
            </div>

            <Button onClick={onComplete} className="w-full max-w-sm h-12 rounded-2xl font-bold">
              Enter IDIA Life
            </Button>
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      <div className="fixed bottom-8 left-0 right-0 flex justify-center">
        <div className="flex items-center gap-2">
          {stepsArray.map((s, i) => {
            const isActive = s === step;
            const isPast = stepsArray.indexOf(step) > i;
            return (
              <div
                key={s}
                className={`h-2 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'w-8 bg-primary'
                    : isPast
                    ? 'w-2 bg-primary/50'
                    : 'w-2 bg-muted-foreground/20'
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
