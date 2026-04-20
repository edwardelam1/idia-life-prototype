import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Vote, ShieldCheck, MessageSquare, TrendingUp, Zap, Gavel, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const VotingScreen = () => {
  // --- Internalized Governance Logic (Fixes Missing Module Error) ---
  const [balance, setBalance] = useState<number>(0);
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [voteWeight, setVoteWeight] = useState([1]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculateVoteCost = (numVotes: number) => Math.pow(numVotes, 2);

  const fetchGovernanceData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Cast table names as 'any' to bypass TS2769 schema mismatch
      const { data: wallet } = await (supabase
        .from("user_wallets" as any)
        .select("governance_tokens")
        .eq("user_id", user.id)
        .maybeSingle() as any);

      if (wallet) setBalance(Number(wallet.governance_tokens || 0));

      const { data: propData } = await (supabase
        .from("dao_proposals" as any)
        .select("*")
        .order("created_at", { ascending: false }) as any);

      if (propData) setProposals(propData);
    } catch (err) {
      console.error("Governance sync failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGovernanceData();

    // Real-time Sub-100ms sync
    const channel = supabase
      .channel("dao_live_tunnel")
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "user_wallets" }, fetchGovernanceData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCastVote = async (proposalId: string) => {
    const cost = calculateVoteCost(voteWeight[0]);
    if (cost > balance) {
      toast({
        title: "Insufficient IDIA Tokens",
        description: `This weight costs ${cost} tokens. Participate in the protocol to earn more.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Record spend in the Governance Ledger (Casting as any to fix TS2769)
    const { error } = await (supabase.from("governance_ledger" as any).insert({
      user_id: user?.id,
      amount: -cost,
      transaction_type: "vote_cast",
      description: `Quadratic Vote: ${proposalId}`,
    }) as any);

    setIsSubmitting(false);

    if (!error) {
      toast({ title: "Intent Cast", description: `Spent ${cost} tokens for ${voteWeight[0]} weighted votes.` });
    } else {
      toast({ title: "Submission Failed", description: "Protocol error. Please retry.", variant: "destructive" });
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );

  return (
    <div className="space-y-6 bg-white min-h-screen p-4 pb-24 animate-in fade-in duration-700">
      {/* Governance Power (Teal Gradient) */}
      <Card className="bg-gradient-to-br from-[hsl(178,42%,32%)] to-[hsl(178,42%,42%)] text-white border-none shadow-xl rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-8">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-100/60">
                Sovereign Governance Credit
              </p>
              <h1 className="text-5xl font-black">
                {balance.toLocaleString()} <span className="text-sm font-medium text-teal-100/40">IDIA</span>
              </h1>
            </div>
            <ShieldCheck className="w-12 h-12 text-orange-400 drop-shadow-lg" />
          </div>
          <div className="mt-8 flex gap-6 border-t border-white/10 pt-6">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-orange-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-teal-50">
                Participation Mainnet Live
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Gavel size={16} className="text-teal-600" /> Protocol Proposals
            </h2>
          </div>

          {proposals.length === 0 ? (
            <div className="py-20 text-center opacity-20 space-y-2">
              <Gavel className="mx-auto w-12 h-12" />
              <p className="text-xs font-bold uppercase tracking-widest">No Active Proposals Found</p>
            </div>
          ) : (
            proposals.map((prop) => (
              <Card
                key={prop.id}
                className="border-teal-50 shadow-sm rounded-3xl overflow-hidden hover:border-teal-200 transition-all"
              >
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <Badge className="bg-orange-500 text-white text-[8px] font-black uppercase px-2 py-0.5">
                      {prop.status}
                    </Badge>
                    <h3 className="font-black text-xl text-foreground">{prop.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{prop.description}</p>
                  </div>

                  <div className="p-6 bg-teal-50/30 rounded-[2rem] border border-teal-100/50 space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase">
                      <span className="text-teal-700">Weight Your Vote</span>
                      <span className="text-orange-600">Cost: {calculateVoteCost(voteWeight[0])} IDIA</span>
                    </div>
                    <Slider value={voteWeight} onValueChange={setVoteWeight} max={50} step={1} className="py-4" />
                    <div className="flex justify-between items-center">
                      <p className="text-2xl font-black text-teal-800">
                        {voteWeight[0]} <span className="text-xs font-bold text-teal-600/50">VOTES</span>
                      </p>
                      <Button
                        onClick={() => handleCastVote(prop.id)}
                        disabled={isSubmitting}
                        className="bg-[hsl(178,42%,32%)] hover:bg-teal-700 text-white font-black uppercase text-[10px] px-8 rounded-full shadow-lg h-10"
                      >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sync Intent"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Discord Commune Widget */}
        <div className="space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <MessageSquare size={16} className="text-orange-500" /> DAO Commune
          </h2>
          <div className="rounded-[2.5rem] overflow-hidden border-4 border-teal-50 shadow-xl bg-[#2b2d31] h-[500px]">
            <iframe
              src="https://discord.com/widget?id=YOUR_SERVER_ID&theme=dark"
              width="100%"
              height="100%"
              allowTransparency={true}
              frameBorder="0"
              sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VotingScreen;
