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
import CommitteeWorkspace from "./governance/CommitteeWorkspace";
import ApplicationReviewQueue from "./governance/ApplicationReviewQueue";
import AuditFeed from "./governance/AuditFeed";
import WelcomeManualGate from "./governance/WelcomeManualGate";
import CreateDaoProposalModal from "./governance/CreateDaoProposalModal";
import { PROTOCOL, ACTIVE_DEPLOYMENT } from "@/config/contracts";
import { ACTION_REQUIRED_LEVEL, getAscensionLevel, type AscensionLevel } from "@/utils/governanceGate";

const IDIA_CONTRACT = PROTOCOL.idiaToken;
const IS_MAINNET = ACTIVE_DEPLOYMENT === "mainnet";

class CommitteeWorkspaceBoundary extends React.Component<{}, { hasError: boolean; error: Error | null }> {
  constructor(props: {}) {
    super(props);
    this.state = { hasError: false, error: null };
    console.log("[START] Mounting CommitteeWorkspace");
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error) {
    console.error("[ERROR] Failed to mount CommitteeWorkspace:", {
      message: error.message,
      timestamp: new Date().toISOString(),
      context: "GovernanceScreen.tsx/DelawarePortal",
    });
  }
  componentDidMount() {
    console.log("[SUCCESS] CommitteeWorkspace mounted successfully");
  }
  componentWillUnmount() {
    console.log("[END] CommitteeWorkspace mount process concluded");
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700">
          Deliberation workspace failed to mount. Check console for trace.
        </div>
      );
    }
    return <CommitteeWorkspace />;
  }
}

const GovernanceScreen: React.FC = () => {
  const { balance, usdcProvisioned, usdcAddress, refreshBalance } = useWalletBalance();
  const idiaBalance = balance.idia_token_balance;
  const chainVerified = usdcProvisioned; // same Alchemy/Base provider hydrates both
  const isSelfDelegated = !!(
    usdcAddress &&
    balance.delegatee &&
    balance.delegatee.toLowerCase() === usdcAddress.toLowerCase()
  );
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>("wyoming");
  const [userId, setUserId] = useState<string | null>(null);
  const [needsWelcomeAck, setNeedsWelcomeAck] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [ascensionLevel, setAscensionLevel] = useState<AscensionLevel>(0);
  const canSubmitProposal = ascensionLevel >= ACTION_REQUIRED_LEVEL.SUBMIT_PROPOSAL;

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

      const { data: hats } = await (supabase as any)
        .from("dao_hats")
        .select("hat_type")
        .eq("user_id", user.id)
        .eq("eligibility_status", "active")
        .is("revoked_at", null);
      const hatSet = new Set<string>((hats || []).map((h: any) => h.hat_type));
      setAscensionLevel(getAscensionLevel(hatSet));
    })();
  }, []);


  return (
    <div className="space-y-5 bg-white dark:bg-background min-h-screen p-4 pb-24 animate-in fade-in duration-700">
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
              {IS_MAINNET ? "Live · Base Mainnet" : "Mainnet"} · {IDIA_CONTRACT.slice(0, 6)}…{IDIA_CONTRACT.slice(-4)}
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
            <PendingActionsCarousel escrowTargets={PROTOCOL.escrow} />
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Gavel size={14} className="text-teal-600" /> Active Proposals · 1:1 Vote
              </h2>
              {canSubmitProposal && (
                <Button
                  size="sm"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="h-8 bg-[hsl(178,42%,32%)] hover:bg-[hsl(178,42%,25%)] text-white font-black uppercase text-[9px] tracking-widest rounded-full px-3"
                >
                  <Plus size={12} className="mr-1" /> Submit Proposal
                </Button>
              )}
            </div>
            <ActiveProposalsList
              balance={idiaBalance}
              votingPower={balance.voting_power ?? 0}
              isSelfDelegated={isSelfDelegated}
              onDelegationChanged={refreshBalance}
              refreshTrigger={refreshKey}
            />
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
          <ApplicationReviewQueue />
          <CommitteesList />
          <section className="space-y-3">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2">
              <Gavel size={14} className="text-teal-600" /> Committee Deliberations · Motion Threads
            </h2>
            <CommitteeWorkspaceBoundary />
          </section>
          <AuditFeed />
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
