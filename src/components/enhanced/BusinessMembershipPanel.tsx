import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Building, Clock, LogOut } from "lucide-react";
import { useBusinessMembership, type Membership } from "@/hooks/useBusinessMembership";
import { useToast } from "@/hooks/use-toast";

const roleBadgeVariant = (role: string): "default" | "secondary" | "outline" => {
  if (role === "Org Admin") return "default";
  if (role === "Team Lead") return "secondary";
  return "outline";
};

const BusinessMembershipPanel: React.FC = () => {
  const { loading, memberships, pendingRequest, submitIntake, leaveBusiness } =
    useBusinessMembership();
  const { toast } = useToast();

  const [showIntake, setShowIntake] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    industry: "",
    contactName: "",
    contactRole: "Controlling Partner",
  });

  const [leaveTarget, setLeaveTarget] = useState<Membership | null>(null);
  const [leaving, setLeaving] = useState(false);

  if (loading) {
    return <div className="h-12 rounded-md bg-muted/50 animate-pulse" />;
  }

  const handleSubmit = async () => {
    if (!form.companyName || !form.contactName) {
      toast({
        title: "Missing information",
        description: "Legal business name and your full name are required.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      await submitIntake(form);
      toast({
        title: "Application submitted",
        description: "Your business account application is awaiting KYB review.",
      });
      setShowIntake(false);
      setForm({
        companyName: "",
        industry: "",
        contactName: "",
        contactRole: "Controlling Partner",
      });
    } catch (err: any) {
      toast({
        title: "Submission failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeave = async () => {
    if (!leaveTarget) return;
    setLeaving(true);
    try {
      await leaveBusiness(leaveTarget.employeeId);
      toast({
        title: "Left business",
        description: `You are no longer a member of ${leaveTarget.businessName}.`,
      });
      setLeaveTarget(null);
    } catch (err: any) {
      toast({
        title: "Could not leave",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLeaving(false);
    }
  };

  // STATE A: memberships exist
  if (memberships.length > 0) {
    return (
      <TooltipProvider delayDuration={150}>
        <div className="divide-y divide-border rounded-md border">
          {memberships.map((m) => {
            const disabled = m.isLastOrgAdmin;
            const leaveBtn = (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                disabled={disabled}
                onClick={() => setLeaveTarget(m)}
              >
                <LogOut className="w-3 h-3 mr-1" />
                Leave
              </Button>
            );
            return (
              <div
                key={m.employeeId}
                className="flex items-center justify-between gap-2 px-2.5 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{m.businessName}</p>
                  <Badge variant={roleBadgeVariant(m.platformRole)} className="text-[10px] mt-0.5">
                    {m.platformRole}
                  </Badge>
                </div>
                {disabled ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0}>{leaveBtn}</span>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-[220px] text-xs">
                      You are the last Org Admin. Closing the business is not allowed from IDIA
                      Life.
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  leaveBtn
                )}
              </div>
            );
          })}
        </div>

        <AlertDialog open={!!leaveTarget} onOpenChange={(o) => !o && setLeaveTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave {leaveTarget?.businessName}?</AlertDialogTitle>
              <AlertDialogDescription>
                You will lose access to this business in IDIA Life. An Org Admin can re-invite you
                later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={leaving}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleLeave} disabled={leaving}>
                {leaving ? "Leaving..." : "Leave"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TooltipProvider>
    );
  }

  // STATE B: pending intake
  if (pendingRequest) {
    return (
      <div className="flex items-start gap-2 rounded-md border bg-muted/40 px-2.5 py-2">
        <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{pendingRequest.company_name}</p>
          <p className="text-[11px] text-muted-foreground">
            {pendingRequest.contact_role} — application awaiting KYB review.
          </p>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          In review
        </Badge>
      </div>
    );
  }

  // STATE C: no memberships, no pending request
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <p className="text-xs text-muted-foreground">
        Run a business? Apply for a business account. KYB review happens in the IDIA Hub app.
      </p>
      <Dialog open={showIntake} onOpenChange={setShowIntake}>
        <DialogTrigger asChild>
          <Button size="sm">
            <Building className="w-4 h-4 mr-2" />
            Apply for Business Account
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Business Account Application</DialogTitle>
            <DialogDescription>
              This is an intake form. After you submit, the IDIA Hub team will contact you to
              complete KYB verification and provision your business.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Legal Business Name</Label>
              <Input
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                placeholder="Acme Corp"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Industry</Label>
              <Select
                value={form.industry}
                onValueChange={(v) => setForm({ ...form, industry: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
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
              <Label className="text-xs">Your Full Name</Label>
              <Input
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Your Role</Label>
              <Select
                value={form.contactRole}
                onValueChange={(v) => setForm({ ...form, contactRole: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Controlling Partner">Controlling Partner</SelectItem>
                  <SelectItem value="Authorized Signatory">Authorized Signatory</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-[11px] text-muted-foreground">
              You will be asked to upload incorporation documents, 501(c)(3) letter, or business
              license during KYB review in the IDIA Hub app.
            </p>
            <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessMembershipPanel;
