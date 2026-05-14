import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Zap, Gavel, Activity, ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import SegmentedJurisdiction, { Jurisdiction } from "./governance/SegmentedJurisdiction";
import HatsWardrobe from "./governance/HatsWardrobe";
import PendingActionsCarousel from "./governance/PendingActionsCarousel";
import ActiveProposalsList from "./governance/ActiveProposalsList";
import LifecycleTelemetry from "./governance/LifecycleTelemetry";
import MSAComplianceCard from "./governance/MSAComplianceCard";
import TreasuryFlows from "./governance/TreasuryFlows";
import CommitteesList from "./governance/CommitteesList";
import WelcomeManualGate from "./governance/WelcomeManualGate";
import CreateDaoProposalModal from "./governance/CreateDaoProposalModal";

const IDIA_CONTRACT = "0x6526F939D257E67896821c25B6C24Daa404a01FB";

const GovernanceScreen: React.FC = () => {
  const { balance, usdcProvisioned } = useWalletBalance();
  const idiaBalance = balance.idia_token_balance;
  const chainVerified = usdcProvisioned; // same Alchemy/Base provider hydrates both
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>("wyoming");
  const [userId, setUserId] = useState<string | null>(null);
  const [needsWelcomeAck, setNeedsWelcomeAck] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const ackAt = (user.user_metadata as any)?.duna_welcome_ack_at;
      if (!ackAt) {
        console.log("[GOVERNANCE] First visit detected — gating Vote page on Welcome Manual.");
        setNeedsWelcomeAck(true);
      }
    })();
  }, []);


  return (
    <div className="space-y-5 bg-white min-h-screen p-4 pb-24 animate-in fade-in duration-700">
      {/* IDIA Governance Token Card */}
      <Card className="bg-gradient-to-br from-[hsl(178,42%,32%)] to-[hsl(178,42%,42%)] text-white border-none shadow-xl rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-7">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-100/60">
                IDIA Governance Token
              </p>
              <h1 className="text-4xl font-black">
                {idiaBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })}{" "}
                <span className="text-sm font-medium text-teal-100/40">IDIA</span>
              </h1>
            </div>
            <ShieldCheck className="w-10 h-10 text-orange-400 drop-shadow-lg" />
          </div>
          <a
            href={`https://basescan.org/token/${IDIA_CONTRACT}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 flex items-center gap-2 border-t border-white/10 pt-4 hover:opacity-80 transition-opacity"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${chainVerified ? "bg-emerald-400 animate-pulse" : "bg-orange-400"}`} />
            <span className="text-[9px] font-black uppercase tracking-widest text-teal-50">
              {chainVerified ? "Live · Base Mainnet" : "Mainnet"} · {IDIA_CONTRACT.slice(0, 6)}…{IDIA_CONTRACT.slice(-4)}
            </span>
            <ExternalLink size={10} className="text-teal-100/60 ml-auto" />
          </a>
        </CardContent>
      </Card>

      {/* Jurisdiction Toggle */}
      <SegmentedJurisdiction value={jurisdiction} onChange={setJurisdiction} />

      {/* Hats Wardrobe — always visible */}
      <HatsWardrobe />

      {/* Active Portal */}
      {jurisdiction === "wyoming" ? (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2">
              <Zap size={14} className="text-orange-500" /> Pending Actions · Negative Consent
            </h2>
            <PendingActionsCarousel />
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Gavel size={14} className="text-teal-600" /> Active Proposals · Quadratic
              </h2>
              <Button
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                className="h-8 bg-[hsl(178,42%,32%)] hover:bg-[hsl(178,42%,25%)] text-white font-black uppercase text-[9px] tracking-widest rounded-full px-3"
              >
                <Plus size={12} className="mr-1" /> Submit Proposal
              </Button>
            </div>
            <ActiveProposalsList balance={idiaBalance} refreshTrigger={refreshKey} />
          </section>

          <section className="space-y-3">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2">
              <Activity size={14} className="text-teal-600" /> Lifecycle Telemetry
            </h2>
            <LifecycleTelemetry />
          </section>
        </div>
      ) : (
        <div className="space-y-5">
          <MSAComplianceCard />
          <TreasuryFlows />
          <CommitteesList />
        </div>
      )}

      {needsWelcomeAck && userId && (
        <WelcomeManualGate
          userId={userId}
          onAcknowledged={() => setNeedsWelcomeAck(false)}
        />
      )}

      <CreateDaoProposalModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => setRefreshKey((p) => p + 1)}
      />
    </div>
  );
};

export default GovernanceScreen;
