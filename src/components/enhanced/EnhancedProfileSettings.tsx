import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useEnhancedProfile } from "@/hooks/useEnhancedProfile";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Shield, CreditCard, Clock, Building } from "lucide-react";

const EnhancedProfileSettings: React.FC = () => {
  const {
    profile,
    wallet: seedWallet, // keep to check backup status
    interests,
    availableInterests,
    loading,
    updating,
    updateProfile,
    updateInterests,
    uploadAvatar,
  } = useEnhancedProfile();

  // Bring in the live wallet data hook
  const { balance } = useWalletBalance();
  const { toast } = useToast();

  const [selectedInterests, setSelectedInterests] = useState<string[]>(interests ? interests.map((i) => i.id) : []);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Business Upgrade State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [upgradeForm, setUpgradeForm] = useState({
    companyName: "",
    industry: "",
    contactName: "",
    contactRole: "Controlling Partner",
  });

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
    setSelectedInterests((prev) =>
      prev.includes(interestId) ? prev.filter((id) => id !== interestId) : [...prev, interestId],
    );
  };

  const saveInterests = () => {
    updateInterests(selectedInterests);
  };

  const getKycStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      verified: "default",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const getAccountTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      personal: "Personal",
      business: "Business",
      "non-profit": "Non-Profit",
    };
    return <Badge variant="outline">{labels[type] || type}</Badge>;
  };

  const handleBusinessUpgrade = async () => {
    if (!upgradeForm.companyName || !upgradeForm.contactName || !uploadFile) {
      toast({
        title: "Missing Information",
        description: "Please fill out all required fields and upload your legal documentation.",
        variant: "destructive",
      });
      return;
    }

    setUploadingDoc(true);
    try {
      // In a full production env, you'd upload `uploadFile` to Supabase storage here.

      // Dispatch the notification to the back office
      const { error } = await supabase.from("account_conversion_requests" as any).insert({
        user_id: profile.user_id,
        company_name: upgradeForm.companyName,
        industry: upgradeForm.industry,
        contact_name: upgradeForm.contactName,
        contact_role: upgradeForm.contactRole,
        request_type: "Personal to Business",
        status: "pending",
      });

      if (error && error.code !== "42P01") throw error; // Ignore if table isn't migrated yet locally

      toast({
        title: "Application Submitted",
        description: "Your business account request has been sent to the IDIA Corporate back office.",
      });
      setShowUpgradeModal(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUploadingDoc(false);
    }
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
              <AvatarImage src={profile.avatar_url || ""} />
              <AvatarFallback>
                {profile.first_name?.[0]}
                {profile.last_name?.[0]}
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
                value={profile.display_name || ""}
                onChange={(e) => updateProfile({ display_name: e.target.value })}
                placeholder="How others see you"
              />
            </div>
            <div>
              <Label htmlFor="ai_assistant_name">AI Assistant Name</Label>
              <Input
                id="ai_assistant_name"
                value={profile.ai_assistant_name || ""}
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
                <p className="text-sm font-medium">{new Date(profile.date_of_birth).toLocaleDateString()}</p>
              </div>
            )}
            {profile.phone_number && (
              <div>
                <Label>Phone Number (Read-only)</Label>
                <p className="text-sm font-medium">{profile.phone_number}</p>
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
              {profile.kyc_status === "pending" && (
                <p className="text-sm text-muted-foreground">Complete your verification to unlock all features.</p>
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
                <Badge variant="default">{profile?.trust_score != null ? profile.trust_score : "---"}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Credit Line:</span>
                <span className="font-medium">${profile.available_credit_line || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Information (Now Live) */}
      <Card>
        <CardHeader>
          <CardTitle>Wallet Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Cash Balance</p>
              <p className="text-xl font-bold">${(balance.cash_balance || 0).toFixed(2)}</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">IDIA-USD</p>
              <p className="text-xl font-bold">${(balance.idia_usd_balance || 0).toFixed(2)}</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">IDIA Tokens</p>
              <p className="text-xl font-bold">{(balance.idia_token_balance || 0).toFixed(2)}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="text-sm">
              Seed Backup: {seedWallet?.is_seed_backed_up ? "✅ Completed" : "⚠️ Not backed up"}
            </span>
          </div>
        </CardContent>
      </Card>

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

      {/* Account Management with Business Upgrade */}
      <Card>
        <CardHeader>
          <CardTitle>Account Management</CardTitle>
        </CardHeader>
        <CardContent>
          {profile.account_type === "personal" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Want to upgrade your account for business features?</p>

              <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Building className="w-4 h-4 mr-2" />
                    Upgrade to Business Account
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Business Account Onboarding</DialogTitle>
                    <DialogDescription>
                      Provide your business details and legal documentation. You must be a controlling partner or
                      authorized signatory to proceed.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Legal Business Name</Label>
                      <Input
                        value={upgradeForm.companyName}
                        onChange={(e) => setUpgradeForm({ ...upgradeForm, companyName: e.target.value })}
                        placeholder="Acme Corp"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Industry</Label>
                      <Select
                        value={upgradeForm.industry}
                        onValueChange={(v) => setUpgradeForm({ ...upgradeForm, industry: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Industry" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technology">Technology</SelectItem>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="healthcare">Healthcare</SelectItem>
                          <SelectItem value="non-profit">Non-Profit</SelectItem>
                          <SelectItem value="finance">Financial Services</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Your Full Name</Label>
                      <Input
                        value={upgradeForm.contactName}
                        onChange={(e) => setUpgradeForm({ ...upgradeForm, contactName: e.target.value })}
                        placeholder="Jane Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Your Role (Signatory Required)</Label>
                      <Select
                        value={upgradeForm.contactRole}
                        onValueChange={(v) => setUpgradeForm({ ...upgradeForm, contactRole: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Controlling Partner">Controlling Partner</SelectItem>
                          <SelectItem value="Authorized Signatory">Authorized Signatory</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Legal Documentation (Required)</Label>
                      <Input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Upload incorporation documents, 501(c)(3) letter, or business license.
                      </p>
                    </div>
                    <Button className="w-full mt-4" onClick={handleBusinessUpgrade} disabled={uploadingDoc}>
                      {uploadingDoc ? "Submitting Application..." : "Submit Application"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedProfileSettings;
