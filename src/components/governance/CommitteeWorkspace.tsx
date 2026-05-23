import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, PenTool, FileText, ChevronRight, AlertCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generateACAHash } from "@/utils/acaGenerator";

const CommitteeWorkspace: React.FC = () => {
  const [activeHats, setActiveHats] = useState<any[]>([]);
  const [selectedCommittee, setSelectedCommittee] = useState<string | null>(null);
  const [proposals, setProposals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Drafting State
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchWorkspaceData = async () => {
    console.log("[COMMITTEE_WORKSPACE] BEGIN: Hydrating officer workspace telemetry.");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthenticated workspace access attempt.");

      // 1. Fetch user's active hats
      const { data: hats, error: hatsError } = await (supabase as any)
        .from("dao_hats")
        .select("hat_type")
        .eq("user_id", user.id)
        .eq("eligibility_status", "active")
        .is("revoked_at", null);

      if (hatsError) throw hatsError;
      
      setActiveHats(hats || []);
      
      // Auto-select the first committee if none is selected
      const currentCommittee = selectedCommittee || (hats && hats.length > 0 ? hats[0].hat_type : null);
      if (currentCommittee && !selectedCommittee) {
        setSelectedCommittee(currentCommittee);
      }

      // 2. Fetch proposals for the active committee
      if (currentCommittee) {
        const { data: propsData, error: propsError } = await (supabase as any)
          .from("proposals")
          .select("*")
          .eq("committee_id", currentCommittee)
          .order("created_at", { ascending: false });

        if (propsError) throw propsError;
        setProposals(propsData || []);
      }

      console.log("[COMMITTEE_WORKSPACE] SUCCESS: Workspace hydrated.");
    } catch (error: any) {
      console.error("[COMMITTEE_WORKSPACE] CRITICAL_STALL: Failed to load workspace:", error.message);
    } finally {
      setIsLoading(false);
      console.log("[COMMITTEE_WORKSPACE] END: Telemetry sync.");
    }
  };

  useEffect(() => {
    fetchWorkspaceData();
    // 15-second heartbeat for live proposal updates
    const interval = setInterval(fetchWorkspaceData, 15000);
    return () => clearInterval(interval);
  }, [selectedCommittee]);

  const handleRouteToVote = (proposalId: string) => {
    console.log(`[ROUTING] BEGIN: Transitioning to Voting Engine for proposal: ${proposalId}`);
    try {
      if (!proposalId) throw new Error("Missing proposal ID for routing.");
      
      // UNIVERSAL FALLBACK:
      window.location.href = `/governance/vote/${proposalId}`;
      
    } catch (error: any) {
      console.error(`[ROUTING] CRITICAL_STALL: Navigation to Voting Engine failed.`, error.message);
      toast({ title: "Routing Failed", description: error.message, variant: "destructive" });
    } finally {
      console.log(`[ROUTING] END: Navigation sequence triggered.`);
    }
  };

  const handleCreateProposal = async () => {
    if (!draftTitle.trim() || !draftBody.trim()) {
      toast({ title: "Validation Failed", description: "Title and body are required.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    console.log(`[COMMITTEE_WORKSPACE] BEGIN: Executing proposal draft for committee: ${selectedCommittee}`);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication lost.");

      // Generate the cryptographically secure ACA hash anchoring the proposal text to the user's identity
      const actionIdentifier = `propose_${selectedCommittee}_${Date.now()}`;
      const { hash, payload } = await generateACAHash(user.id, actionIdentifier, ["PROPOSAL_DRAFTING", "LEDGER_WRITE"]);

      const { error } = await (supabase as any).from("proposals").insert({
        committee_id: selectedCommittee,
        author_id: user.id,
        title: draftTitle,
        description: draftBody,
        status: "active_vote", 
        aca_hash_key: hash,
        aca_payload: payload
      });

      if (error) throw error;

      toast({ title: "Proposal Anchored", description: "Your motion is now live on the ledger." });
      setIsDrafting(false);
      setDraftTitle("");
      setDraftBody("");
      fetchWorkspaceData();
    } catch (error: any) {
      console.error("[COMMITTEE_WORKSPACE] CRITICAL_STALL: Proposal submission failed:", error.message);
      toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      console.log("[COMMITTEE_WORKSPACE] END: Proposal draft execution.");
    }
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-teal-600" /></div>;

  if (activeHats.length === 0) {
    return (
      <Card className="border-red-100 bg-red-50/50">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
          <h3 className="font-bold text-red-900">Restricted Access</h3>
          <p className="text-xs text-red-700 max-w-md">
            You do not currently hold any active officer hats. Please return to the Delaware Registry to apply for a committee and await compliance clearance.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Sidebar: Active Hats */}
      <div className="md:col-span-1 space-y-2">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Your Committees</h2>
        {activeHats.map((hat) => (
          <Button
            key={hat.hat_type}
            variant={selectedCommittee === hat.hat_type ? "default" : "outline"}
            className="w-full justify-start capitalize"
            onClick={() => setSelectedCommittee(hat.hat_type)}
          >
            {hat.hat_type.replace('_', ' ')}
          </Button>
        ))}
      </div>

      {/* Main Area: Proposal Ledger */}
      <div className="md:col-span-3 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
            {selectedCommittee?.replace('_', ' ')} Ledger
          </h2>
          <Button size="sm" className="bg-teal-700 hover:bg-teal-800" onClick={() => setIsDrafting(true)}>
            <PenTool className="w-4 h-4 mr-2" /> New Motion
          </Button>
        </div>

        <div className="space-y-3">
          {proposals.length === 0 ? (
            <div className="p-8 text-center border border-dashed rounded-lg bg-muted/10">
              <p className="text-xs text-muted-foreground">No active proposals in this jurisdiction.</p>
            </div>
          ) : (
            proposals.map((prop) => (
              <Card key={prop.id} className="hover:border-teal-300 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm">{prop.title}</h3>
                    <p className="text-[10px] text-muted-foreground font-mono">ACA Hash: {prop.aca_hash_key?.substring(0, 12)}...</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 bg-slate-100 rounded-full">
                      {prop.status}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleRouteToVote(prop.id)}
                      className="hover:bg-teal-50 hover:text-teal-700"
                    >
                      Enter Vote <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Drafting Modal */}
      <Dialog open={isDrafting} onOpenChange={setIsDrafting}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              Draft Official Motion
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Motion Title</label>
              <Input 
                placeholder="e.g., Allocation of 5% Yield to Louisville Hub" 
                value={draftTitle} 
                onChange={(e) => setDraftTitle(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Technical Specification & Rationale</label>
              <Textarea 
                className="min-h-[200px]" 
                placeholder="Detail the exact parameters of this motion. This text will be permanently anchored to your ACA hash..."
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDrafting(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleCreateProposal} className="bg-teal-700" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Sign & Anchor Motion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommitteeWorkspace;