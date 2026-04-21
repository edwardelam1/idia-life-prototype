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
    return (
      <Badge variant="outline" className="font-bold uppercase tracking-wider">
        {labels[type] || type}
      </Badge>
    );
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
      <div className="flex flex-col gap-1.5 rounded-md border bg-muted/40 p-3 text-sm mb-4">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">{latestConversionRequest.request_type || "Conversion Request"}</span>
          <Badge variant={c.variant} className="gap-1 font-bold">
            {c.icon}
            {c.label.toUpperCase()}
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
    <div className="w-full px-3 sm:px-4 md:max-w-4xl md:mx-auto space-y-4 sm:space-y-6 pb-[env(safe-area-inset-bottom)] pt-2">
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">Identity</h1>
        {getAccountTypeBadge(profile.account_type)}
      </div>

      {/* Trust Score Card - Refactored for Visual Weight */}
      <Card className="border-2 border-primary/10 bg-gradient-to-br from-background to-muted/30">
        <CardContent className="pt-8 pb-8 text-center space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
            Human Reliability Index
          </p>
          <span className="text-7xl sm:text-8xl font-black tracking-tighter text-primary">
            {profile?.trust_score ?? "--"}
          </span>
        </CardContent>
      </Card>

      {/* Avatar & Basic Info - Single Column Stack for Mobile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg uppercase font-bold">
            <Upload className="w-5 h-5" />
            Attributes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-start">
            <Avatar className="w-24 h-24 border-4 border-background shadow-xl">
              <AvatarImage src={profile.avatar_url || ""} />
              <AvatarFallback className="bg-primary text-primary-foreground font-black text-xl">
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
              <Label htmlFor="avatar-upload" className="cursor-pointer w-full">
                <Button
                  variant="outline"
                  asChild
                  className="w-full sm:w-auto min-h-[44px] rounded-xl font-bold uppercase text-[10px]"
                >
                  <span>Change Photo</span>
                </Button>
              </Label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="display_name" className="text-[10px] font-black uppercase ml-1">
                Display Handle
              </Label>
              <Input
                id="display_name"
                value={profile.display_name || ""}
                onChange={(e) => updateProfile({ display_name: e.target.value })}
                placeholder="Handle"
                className="min-h-[44px] rounded-xl font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ai_assistant_name" className="text-[10px] font-black uppercase ml-1">
                Assistant Identifier
              </Label>
              <Input
                id="ai_assistant_name"
                value={profile.ai_assistant_name || ""}
                onChange={(e) => updateProfile({ ai_assistant_name: e.target.value })}
                placeholder="Friend"
                className="min-h-[44px] rounded-xl font-medium"
              />
            </div>
          </div>

          {/* Read-only KYC fields - Redesigned stack */}
          <div className="grid grid-cols-1 gap-4 p-4 bg-muted/50 rounded-2xl border">
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase opacity-60">Legal Name</Label>
              <p className="text-sm font-bold break-words uppercase tracking-tight">
                {profile.first_name} {profile.last_name}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase opacity-60">Auth Email</Label>
              <p className="text-sm font-bold break-all">{profile.email}</p>
            </div>
            {profile.phone_number && (
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase opacity-60">Mobile</Label>
                <p className="text-sm font-bold">{profile.phone_number}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KYC Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg uppercase font-bold">
            <Shield className="w-5 h-5" />
            Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center bg-muted/30 p-3 rounded-xl border">
            <span className="text-xs font-bold uppercase tracking-widest">Status:</span>
            {getKycStatusBadge(profile.kyc_status)}
          </div>
          {profile.kyc_status === "pending" && (
            <p className="text-[10px] text-muted-foreground mt-3 font-medium uppercase tracking-tight">
              Complete verification to unlock high-stakes data features.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Wallet Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg uppercase font-bold">
            <Wallet className="w-5 h-5" />
            Ledger
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="text-center p-4 bg-muted/50 rounded-2xl border">
              <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Cash</p>
              <p className="text-2xl font-black tabular-nums">${(balance.cash_balance || 0).toFixed(2)}</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-2xl border">
              <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">IDIA-USD</p>
              <p className="text-2xl font-black tabular-nums">${(balance.idia_usd_balance || 0).toFixed(2)}</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-2xl border">
              <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Tokens</p>
              <p className="text-2xl font-black tabular-nums">{(balance.idia_token_balance || 0).toFixed(2)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-1">
            <Shield className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-wider">
              Seed Status: {seedWallet?.is_seed_backed_up ? "Verified" : "Action Required"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Interests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base uppercase font-bold">Interests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {availableInterests.map((interest) => (
              <Button
                key={interest.id}
                variant={selectedInterests.includes(interest.id) ? "default" : "outline"}
                size="sm"
                onClick={() => handleInterestToggle(interest.id)}
                className="text-[10px] font-bold uppercase min-h-[44px] rounded-xl"
              >
                {interest.name}
              </Button>
            ))}
          </div>
          <Button
            onClick={saveInterests}
            disabled={updating}
            className="w-full sm:w-auto min-h-[44px] font-black uppercase rounded-xl"
          >
            Save Preferences
          </Button>
        </CardContent>
      </Card>

      {/* Account Management — Workflow Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg uppercase font-bold">Account Lifecycle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-black uppercase tracking-widest">Active Type</span>
              {getAccountTypeBadge(profile.account_type)}
            </div>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              Personal accounts include identity-verified KYC, data monetization payouts, and Pro feature access.
            </p>
          </div>

          {renderRequestStatus()}

          {/* Business card */}
          <div className="rounded-2xl border-2 border-primary/5 bg-card p-4 space-y-4">
            <div className="flex items-start gap-3">
              <Building className="w-6 h-6 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-black text-sm uppercase">Business Upgrade</h3>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  Enterprise client conversion. Unlocks multi-user team access and merchant IDIA Pay tools.
                </p>
              </div>
            </div>

            <ul className="text-[10px] font-black uppercase text-muted-foreground space-y-2 pl-1">
              <li className="flex items-center gap-2">
                <Users className="w-3 h-3 text-primary" /> Multi-user team management
              </li>
              <li className="flex items-center gap-2">
                <BarChart3 className="w-3 h-3 text-primary" /> Business Health Index (BHI)
              </li>
              <li className="flex items-center gap-2">
                <CreditCard className="w-3 h-3 text-primary" /> AR POS & IDIA Pay tools
              </li>
            </ul>

            <Button
              onClick={() => openUpgrade("business")}
              disabled={!!pendingRequest}
              className="w-full min-h-[44px] font-black uppercase rounded-xl"
            >
              {pendingRequest && pendingRequest.request_type === "Personal to Business"
                ? "Application Pending"
                : "Start Business Conversion"}
            </Button>
          </div>

          {/* Non-profit card */}
          <div className="rounded-2xl border bg-card p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Heart className="w-6 h-6 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-black text-sm uppercase">Non-Profit (501c3)</h3>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  Verified mission-aligned enterprise configuration for 501(c)(3) organizations.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => openUpgrade("non-profit")}
              disabled={!!pendingRequest}
              className="w-full min-h-[44px] font-black uppercase rounded-xl border-2"
            >
              {pendingRequest && pendingRequest.request_type === "Personal to Non-Profit"
                ? "Application Pending"
                : "Start NGO Conversion"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Dialog - Mobile Responsive with Sticky Footer */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-lg max-h-[90dvh] overflow-hidden flex flex-col p-0 rounded-t-3xl sm:rounded-2xl border-none">
          <div className="p-6 overflow-y-auto space-y-6">
            <DialogHeader>
              <DialogTitle className="font-black uppercase text-xl tracking-tight">
                {upgradeKind === "non-profit" ? "NGO Onboarding" : "Business Onboarding"}
              </DialogTitle>
              <DialogDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Provide legal entity details. Signatory authority required.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase ml-1">
                  {upgradeKind === "non-profit" ? "Organization Name" : "Legal Entity Name"}
                </Label>
                <Input
                  value={upgradeForm.companyName}
                  onChange={(e) => setUpgradeForm({ ...upgradeForm, companyName: e.target.value })}
                  placeholder="Entity Name"
                  className="min-h-[44px] rounded-xl bg-muted/40 border-none px-4"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase ml-1">Industry</Label>
                <Select
                  value={upgradeForm.industry}
                  onValueChange={(v) => setUpgradeForm({ ...upgradeForm, industry: v })}
                >
                  <SelectTrigger className="min-h-[44px] rounded-xl bg-muted/40 border-none px-4">
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
                <Label className="text-[10px] font-black uppercase ml-1">Officer Name</Label>
                <Input
                  value={upgradeForm.contactName}
                  onChange={(e) => setUpgradeForm({ ...upgradeForm, contactName: e.target.value })}
                  placeholder="Full Legal Name"
                  className="min-h-[44px] rounded-xl bg-muted/40 border-none px-4"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase ml-1">Legal Documents</Label>
                <label
                  htmlFor="upgrade-doc-upload"
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/20 bg-muted/20 p-8 cursor-pointer hover:bg-muted/40 transition-colors min-h-[120px]"
                >
                  <FileUp className="w-8 h-8 text-primary" />
                  <p className="text-[10px] font-black uppercase tracking-tighter text-center">
                    {uploadFile ? uploadFile.name : "Tap to upload Articles of Incorporation"}
                  </p>
                  <input
                    id="upgrade-doc-upload"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="p-4 border-t bg-background flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => setShowUpgradeModal(false)}
              className="w-full sm:w-auto min-h-[44px] font-black uppercase rounded-xl"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleUpgradeSubmit}
              disabled={uploadingDoc}
              className="w-full sm:w-auto min-h-[44px] font-black uppercase rounded-xl shadow-lg shadow-primary/20"
            >
              {uploadingDoc ? "Uploading..." : "Submit Application"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedProfileSettings;
