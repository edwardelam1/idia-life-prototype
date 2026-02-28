import React, { useState } from 'react';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Mail, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface AuthSelectionProps {
  onOAuthSuccess: (profileData: {
    first_name: string;
    last_name: string;
    email: string;
    kyc_tier: number;
    auth_provider: string;
    is_verified: boolean;
  }) => void;
  onManualSelection: () => void;
}

const AuthSelection: React.FC<AuthSelectionProps> = ({ onOAuthSuccess, onManualSelection }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleNativeAuth = async (provider: 'apple' | 'google') => {
    setIsAuthenticating(true);
    try {
      const result = await SocialLogin.login({
        provider,
        options: { scopes: ['email', 'name'] },
      });

      if (result.result) {
        const r = result.result as any;
        const profileData = {
          first_name: r.givenName || r.name?.split(' ')[0] || '',
          last_name: r.familyName || r.name?.split(' ').slice(1).join(' ') || '',
          email: r.email || '',
          kyc_tier: 1,
          auth_provider: provider,
          is_verified: true,
        };
        onOAuthSuccess(profileData);
      }
    } catch (err) {
      console.error('Native Auth Error:', err);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 border-2 border-primary/20">
        <ShieldCheck className="w-10 h-10 text-primary" />
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Identity Mobilization</h2>
        <p className="text-muted-foreground">
          Choose how you want to establish your bio-sovereign identity.
        </p>
      </div>

      <div className="w-full max-w-xs space-y-3">
        {/* Apple */}
        <Button
          onClick={() => handleNativeAuth('apple')}
          disabled={isAuthenticating}
          className="w-full h-14 bg-white text-black hover:bg-slate-100 rounded-2xl font-bold"
        >
          {isAuthenticating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Continue with Apple
            </>
          )}
        </Button>

        {/* Google */}
        <Button
          onClick={() => handleNativeAuth('google')}
          disabled={isAuthenticating}
          className="w-full h-14 bg-slate-900 text-white hover:bg-slate-800 border border-slate-800 rounded-2xl font-bold"
        >
          {isAuthenticating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </>
          )}
        </Button>

        {/* Divider */}
        <div className="relative flex items-center py-2">
          <Separator className="flex-1" />
          <span className="px-4 text-xs text-muted-foreground">Or</span>
          <Separator className="flex-1" />
        </div>

        {/* Email */}
        <Button
          onClick={onManualSelection}
          variant="outline"
          className="w-full h-14 rounded-2xl font-bold"
        >
          <Mail className="w-5 h-5 mr-2" />
          Continue with Email
        </Button>
      </div>
    </div>
  );
};

export default AuthSelection;
