import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Zap, Gavel, Activity, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SegmentedJurisdiction, { Jurisdiction } from "./governance/SegmentedJurisdiction";
import HatsWardrobe from "./governance/HatsWardrobe";
import PendingActionsCarousel from "./governance/PendingActionsCarousel";
import ActiveProposalsList from "./governance/ActiveProposalsList";
import LifecycleTelemetry from "./governance/LifecycleTelemetry";
import MSAComplianceCard from "./governance/MSAComplianceCard";
import TreasuryFlows from "./governance/TreasuryFlows";
import CommitteesList from "./governance/CommitteesList";
import WelcomeManualGate from "./governance/WelcomeManualGate";

const IDIA_CONTRACT = "0x6526F939D257E67896821c25B6C24Daa404a01FB";
const BASE_RPC = (import.meta as any).env?.VITE_ALCHEMY_RPC_URL || "https://mainnet.base.org";
const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];

const GovernanceScreen: React.FC = () => {
  const [balance, setBalance] = useState<number>(0);
  const [chainVerified, setChainVerified] = useState<boolean>(false);
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>("wyoming");
  const [userId, setUserId] = useState<string | null>(null);
  const [needsWelcomeAck, setNeedsWelcomeAck] = useState<boolean>(false);

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

      // Resolve sovereign wallet address
      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("id", user.id)
        .maybeSingle();

      const walletAddress = (profile as any)?.wallet_address;
      if (walletAddress && walletAddress.startsWith("0x")) {
        try {
          console.log(`[GOVERNANCE] Reading on-chain IDIA for ${walletAddress} from ${IDIA_CONTRACT}`);
          const provider = new ethers.JsonRpcProvider(BASE_RPC, 8453);
          const idia = new ethers.Contract(IDIA_CONTRACT, ERC20_ABI, provider);
          const raw = await idia.balanceOf(walletAddress);
          const formatted = Number(ethers.formatEther(raw));
          console.log(`[GOVERNANCE] On-chain IDIA balance: ${formatted}`);
          setBalance(formatted);
          setChainVerified(true);
          return;
        } catch (err: any) {
          console.error(`[GOVERNANCE] On-chain read failed, falling back to ledger: ${err.message}`);
        }
      }

      const { data, error } = await supabase
        .from("wallets")
        .select("governance_tokens")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        console.error("[GOVERNANCE] Failed to load IDIA balance:", error.message);
        setBalance(0);
        return;
      }
      setBalance(Number((data as any)?.governance_tokens ?? 0));
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
                {balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}{" "}
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
            <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2">
              <Gavel size={14} className="text-teal-600" /> Active Proposals · Quadratic
            </h2>
            <ActiveProposalsList balance={balance} />
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
    </div>
  );
};

export default GovernanceScreen;
