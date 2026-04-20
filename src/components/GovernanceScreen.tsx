import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Vote, Users, MessageSquare, ShieldCheck, Zap, Clock, Gavel, ArrowUpRight, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Proposal {
  id: string;
  title: string;
  description: string;
  status: string;
  vote_type: string;
  end_date: string;
  total_votes: number;
}

const VotingScreen = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [governanceTokens, setGovernanceTokens] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchGovernanceData();

    // Real-time Vote Sync
    const channel = supabase
      .channel("dao_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "dao_votes" }, () => {
        fetchGovernanceData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchGovernanceData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch User Governance Power from Wallet
      const { data: wallet } = await supabase
        .from("user_wallets")
        .select("governance_tokens")
        .eq("user_id", user.id)
        .maybeSingle();

      if (wallet) setGovernanceTokens(wallet.governance_tokens || 0);

      // 2. Fetch Active Proposals
      const { data: propData } = await supabase
        .from("dao_proposals")
        .select("*")
        .order("created_at", { ascending: false });

      if (propData) setProposals(propData as any);
    } finally {
      setLoading(false);
    }
  };

  const castQuadraticVote = async (proposalId: string, votes: number) => {
    const cost = Math.pow(votes, 2); // Quadratic Voting: Cost = n^2

    if (cost > governanceTokens) {
      toast({
        title: "Insufficient Credits",
        description: `Casting ${votes} votes costs ${cost} IDIA Tokens.`,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Submitting Vote", description: "Verifying Sybil resistance via IDIA Protocol..." });
    // Implementation for dao_votes.insert would go here
  };

  if (loading)
    return (
      <div className="p-8 animate-pulse space-y-4">
        <div className="h-32 bg-muted rounded-2xl" />
      </div>
    );

  return (
    <div className="space-y-6 bg-white min-h-screen pb-20 p-4">
      {/* Governance Power Header */}
      <Card className="bg-gradient-to-br from-[hsl(178,42%,32%)] to-[hsl(178,42%,42%)] text-white border-none shadow-xl rounded-[2rem] overflow-hidden">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-100/60">Governance Capacity</p>
              <h1 className="text-4xl font-black">
                {governanceTokens.toLocaleString()} <span className="text-sm font-medium text-teal-100/40">IDIA</span>
              </h1>
            </div>
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-white/10 flex gap-4">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-orange-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Level 4 Delegate</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-orange-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Sybil Verified</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Proposals Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Gavel size={14} className="text-teal-600" /> Active Proposals
            </h2>
            <Badge variant="outline" className="text-[9px] border-teal-100 text-teal-600">
              EIP-4824 Standard
            </Badge>
          </div>

          {proposals.map((prop) => (
            <Card key={prop.id} className="border-teal-50 shadow-sm rounded-2xl hover:border-teal-200 transition-all">
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <Badge className="bg-orange-500 text-white text-[8px] border-none uppercase font-black">
                      {prop.status}
                    </Badge>
                    <h3 className="font-black text-lg text-foreground leading-tight">{prop.title}</h3>
                  </div>
                  <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <ArrowUpRight size={18} />
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{prop.description}</p>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                    <span className="text-teal-700">Consensus Progress</span>
                    <span className="text-muted-foreground">72% of Quorum</span>
                  </div>
                  <Progress value={72} className="h-1.5 bg-teal-50" />
                </div>

                <div className="flex justify-between items-center pt-2">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Vote size={12} /> <span className="text-[10px] font-bold">1.2k Votes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={12} /> <span className="text-[10px] font-bold">2d Left</span>
                    </div>
                  </div>
                  <Button className="bg-[hsl(178,42%,32%)] hover:bg-[hsl(178,42%,42%)] text-white font-black text-[10px] uppercase h-8 px-6 rounded-full shadow-lg">
                    Vote Quadratic
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Right Column: Discord & DAO KPIs */}
        <div className="space-y-6">
          {/* Discord Widget Container */}
          <div className="space-y-3">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <MessageSquare size={14} className="text-orange-500" /> DAO Commune
            </h2>
            <div className="rounded-[2rem] overflow-hidden border border-teal-50 shadow-md bg-[#313338] h-[400px]">
              {/* Replace with actual Discord Widget ID */}
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

          {/* DAO KPI Dashboard */}
          <Card className="border-teal-50 bg-teal-50/30 shadow-none rounded-[2rem]">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-teal-800 flex items-center gap-2">
                <TrendingUp size={14} /> Health Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-xl border border-teal-100">
                  <p className="text-[8px] font-bold text-muted-foreground uppercase">Participation</p>
                  <p className="text-sm font-black text-teal-700">42.8%</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-teal-100">
                  <p className="text-[8px] font-bold text-muted-foreground uppercase">Efficiency</p>
                  <p className="text-sm font-black text-teal-700">8.2 Days</p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-bold">
                  <span className="text-teal-800">Treasury Runway</span>
                  <span className="text-teal-600">28 Months</span>
                </div>
                <Progress value={85} className="h-1 bg-white" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VotingScreen;
