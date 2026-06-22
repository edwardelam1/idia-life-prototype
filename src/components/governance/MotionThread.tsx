import React, { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, ThumbsUp, ThumbsDown, Rocket, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateACAHash } from "@/utils/acaGenerator";
import { recordACA } from "@/utils/acaLedger";
import { toast } from "@/hooks/use-toast";
import { getAscensionLevel } from "@/utils/governanceGate";

interface MotionThreadProps {
  proposal: {
    id: string;
    title: string;
    committee_id: string | null;
    lifecycle_phase: string | null;
    committee_quorum_required?: number | null;
  } | null;
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

interface Comment {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  // Included relational profile data
  profiles?: { wallet_address: string }; 
}

interface Signature {
  id: string;
  signer_id: string;
  signature_type: "endorse" | "object";
  created_at: string;
}

const MotionThread: React.FC<MotionThreadProps> = ({ proposal, open, onClose, onChanged }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [newComment, setNewComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [hasHat, setHasHat] = useState(false);

  useEffect(() => {
    if (!open || !proposal) return;
    void hydrate();
    const t = setInterval(hydrate, 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, proposal?.id]);

  const hydrate = async () => {
    if (!proposal) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [{ data: hats }, { data: cs }, { data: sigs }] = await Promise.all([
      (supabase as any).from("dao_hats").select("hat_type").eq("user_id", user.id)
        .eq("eligibility_status", "active").is("revoked_at", null),
      // Appended profiles(wallet_address) to the query to fetch the 0x string
      (supabase as any).from("proposal_comments").select("id, author_id, body, created_at, profiles(wallet_address)")
        .eq("proposal_id", proposal.id).order("created_at", { ascending: true }),
      (supabase as any).from("proposal_signatures").select("id, signer_id, signature_type, created_at")
        .eq("proposal_id", proposal.id),
    ]);
    const hatSet = new Set<string>((hats || []).map((h: any) => h.hat_type));
    setLevel(getAscensionLevel(hatSet));
    setHasHat(proposal.committee_id ? hatSet.has(proposal.committee_id) : false);
    setComments(cs || []);
    setSignatures(sigs || []);
  };

  const postComment = async () => {
    if (!proposal || !userId || newComment.trim().length < 2) return;
    setBusy(true);
    try {
      const { hash, payload } = await generateACAHash(userId, `motion_comment_${proposal.id}`, [
        "MOTION_COMMENT", "DELIBERATION",
      ]);
      const { error } = await (supabase as any).from("proposal_comments").insert({
        proposal_id: proposal.id,
        author_id: userId,
        body: newComment.trim(),
        aca_hash_key: hash,
      });
      if (error) throw error;
      await recordACA({ userId, sourceId: "GOV_MOTION_COMMENT", consentType: "MOTION_COMMENT_V1", hash, payload });
      setNewComment("");
      void hydrate();
    } catch (e: any) {
      toast({ title: "Comment failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const sign = async (signature_type: "endorse" | "object") => {
    if (!proposal || !userId) return;
    setBusy(true);
    try {
      const { hash, payload } = await generateACAHash(userId, `motion_sign_${signature_type}_${proposal.id}`, [
        "MOTION_SIGN", signature_type === "endorse" ? "ENDORSE" : "OBJECT",
      ]);
      const { error } = await (supabase as any).from("proposal_signatures").insert({
        proposal_id: proposal.id,
        signer_id: userId,
        signature_type,
        aca_hash_key: hash,
      });
      if (error) throw error;
      await recordACA({ userId, sourceId: "GOV_MOTION_SIGN", consentType: `MOTION_${signature_type.toUpperCase()}_V1`, hash, payload });
      toast({ title: signature_type === "endorse" ? "Endorsement recorded" : "Objection recorded" });
      void hydrate();
    } catch (e: any) {
      toast({ title: "Signature failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const escalate = async () => {
    if (!proposal || !userId) return;
    setBusy(true);
    try {
      const { hash, payload } = await generateACAHash(userId, `motion_escalate_${proposal.id}`, [
        "MOTION_ESCALATE", "LEDGER_WRITE",
      ]);
      const { data, error } = await supabase.functions.invoke("gov-escalate-motion", {
        body: { proposal_id: proposal.id, aca_hash: hash, aca_payload: payload },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Motion escalated to DAO floor" });
      onChanged?.();
      onClose();
    } catch (e: any) {
      toast({ title: "Escalate failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  // Helper function to format the 0x address securely
  const formatAddress = (c: Comment) => {
    const addr = c.profiles?.wallet_address || c.author_id;
    if (addr.startsWith("0x") && addr.length === 42) {
      return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    }
    return addr;
  };

  const endorseCount = signatures.filter((s) => s.signature_type === "endorse").length;
  const objectCount = signatures.filter((s) => s.signature_type === "object").length;
  const required = proposal?.committee_quorum_required ?? 3;
  const canEscalate = level >= 2 && proposal?.lifecycle_phase === "draft" && endorseCount >= required;
  const mySig = signatures.find((s) => s.signer_id === userId);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      {/* Added strict safe-area bounds to prevent iOS header overlap */}
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md overflow-y-auto pt-[max(env(safe-area-inset-top),3rem)] pb-[max(env(safe-area-inset-bottom),2rem)]"
      >
        <SheetHeader>
          <div className="flex items-center gap-3">
            {/* Hardcoded backward navigation to bypass hidden shadcn close buttons */}
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <SheetTitle className="text-sm font-black uppercase tracking-wider text-left">
              {proposal?.title || "Motion"}
            </SheetTitle>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap pt-2">
            <Badge variant="outline" className="text-[9px] uppercase tracking-widest">
              {proposal?.lifecycle_phase || "—"}
            </Badge>
            <Badge className="bg-teal-600 text-white text-[9px] uppercase tracking-widest">
              {endorseCount}/{required} endorse
            </Badge>
            {objectCount > 0 && (
              <Badge className="bg-rose-500 text-white text-[9px] uppercase tracking-widest">
                {objectCount} object
              </Badge>
            )}
          </div>
        </SheetHeader>

        <section className="mt-6 space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Committee Quorum</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => sign("endorse")}
              disabled={busy || !hasHat || !!mySig}
              className="bg-teal-700 hover:bg-teal-800 text-white text-[10px] font-black uppercase tracking-wider"
            >
              <ThumbsUp className="w-3.5 h-3.5 mr-1.5" />
              {mySig?.signature_type === "endorse" ? "Endorsed" : "Endorse"}
            </Button>
            <Button
              onClick={() => sign("object")}
              disabled={busy || !hasHat || !!mySig}
              variant="outline"
              className="border-rose-300 text-rose-700 hover:bg-rose-50 text-[10px] font-black uppercase tracking-wider"
            >
              <ThumbsDown className="w-3.5 h-3.5 mr-1.5" />
              {mySig?.signature_type === "object" ? "Objected" : "Object"}
            </Button>
          </div>
          {!hasHat && (
            <p className="text-[10px] text-muted-foreground">
              Only active officers of this committee may sign.
            </p>
          )}
          {canEscalate && (
            <Button
              onClick={escalate}
              disabled={busy}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-black uppercase tracking-widest"
            >
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-3.5 h-3.5 mr-1.5" />}
              Bring to the Floor
            </Button>
          )}
        </section>

        <section className="mt-6 space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <MessageSquare className="w-3 h-3" /> Deliberation ({comments.length})
          </h3>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
            {comments.length === 0 ? (
              <p className="text-[10px] text-muted-foreground italic">No comments yet.</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="rounded-2xl border border-border bg-card/50 p-3 space-y-1">
                  {/* Now rendering the securely truncated 0x address */}
                  <p className="text-[9px] font-mono text-muted-foreground truncate">{formatAddress(c)}</p>
                  <p className="text-xs whitespace-pre-wrap">{c.body}</p>
                  <p className="text-[9px] text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add to the deliberation…"
            className="text-xs min-h-[80px] rounded-2xl"
            disabled={busy}
          />
          <Button onClick={postComment} disabled={busy || newComment.trim().length < 2} className="w-full">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post Comment"}
          </Button>
        </section>
      </SheetContent>
    </Sheet>
  );
};

export default MotionThread;