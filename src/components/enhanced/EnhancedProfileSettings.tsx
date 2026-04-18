import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEnhancedProfile } from '@/hooks/useEnhancedProfile';
import { useSecureProfile } from '@/hooks/useSecureProfile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, Shield, CreditCard, Clock, Lock } from 'lucide-react';

const EnhancedProfileSettings: React.FC = () => {
  const {
    profile,
    wallet,
    interests,
    availableInterests,
    loading,
    updating,
    updateProfile,
    updateInterests,
  } = useEnhancedProfile();

  const { pii, loading: piiLoading } = useSecureProfile();
  const { toast } = useToast();

  const [selectedInterests, setSelectedInterests] = useState<string[]>(interests.map((i) => i.id));
  const [authMeta, setAuthMeta] = useState<Record<string, any>>({});
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    setSelectedInterests(interests.map((i) => i.id));
  }, [interests]);

  // Pull display_name + avatar from auth.user_metadata (zero-PII rule on profiles)
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const meta = user?.user_metadata || {};
      setAuthMeta(meta);
      setDisplayName(meta.display_name || meta.full_name || '');
      setAvatarUrl(meta.avatar_url || '');
    });
  }, []);

  if (loading || piiLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  // Enclave-first PII; fall back to auth metadata if enclave unavailable (web/non-iOS)
  const enclaveAvailable = !!pii;
  const firstName = pii?.first_name || authMeta.first_name || '';
  const lastName = pii?.last_name || authMeta.last_name || '';
  const emailValue = pii?.email || profile.email || '';
  const phoneValue = pii?.phone || '';

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = pub.publicUrl;

      // Store in auth.user_metadata only — NOT in profiles
      await supabase.auth.updateUser({ data: { avatar_url: url } });
      setAvatarUrl(url);
      toast({ title: 'Avatar updated', description: 'Saved to your sovereign identity.' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveDisplayName = async () => {
    await supabase.auth.updateUser({ data: { display_name: displayName } });
    toast({ title: 'Display name saved' });
  };

  const handleInterestToggle = (interestId: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interestId) ? prev.filter((id) => id !== interestId) : [...prev, interestId],
    );
  };

  const saveInterests = () => updateInterests(selectedInterests);

  const getKycStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      pending: 'secondary',
      verified: 'default',
      rejected: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getAccountTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      personal: 'Personal',
      business: 'Business',
      'non-profit': 'Non-Profit',
    };
    return <Badge variant="outline">{labels[type] || type}</Badge>;
  };

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sovereign Profile</h1>
        {getAccountTypeBadge(profile.account_type)}
      </div>

      {/* Avatar + Display Name + AI Assistant */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback>
                {firstName?.[0]}
                {lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                id="avatar-upload"
                disabled={uploadingAvatar}
              />
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <Button variant="outline" asChild disabled={uploadingAvatar}>
                  <span>{uploadingAvatar ? 'Uploading...' : 'Change Avatar'}</span>
                </Button>
              </Label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="display_name">Display Name</Label>
              <div className="flex gap-2">
                <Input
                  id="display_name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onBlur={saveDisplayName}
                  placeholder="How others see you"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="ai_assistant_name">AI Assistant Name</Label>
              <Input
                id="ai_assistant_name"
                value={profile.ai_assistant_name}
                onChange={(e) => updateProfile({ ai_assistant_name: e.target.value })}
                placeholder="Friend"
              />
            </div>
          </div>

          {/* PII from Secure Enclave — never stored in DB */}
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              <Badge variant="secondary" className="text-xs">
                {enclaveAvailable ? 'Stored on-device only' : 'Re-run onboarding to secure'}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Legal Name</Label>
                <p className="text-sm font-medium">
                  {firstName} {lastName}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="text-sm font-medium break-all">{emailValue}</p>
              </div>
              {phoneValue && (
                <div>
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <p className="text-sm font-medium">{phoneValue}</p>
                </div>
              )}
              {profile.date_of_birth && (
                <div>
                  <Label className="text-xs text-muted-foreground">Date of Birth</Label>
                  <p className="text-sm font-medium">
                    {new Date(profile.date_of_birth).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KYC + Trust */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Verification Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>KYC Status:</span>
                {getKycStatusBadge(profile.kyc_status)}
              </div>
              {profile.kyc_status === 'pending' && (
                <p className="text-sm text-muted-foreground">
                  Complete your verification to unlock all features.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Credit & Trust
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Trust Score:</span>
                <Badge variant="default">{profile.trust_score || 650}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Credit Line:</span>
                <span className="font-medium">${profile.available_credit_line || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wallet */}
      {wallet && (
        <Card>
          <CardHeader>
            <CardTitle>Wallet Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Cash Balance</p>
                <p className="text-xl font-bold">${wallet.cash_balance.toFixed(2)}</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">IDIA-USD</p>
                <p className="text-xl font-bold">${wallet.idia_usd_balance.toFixed(2)}</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">IDIA Tokens</p>
                <p className="text-xl font-bold">{wallet.idia_token_balance.toFixed(2)}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="text-sm">
                Seed Backup: {wallet.is_seed_backed_up ? '✅ Completed' : '⚠️ Not backed up'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interests */}
      <Card>
        <CardHeader>
          <CardTitle>Your Interests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {availableInterests.map((interest) => (
              <Button
                key={interest.id}
                variant={selectedInterests.includes(interest.id) ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleInterestToggle(interest.id)}
                className="text-xs"
              >
                {interest.name}
              </Button>
            ))}
          </div>
          <Button onClick={saveInterests} disabled={updating}>
            Save Interests
          </Button>
        </CardContent>
      </Card>

      {/* Quiet Time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Quiet Time Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="quiet-time"
              checked={profile.quiet_time_enabled}
              onCheckedChange={(checked) => updateProfile({ quiet_time_enabled: checked })}
            />
            <Label htmlFor="quiet-time">Enable Quiet Time</Label>
          </div>

          {profile.quiet_time_enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quiet-start">Start Time</Label>
                <Input
                  id="quiet-start"
                  type="time"
                  value={profile.quiet_time_start || '22:00'}
                  onChange={(e) => updateProfile({ quiet_time_start: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="quiet-end">End Time</Label>
                <Input
                  id="quiet-end"
                  type="time"
                  value={profile.quiet_time_end || '07:00'}
                  onChange={(e) => updateProfile({ quiet_time_end: e.target.value })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Management */}
      {profile.account_type === 'personal' && (
        <Card>
          <CardHeader>
            <CardTitle>Account Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Want to upgrade your account for business features?
              </p>
              <Button variant="outline">Upgrade to Business Account</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedProfileSettings;
