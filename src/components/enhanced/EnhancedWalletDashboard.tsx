import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AddFundsModal from "../AddFundsModal";
import WalletSetupModal from "../WalletSetupModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useEnhancedProfile } from "@/hooks/useEnhancedProfile";
import PsychometricTestingCenter from "../psychometric/PsychometricTestingCenter";
import type { TestId } from "../psychometric/testBank";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { useSovereignWallet } from "@/hooks/useSovereignWallet";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import NFCPayrollModal from "../NFCPayrollModal";
import SendRequestModal from "../SendRequestModal";
import { fireFinaleConfetti } from "../psychometric/confetti";
import {
  Wallet,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Shield,
  Download,
  Smartphone,
  Plus,
  BrainCircuit,
  ArrowRight,
  AlertOctagon,
  FileText,
  Fingerprint,
  ExternalLink,
  Clock,
  Hash,
} from "lucide-react";

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  description: string;
  source: string;
  created_at: string;
  metadata?: any;
}

// ... (Previous CreditSimulation interface and component setup remains same)

const EnhancedWalletDashboard: React.FC = () => {
  // ... (All previous hooks and state remain same)
  const { profile, loading, updateProfile } = useEnhancedProfile();
  const {
    balance: walletBalance,
    loading: balanceLoading,
    fiatProvisioned,
    usdcProvisioned,
    usdcAddress,
  } = useWalletBalance();

  const [stableUserId, setStableUserId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null); // NEW: Detail State
  const [activeTab, setActiveTab] = useState("overview");
  const [showNFCModal, setShowNFCModal] = useState(false);
  const [showSendRequestModal, setShowSendRequestModal] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [setupMode, setSetupMode] = useState<"create" | "import" | "view-seed">("create");

  // ... (Identity sync, wallet creation, and fetchTransactions functions remain identical)

  useEffect(() => {
    if (stableUserId) {
      fetchTransactions(stableUserId);
    }
  }, [stableUserId]);

  const fetchTransactions = async (userId: string) => {
    console.log("[FETCH_LEDGERS:START] Querying strictly verified ledger databases...");
    // ... (Your existing mapping logic for Standard and Synapse ledgers)
    try {
      const [txResult, synapseResult] = await Promise.all([
        supabase
          .from("transactions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("synapse_credit_ledger")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);

      if (txResult.error) throw txResult.error;
      if (synapseResult.error) throw synapseResult.error;

      const mappedTx = (txResult.data || []).map((tx: any) => ({
        id: tx.id,
        transaction_type: tx.transaction_type,
        amount: Number(tx.amount),
        description: tx.description || "UNLABELED_TRANSACTION",
        source: tx.currency || tx.metadata?.currency || "USD",
        created_at: tx.created_at,
        metadata: tx.metadata || {},
      }));

      const mappedSynapse = (synapseResult.data || []).map((syn: any) => {
        let sourceAsset = "COMPUTE_CREDITS";
        let atomicAmount = syn.amount;
        if (syn.amount_usdc) {
          sourceAsset = "USDC";
          atomicAmount = syn.amount_usdc;
        } else if (syn.amount_idia_usd) {
          sourceAsset = "IDIA";
          atomicAmount = syn.amount_idia_usd;
        }

        return {
          id: syn.id,
          transaction_type: "synapse_ledger_event",
          amount: atomicAmount > 0 ? -Math.abs(atomicAmount) : atomicAmount,
          description: syn.description || "SYNAPSE_CREDIT_EVENT",
          source: sourceAsset,
          created_at: syn.created_at,
          metadata: { type: "synapse_ledger_event", original_data: syn },
        };
      });

      const combinedHistory = [...mappedTx, ...mappedSynapse].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setTransactions(combinedHistory);
      console.log(`[FETCH_LEDGERS:SUCCESS] Hydrated ${combinedHistory.length} total verification events.`);
    } catch (err: any) {
      console.error(`[FETCH_LEDGERS:CRITICAL_FAILURE] Sync stalled: ${err.message}`);
    }
  };

  const getTransactionIcon = (type: string, currency: string) => {
    if (currency === "UNKNOWN_CURRENCY" || currency === "UNKNOWN_ASSET") return AlertOctagon;
    if (type === "synapse_ledger_event") return BrainCircuit;
    if (currency === "USDC") return Shield;
    if (currency === "IDIA") return BrainCircuit;
    switch (type) {
      case "DATA_SALE_PAYOUT":
        return TrendingUp;
      case "payment_sent":
        return ArrowUpRight;
      case "payment_received":
        return ArrowDownLeft;
      case "nfc_payroll":
        return Smartphone;
      default:
        return CreditCard;
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    const prefix = amount > 0 ? "+" : "";
    const value = Math.abs(amount).toFixed(2);
    return `${prefix}${value} ${currency}`;
  };

  // --- NEW: TRANSACTION DETAIL COMPONENT ---
  const TransactionDetailDialog = () => (
    <Dialog open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
      <DialogContent className="max-w-md bg-white rounded-3xl border-none p-0 overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-br from-teal-600 to-teal-800 p-8 text-white relative">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Receipt Hash</p>
              <p className="font-mono text-[9px] opacity-60 break-all">{selectedTx?.id}</p>
            </div>
            <FileText className="w-8 h-8 opacity-20" />
          </div>

          <div className="mt-8 text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest opacity-70">Amount Transacted</p>
            <h2 className="text-4xl font-black mt-1">
              {selectedTx && formatAmount(selectedTx.amount, selectedTx.source)}
            </h2>
            <Badge className="mt-4 bg-white/20 hover:bg-white/30 text-[10px] border-none px-3">
              {selectedTx?.transaction_type?.replace(/_/g, " ").toUpperCase()}
            </Badge>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                <Clock size={12} /> Timestamp
              </div>
              <p className="text-sm font-bold text-slate-800">
                {selectedTx && new Date(selectedTx.created_at).toLocaleString()}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                <Hash size={12} /> Asset Rail
              </div>
              <p className="text-sm font-bold text-slate-800">{selectedTx?.source}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Description</div>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              {selectedTx?.description}
            </p>
          </div>

          {/* METADATA EXTRACTOR */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
              <Fingerprint size={12} /> Verification Metadata
            </div>
            <div className="bg-slate-900 rounded-2xl p-4 font-mono text-[10px] text-teal-400 max-h-48 overflow-y-auto custom-scrollbar">
              <pre className="whitespace-pre-wrap break-all">{JSON.stringify(selectedTx?.metadata, null, 2)}</pre>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-12 rounded-2xl"
              onClick={() => setSelectedTx(null)}
            >
              Close Verification
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        <TabsList className="grid grid-cols-4 w-full bg-muted/20 shrink-0">
          <TabsTrigger value="overview" className="text-[11px] px-1">
            Overview
          </TabsTrigger>
          <TabsTrigger value="transactions" className="text-[11px] px-1">
            History
          </TabsTrigger>
          <TabsTrigger value="credit" className="text-[11px] px-1">
            Credit
          </TabsTrigger>
          <TabsTrigger value="security" className="text-[11px] px-1">
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* ... (Existing Overview Card and Buttons remain same) */}
        </TabsContent>

        <TabsContent value="transactions" className="flex-1 min-h-0 overflow-hidden mt-2">
          <div className="h-full overflow-y-auto touch-pan-y no-scrollbar pr-1">
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground italic">No verified ledger records.</div>
            ) : (
              <div className="space-y-3 pb-4">
                {transactions.map((tx) => {
                  const Icon = getTransactionIcon(tx.transaction_type, tx.source);
                  const isWarning = tx.source === "UNKNOWN_CURRENCY" || tx.source === "UNKNOWN_ASSET";
                  return (
                    <div
                      key={tx.id}
                      onClick={() => {
                        console.log(`[LEDGER_AUDIT] User selecting event for review: ${tx.id}`);
                        setSelectedTx(tx);
                      }}
                      className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-all active:scale-[0.98] hover:bg-slate-50/80 ${
                        isWarning ? "bg-red-500/10 border-red-500/50" : "bg-card border-slate-100 shadow-sm"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Icon className={`w-5 h-5 ${isWarning ? "text-red-500" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm truncate ${isWarning ? "text-red-600" : "text-slate-800"}`}>
                          {tx.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-medium text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </p>
                          <Badge
                            variant={isWarning ? "destructive" : "outline"}
                            className="text-[8px] h-3.5 px-1 font-black"
                          >
                            {tx.source}
                          </Badge>
                        </div>
                      </div>
                      <div
                        className={`font-black text-xs shrink-0 ${tx.amount > 0 ? "text-green-600" : "text-slate-900"}`}
                      >
                        {formatAmount(tx.amount, tx.source)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
        {/* ... (Other TabsContent sections remain same) */}
      </Tabs>

      {/* RENDER THE POP-UP */}
      <TransactionDetailDialog />

      {/* ... (All other Modals remain same) */}
    </div>
  );
};

export default EnhancedWalletDashboard;
