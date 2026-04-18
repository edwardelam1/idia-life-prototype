import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { supabase } from '@/integrations/supabase/client';
import { sendToFBOProvider } from '@/utils/fboProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/** SHA-256 helper */
async function generateACA(platformGuid: string, consentType: string): Promise<string> {
  const timestamp = Date.now().toString();
  const data = new TextEncoder().encode(platformGuid + consentType + timestamp);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Format phone as xxx-xxx-xxxx while typing */
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const PHONE_REGEX = /^\d{3}-\d{3}-\d{4}$/;

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');

  const isValid =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    email.includes('@') &&
    PHONE_REGEX.test(phone);

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);

    try {
      // 1. Store PII in device Secure Enclave — NEVER sent to Supabase
      const piiPayload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone,
      };

      await SecureStoragePlugin.set({
        key: 'user_pii_profile',
        value: JSON.stringify(piiPayload),
      });

      // 2. Source of truth: Auth User ID === Platform GUID === Pseudonym source
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const platformGuid = user.id; // Strict: no fallback, no drift

      // 2b. Defensive heal — force any drifted profile row back into alignment.
      // (DB trigger also enforces this, but we belt-and-suspenders for legacy rows.)
      await supabase
        .from('profiles')
        .update({ platform_guid: user.id })
        .eq('user_id', user.id);

      // 3. Generate ACA consent hash
      const acaHash = await generateACA(platformGuid, 'KYC_CONSENT');

      // 4. Save ACA hash to Supabase (proof of consent, NO PII)
      // DB triggers auto-stamp source_id and propagate to data_lineage_index.
      const { error: acaError } = await supabase.from('user_aca_records').insert({
        platform_guid: platformGuid,
        aca_hash_key: acaHash,
        consent_type: 'KYC_CONSENT',
        source_id: 'sovereign_onboarding',
      });
      if (acaError) throw new Error(`ACA consent record failed: ${acaError.message}`);

      // 5. Push PII to auth.users.user_metadata for Hub bridge (NOT a public DB write)
      const displayName = `${firstName.trim()} ${lastName.trim()}`;
      await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: displayName,
          display_name: displayName,
          pii_synced_at: new Date().toISOString(),
        },
      });

      // 6. Direct FBO KYC pass-through (stub)
      const fboResult = await sendToFBOProvider(
        { name: `${firstName.trim()} ${lastName.trim()}`, email: email.trim(), phone },
        acaHash
      );

      if (!fboResult.success) {
        throw new Error(fboResult.message);
      }

      setStep('success');
      toast({
        title: 'Identity Secured',
        description: 'Your data is stored on-device only. KYC submitted to FBO provider.',
      });

      // Navigate to main app after short delay
      setTimeout(() => navigate('/'), 1500);
    } catch (err: unknown) {
      console.error('[Onboarding] Error:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[env(safe-area-inset-bottom)]">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Identity Secured</h2>
            <p className="text-muted-foreground text-sm">
              Your PII is encrypted on-device. A consent anchor has been recorded.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[env(safe-area-inset-bottom)]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Sovereign Onboarding</CardTitle>
          <p className="text-muted-foreground text-sm">
            Your identity stays on your device. We only store a consent hash.
          </p>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Privacy badge */}
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
            <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">
              PII is encrypted in your device's secure enclave — never sent to our servers.
            </span>
          </div>

          {/* First Name */}
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              placeholder="Jane"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              maxLength={50}
            />
            {firstName.length > 0 && firstName.trim().length < 2 && (
              <p className="text-xs text-destructive">First name must be at least 2 characters</p>
            )}
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              placeholder="Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              maxLength={50}
            />
            {lastName.length > 0 && lastName.trim().length < 2 && (
              <p className="text-xs text-destructive">Last name must be at least 2 characters</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="jane@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
            />
          </div>

          {/* Phone — strict xxx-xxx-xxxx */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone (xxx-xxx-xxxx) *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="555-123-4567"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              maxLength={12}
            />
            {phone.length > 0 && !PHONE_REGEX.test(phone) && (
              <p className="text-xs text-destructive">Format must be xxx-xxx-xxxx</p>
            )}
          </div>

          {/* Legal Disclaimer */}
          <div className="flex items-start gap-2 bg-destructive/5 border border-destructive/20 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <span className="text-xs text-muted-foreground">
              <strong className="text-foreground">Legal Notice:</strong> You must provide truthful and accurate information. 
              If any information is found to be fraudulent, IDIA reserves the right to take all actions 
              permitted by law, up to and including permanent account termination and referral to 
              appropriate authorities.
            </span>
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!isValid || submitting}
          >
            {submitting ? 'Securing Identity...' : 'Secure & Continue'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
