import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Send, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  idiaBalance: number;
}

// TEMP: testing — gate disabled (was 1)
const MIN_IDIA_TO_PROPOSE = 0;

const CATEGORIES: { value: string; label: string }[] = [
  { value: "data-policy", label: "Data Policy" },
  { value: "rewards", label: "Rewards & Incentives" },
  { value: "platform", label: "Platform Features" },
  { value: "governance", label: "Governance" },
  { value: "security", label: "Security & Privacy" },
  { value: "other", label: "Other" },
];

const IMPACTS = ["Low", "Medium", "High"] as const;

export const CreateDaoProposalModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  idiaBalance,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [impact, setImpact] = useState<string>("Medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasInsufficientBalance = idiaBalance < MIN_IDIA_TO_PROPOSE;

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("");
    setImpact("Medium");
  };

  const fireInsufficientToast = () => {
    toast({
      title: "Insufficient IDIA",
      description: `You must hold at least ${MIN_IDIA_TO_PROPOSE} IDIA to initiate a proposal.`,
      variant: "destructive",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // TEMP: testing — balance + required-field gates disabled. Fill defaults so DB NOT NULL holds.
    const safeTitle = title.trim() || "(untitled)";
    const safeDescription = description.trim() || "(no description)";
    const safeCategory = category || "other";

    setIsSubmitting(true);
    console.log("[PROPOSAL_SUBMIT] FLOW_START: Sovereign initiated proposal submission.");

    try {
      console.log("[PROPOSAL_SUBMIT] AUTH_START: Resolving sovereign identity...");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required.");
      console.log("[PROPOSAL_SUBMIT] AUTH_SUCCESS: User resolved.");

      console.log("[PROPOSAL_SUBMIT] DB_INSERT_START: Committing payload to ledger...");
      const { data: inserted, error: insertError } = await supabase
        .from("user_proposals")
        .insert({
          user_id: user.id,
          title: safeTitle,
          description: safeDescription,
          category: safeCategory,
          suggested_impact: impact,
        })
        .select()
        .single();
      if (insertError) throw insertError;
      console.log("[PROPOSAL_SUBMIT] DB_INSERT_SUCCESS: Row committed safely.", inserted.id);

      console.log("[PROPOSAL_SUBMIT] EDGE_INVOKE_START: Triggering 'validate-proposal' synchronous check...");
      const { data: validation, error: fnError } = await supabase.functions.invoke(
        "validate-proposal",
        {
          body: {
            proposalId: inserted.id,
            title: safeTitle,
            description: safeDescription,
            category: safeCategory,
          },
        }
      );
      if (fnError) throw fnError;
      console.log("[PROPOSAL_SUBMIT] EDGE_INVOKE_SUCCESS: Content validation complete.", validation);

      toast({
        title: "Proposal submitted!",
        description:
          validation?.feedback
            ? `Status: ${validation.status} — ${validation.feedback}`
            : "Your proposal is now under automated review.",
      });

      resetForm();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("[PROPOSAL_SUBMIT] FLOW_ERROR:", err);
      toast({
        title: "Submission failed",
        description: err?.message ?? "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      console.log("[PROPOSAL_SUBMIT] FLOW_END.");
    }
  };

  // TEMP: testing — only block while submitting
  const submitDisabled = isSubmitting;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-black">
            <Send className="w-5 h-5 text-[hsl(178,42%,32%)] dark:text-teal-300" />
            Submit a Governance Proposal
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Shape the protocol. Proposals are routed through automated validation before reaching the floor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="prop-title" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Title
            </Label>
            <Input
              id="prop-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter proposal title"
              maxLength={100}
              disabled={isSubmitting}
              className="bg-muted/40 border-input text-foreground placeholder:text-muted-foreground"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Category
              </Label>
              <Select value={category} onValueChange={setCategory} disabled={isSubmitting}>
                <SelectTrigger className="bg-muted/40 border-input text-foreground">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Expected Impact
              </Label>
              <Select value={impact} onValueChange={setImpact} disabled={isSubmitting}>
                <SelectTrigger className="bg-muted/40 border-input text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPACTS.map((i) => (
                    <SelectItem key={i} value={i}>
                      {i} Impact
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="prop-desc" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Description
            </Label>
            <Textarea
              id="prop-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your proposal in detail..."
              maxLength={1000}
              rows={6}
              disabled={isSubmitting}
              className="bg-muted/40 border-input text-foreground placeholder:text-muted-foreground resize-none"
              required
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {description.length}/1000
            </p>
          </div>

          {/* TEMP: testing — insufficient balance warning hidden */}
          {false && hasInsufficientBalance && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-300 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-300 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-800 dark:text-amber-200 leading-snug">
                Insufficient IDIA — hold at least {MIN_IDIA_TO_PROPOSE} IDIA to mint a proposal.
                Current: {idiaBalance.toFixed(4)}.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 h-11 rounded-xl"
            >
              Cancel
            </Button>
            <span className="w-full block flex-1">
              <Button
                type="submit"
                disabled={submitDisabled}
                className="w-full h-11 bg-[hsl(178,42%,32%)] hover:bg-[hsl(178,42%,25%)] text-white font-black uppercase tracking-widest rounded-xl"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...
                  </>
                ) : (
                  "Submit Proposal"
                )}
              </Button>
            </span>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateDaoProposalModal;
