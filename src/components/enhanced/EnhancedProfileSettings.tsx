import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEnhancedProfile } from "@/hooks/useEnhancedProfile";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload,
  Shield,
  CreditCard,
  Building,
  Heart,
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  BarChart3,
  Wallet,
  FileUp,
  X,
} from "lucide-react";

type UpgradeKind = "business" | "non-profit";

const EnhancedProfileSettings: React.FC = () => {
  const {
    profile,
    wallet: seedWallet,
    interests,
    availableInterests,
    latestConversionRequest,
    loading,
    updating,
    updateProfile,
    updateInterests,
    uploadAvatar,
    refetchConversionRequest,
  } = useEnhancedProfile();

  const { balance } = useWalletBalance();
  const { toast } = useToast();

  const [selectedInterests, setSelectedInterests] = useState<string[]>(interests ? interests.map((i) => i.id) : []);

  // Upgrade dialog state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeKind, setUpgradeKind] = useState<UpgradeKind>("business");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [upgradeForm, setUpgradeForm] = useState({
    companyName: "",
    industry: "",
    contactName: "",
    contactRole: "Controlling Partner",
  });

  const pendingRequest = useMemo(
    () => (latestConversionRequest?.status === "pending" ? latestConversionRequest : null),
    [latestConversionRequest],
  );

  if (loading) {
    return (
      <div className="p-3 sm:p-4">
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
    if (file) uploadAvatar(file);
  };

  const handleInterestToggle = (interestId: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interestId) ? prev.filter((id) => id !== interestId) : [...prev, interestId],
    );
  };

  const saveInterests = () => updateInterests(selectedInterests);

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
      individual: "Personal",
      business: "Business",
      "non-profit": "Non-Profit",
    };
    return <Badge variant="outline">{labels[type] || type}</Badge>;
  };

  const openUpgrade = (kind: UpgradeKind) => {
    setUpgradeKind(kind);
    setUpgradeForm({
      companyName: "",
      industry: kind === "non-profit" ? "non-profit" : "",
      contactName: "",
      contactRole: "Controlling Partner",
    });
    setUploadFile(null);
    setShowUpgradeModal(true);
  };

  const handleUpgradeSubmit = async () => {
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
      const requestType = upgradeKind === "non-profit" ? "Personal to Non-Profit" : "Personal to Business";

      const { error } = await supabase.from("account_conversion_requests" as any).insert({
        user_id: profile.user_id,
        company_name: upgradeForm.companyName,
        industry: upgradeForm.industry,
        contact_name: upgradeForm.contactName,
        contact_role: upgradeForm.contactRole,
        request_type: requestType,
        status: "pending",
      });

      if (error && error.code !== "42P01") throw error;

      toast({
        title: "Application Submitted",
        description: "Your request has been sent to the IDIA Corporate back office.",
      });
      setShowUpgradeModal(false);
      await refetchConversionRequest();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUploadingDoc(false);
    }
  };

  const renderRequestStatus = () => {
    if (!latestConversionRequest) return null;
    const status = latestConversionRequest.status || "pending";
    const submitted = latestConversionRequest.created_at
      ? new Date(latestConversionRequest.created_at).toLocaleDateString()
      : "—";

    const config: Record<
      string,
      { icon: React.ReactNode; variant: "default" | "secondary" | "destructive"; label: string }
    > = {
      pending: { icon: <Clock className="w-3.5 h-3.5" />, variant: "secondary", label: "Pending Review" },
      approved: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, variant: "default", label: "Approved" },
      rejected: { icon: <XCircle className="w-3.5 h-3.5" />, variant: "destructive", label: "Rejected" },
    };
    const c = config[status] || config.pending;

    return (
      <div className="flex flex-col gap-1.5 rounded-md border bg-muted/40 p-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">{latestConversionRequest.request_type || "Conversion Request"}</span>
          <Badge variant={c.variant} className="gap-1">
            {c.icon}
            {c.label}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          {latestConversionRequest.company_name} · Submitted {submitted}
        </div>
        {status === "pending" && (
          <p className="text-xs text-muted-foreground">Application under review by IDIA Corporate back office.</p>
        )}
      </div>
    );
  };

  return (
    <div className="w-full px-3 sm:px-4 md:max-w-4xl md:mx-auto space-y-4 sm:space-y-6 pb-[env(safe-area-inset-bottom)]">
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between pt-2">
        <h1 className="text-xl sm:text-2xl font-bold">Enhanced Profile</h1>
        {getAccountTypeBadge(profile.account_type)}
      </div>

      {/* Avatar & Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Upload className="w-5 h-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profile.avatar_url || ""} />
              <AvatarFallback>
                {profile.first_name?.[0]}
                {profile.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="w-full sm:w-auto">
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                id="avatar-upload"
                disabled={updating}
              />
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <Button variant="outline" asChild className="w-full sm:w-auto min-h-11">
                  <span>Change Avatar</span>
                </Button>
              </Label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={profile.display_name || ""}
                onChange={(e) => updateProfile({ display_name: e.target.value })}
                placeholder="How others see you"
                className="min-h-11"
              />
            </div>
            <div>
              <Label htmlFor="ai_assistant_name">AI Assistant Name</Label>
              <Input
                id="ai_assistant_name"
                value={profile.ai_assistant_name || ""}
                onChange={(e) => updateProfile({ ai_assistant_name: e.target.value })}
                placeholder="Friend"
                className="min-h-11"
              />
            </div>
          </div>

          {/* Read-only KYC fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-muted rounded-lg">
            <div>
              <Label>Legal Name (Read-only)</Label>
              <p className="text-sm font-medium break-words">
                {profile.first_name} {profile.last_name}
              </p>
            </div>
            <div>
              <Label>Email (Read-only)</Label>
              <p className="text-sm font-medium break-all">{profile.email}</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
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
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CreditCard className="w-5 h-5" />
              Credit & Trust
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline">
              <span className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tighter text-foreground tabular-nums break-words">
                {profile?.trust_score !== null && profile?.trust_score !== undefined ? profile.trust_score : "NO SCORE"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Wallet className="w-5 h-5" />
            Wallet Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="text-center p-3 sm:p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Cash Balance</p>
              <p className="text-base sm:text-xl font-bold tabular-nums">${(balance.cash_balance || 0).toFixed(2)}</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">IDIA-USD</p>
              <p className="text-base sm:text-xl font-bold tabular-nums">
                ${(balance.idia_usd_balance || 0).toFixed(2)}
              </p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">IDIA Tokens</p>
              <p className="text-base sm:text-xl font-bold tabular-nums">
                {(balance.idia_token_balance || 0).toFixed(2)}
              </p>
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

      {/* Interests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Your Interests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {availableInterests.map((interest) => (
              <Button
                key={interest.id}
                variant={selectedInterests.includes(interest.id) ? "default" : "outline"}
                size="sm"
                onClick={() => handleInterestToggle(interest.id)}
                className="text-xs w-full min-h-11"
              >
                {interest.name}
              </Button>
            ))}
          </div>
          <Button onClick={saveInterests} disabled={updating} className="w-full sm:w-auto min-h-11">
            Save Interests
          </Button>
        </CardContent>
      </Card>

      {/* Account Management — Expanded */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Account Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Current account tile */}
          <div className="rounded-lg border bg-card p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">Current Account Type</span>
              {getAccountTypeBadge(profile.account_type)}
            </div>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
              Personal accounts include identity-verified KYC, the IDIA Life wallet, data monetization payouts, and
              access to social, governance, and Pro features.
            </p>
          </div>

          {/* Latest request status */}
          {renderRequestStatus()}

          {/* Business upgrade card */}
          <div className="rounded-lg border bg-card p-3 sm:p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Building className="w-5 h-5 mt-0.5 text-primary" />
              <div className="flex-1">
                <h3 className="font-semibold text-sm sm:text-base">Request a Business Account</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Convert this account to an enterprise client of IDIA. Unlocks the merchant toolkit and back-office
                  capabilities.
                </p>
              </div>
            </div>

            <ul className="text-xs sm:text-sm text-muted-foreground space-y-1.5 pl-1">
              <li className="flex items-start gap-2">
                <Users className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                Multi-user team access (owners, managers, staff)
              </li>
              <li className="flex items-start gap-2">
                <BarChart3 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                Business Health Index analytics & dashboards
              </li>
              <li className="flex items-start gap-2">
                <CreditCard className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                IDIA Pay merchant tools (NFC, AR menus, POS)
              </li>
            </ul>

            <p className="text-xs text-muted-foreground italic">
              Eligibility: requires a Controlling Partner or Authorized Signatory and legal documentation (incorporation
              papers or business license).
            </p>

            <Button
              onClick={() => openUpgrade("business")}
              disabled={!!pendingRequest}
              className="w-full sm:w-auto min-h-11"
            >
              <Building className="w-4 h-4 mr-2" />
              {pendingRequest && pendingRequest.request_type === "Personal to Business"
                ? "Application Pending"
                : "Request Business Account"}
            </Button>
          </div>

          {/* Non-profit upgrade card */}
          <div className="rounded-lg border bg-card p-3 sm:p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Heart className="w-5 h-5 mt-0.5 text-primary" />
              <div className="flex-1">
                <h3 className="font-semibold text-sm sm:text-base">Request a Non-Profit (501c3) Account</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  For verified 501(c)(3) organizations. Same enterprise plumbing, mission-aligned configuration.
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground italic">
              Eligibility: requires an IRS 501(c)(3) determination letter and an authorized signatory.
            </p>
            <Button
              variant="outline"
              onClick={() => openUpgrade("non-profit")}
              disabled={!!pendingRequest}
              className="w-full sm:w-auto min-h-11"
            >
              <Heart className="w-4 h-4 mr-2" />
              {pendingRequest && pendingRequest.request_type === "Personal to Non-Profit"
                ? "Application Pending"
                : "Request Non-Profit Account"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-lg max-h-[90dvh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>
              {upgradeKind === "non-profit" ? "Non-Profit Account Onboarding" : "Business Account Onboarding"}
            </DialogTitle>
            <DialogDescription>
              Provide your {upgradeKind === "non-profit" ? "non-profit organization" : "business"} details and legal
              documentation. You must be a controlling partner or authorized signatory to proceed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div className="space-y-1.5">
              <Label>{upgradeKind === "non-profit" ? "Legal Organization Name" : "Legal Business Name"}</Label>
              <Input
                value={upgradeForm.companyName}
                onChange={(e) => setUpgradeForm({ ...upgradeForm, companyName: e.target.value })}
                placeholder={upgradeKind === "non-profit" ? "Mission Foundation" : "Acme Corp"}
                className="min-h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Industry</Label>
              <Select
                value={upgradeForm.industry}
                onValueChange={(v) => setUpgradeForm({ ...upgradeForm, industry: v })}
              >
                <SelectTrigger className="min-h-11">
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

            <div className="space-y-1.5">
              <Label>Your Full Name</Label>
              <Input
                value={upgradeForm.contactName}
                onChange={(e) => setUpgradeForm({ ...upgradeForm, contactName: e.target.value })}
                placeholder="Jane Doe"
                className="min-h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Your Role (Signatory Required)</Label>
              <Select
                value={upgradeForm.contactRole}
                onValueChange={(v) => setUpgradeForm({ ...upgradeForm, contactRole: v })}
              >
                <SelectTrigger className="min-h-11">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Controlling Partner">Controlling Partner</SelectItem>
                  <SelectItem value="Authorized Signatory">Authorized Signatory</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Legal Documentation (Required)</Label>
              <label
                htmlFor="upgrade-doc-upload"
                className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border bg-muted/30 p-4 cursor-pointer hover:bg-muted/50 transition-colors min-h-24"
              >
                <FileUp className="w-5 h-5 text-muted-foreground" />
                {uploadFile ? (
                  <div className="text-center">
                    <p className="text-sm font-medium break-all">{uploadFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-medium">Tap to upload document</p>
                    <p className="text-xs text-muted-foreground">PDF, PNG, or JPG</p>
                  </div>
                )}
                <input
                  id="upgrade-doc-upload"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
              </label>
              <p className="text-xs text-muted-foreground">
                {upgradeKind === "non-profit"
                  ? "Upload IRS 501(c)(3) determination letter."
                  : "Upload incorporation documents or business license."}
              </p>
            </div>
          </div>

          <div className="sticky bottom-0 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 px-4 sm:px-6 pt-3 pb-3 border-t bg-background flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setShowUpgradeModal(false)} className="w-full sm:w-auto min-h-11">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleUpgradeSubmit} disabled={uploadingDoc} className="w-full sm:w-auto min-h-11">
              {uploadingDoc ? "Submitting…" : "Submit Application"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedProfileSettings;
