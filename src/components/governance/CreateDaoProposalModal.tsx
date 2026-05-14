import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Fingerprint, PenTool } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { generateACAHash } from "@/utils/acaGenerator";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateDaoProposalModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sovereign authentication failed.");

      console.log(`[PROPOSAL_MINT] ACA_ANCHOR_START: Generating biometric anchor...`);
      const { hash } = await generateACAHash(user.id, "create_proposal", [
        "GOVERNANCE_PROPOSE",
        "LEDGER_WRITE",
      ]);
      console.log(`[PROPOSAL_MINT] ACA_ANCHOR_END: Hash ${hash.substring(0, 12)}...`);

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);

      const { error } = await (supabase as any).from("dao_proposals").insert({
        proposer_id: user.id,
        title: title.trim(),
        description: description.trim(),
        voting_modality: "quadratic",
        vote_type: "quadratic",
        status: "active",
        lifecycle_phase: "voting",
        quorum_threshold: 1000,
        end_date: endDate.toISOString(),
      });

      if (error) throw error;

      toast({
        title: "Proposal Minted",
        description: `Secured via ACA Hash ${hash.substring(0, 8)}...`,
      });

      setTitle("");
      setDescription("");
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("[PROPOSAL_MINT] Error:", err.message);
      toast({
        title: "Mint Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800 font-black">
            <PenTool className="w-5 h-5 text-[hsl(178,42%,32%)]" />
            Mint Proposal
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Submit a quadratic governance proposal to the Wyoming Operational Gateway.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="prop-title" className="text-[10px] font-black uppercase tracking-widest text-slate-600">
              Title
            </Label>
            <Input
              id="prop-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Concise proposal title"
              className="bg-slate-50 border-slate-200"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prop-desc" className="text-[10px] font-black uppercase tracking-widest text-slate-600">
              Description
            </Label>
            <Textarea
              id="prop-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline intent, scope, and expected outcome..."
              className="bg-slate-50 border-slate-200 min-h-[120px] resize-none"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !title.trim() || !description.trim()}
            className="w-full bg-[hsl(178,42%,32%)] hover:bg-[hsl(178,42%,25%)] text-white font-black uppercase tracking-widest h-12 rounded-xl mt-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Fingerprint className="w-5 h-5 mr-2" /> Sign & Mint
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateDaoProposalModal;
