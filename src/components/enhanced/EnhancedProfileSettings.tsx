import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEnhancedProfile } from '@/hooks/useEnhancedProfile';
import { Upload, Shield, CreditCard, Clock, Bot } from 'lucide-react';

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
    uploadAvatar 
  } = useEnhancedProfile();
  
  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    interests.map(i => i.id)
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  if (loading) {
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

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      uploadAvatar(file);
    }
  };

  const handleInterestToggle = (interestId: string) => {
    setSelectedInterests(prev => 
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const saveInterests = () => {
    updateInterests(selectedInterests);
  };

  const getKycStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      verified: "default",
      rejected: "destructive"
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const getAccountTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      personal: "Personal",
      business: "Business",
      'non-profit': "Non-Profit"
    };
    return <Badge variant="outline">{labels[type] || type}</Badge>;
  };

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Enhanced Profile</h1>
        {getAccountTypeBadge(profile.account_type)}
      </div>

      {/* Avatar & Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profile.avatar_url || ''} />
              <AvatarFallback>
                {profile.first_name?.[0]}{profile.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                id="avatar-upload"
                disabled={updating}
              />
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <Button variant="outline" asChild>
                  <span>Change Avatar</span>
                </Button>
              </Label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={profile.display_name || ''}
                onChange={(e) => updateProfile({ display_name: e.target.value })}
                placeholder="How others see you"
              />
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

          {/* Read-only KYC fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <Label>Legal Name (Read-only)</Label>
              <p className="text-sm font-medium">
                {profile.first_name} {profile.last_name}
              </p>
            </div>
            <div>
              <Label>Email (Read-only)</Label>
              <p className="text-sm font-medium">{profile.email}</p>
            </div>
            {profile.date_of_birth && (
              <div>
                <Label>Date of Birth (Read-only)</Label>
                <p className="text-sm font-medium">
                  {new Date(profile.date_of_birth).toLocaleDateString()}
                </p>
              </div>
            )}
            {profile.ssn_last4 && (
              <div>
                <Label>SSN Last 4 (Read-only)</Label>
                <p className="text-sm font-medium">***-**-{profile.ssn_last4}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KYC Status & Trust Score */}
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
                <Badge variant="default">{profile.trust_score || 850}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Credit Line:</span>
                <span className="font-medium">
                  ${profile.available_credit_line || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Information */}
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

      {/* Interests Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Your Interests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {availableInterests.map((interest) => (
              <Button
                key={interest.id}
                variant={selectedInterests.includes(interest.id) ? "default" : "outline"}
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

      {/* Quiet Time Settings */}
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
      <Card>
        <CardHeader>
          <CardTitle>Account Management</CardTitle>
        </CardHeader>
        <CardContent>
          {profile.account_type === 'personal' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Want to upgrade your account for business features?
              </p>
              <Button variant="outline">
                Upgrade to Business Account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedProfileSettings;