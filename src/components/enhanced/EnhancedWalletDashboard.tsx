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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useEnhancedProfile } from "@/hooks/useEnhancedProfile";
import PsychometricTestingCenter from "../psychometric/PsychometricTestingCenter";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { useSovereignWallet } from "@/hooks/useSovereignWallet";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
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
  Activity,
  Hash,
  Clock,
  Fingerprint,
  Info,
  Copy,
  Check,
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

interface CreditSimulation {
  current_score: number | string;
  simulated_score: number;
  actions: string[];
}

const EnhancedWalletDashboard: React.FC = () => {
  const { profile, loading, updateProfile } = useEnhancedProfile();
  const {
    balance: walletBalance,
    loading: balanceLoading,
    fiatProvisioned,
    usdcProvisioned,
    usdcAddress,
  } = useWalletBalance();

  const [stableUserId, setStableUserId] = useState<string | null>(null);
  const [setupMode, setSetupMode] = useState<"create" | "import" | "view-seed">("create");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    console.log("[IDENTITY_SYNC:START] Evaluating profile hydration state...");
    try {
      const resolvedId = profile?.id || profile?.user_id;
      if (resolvedId && resolvedId !== stableUserId) {
        console.log(`[IDENTITY_SYNC:LOCK] Identity Verified: ${resolvedId}`);
        setStableUserId(resolvedId);
      }
    } catch (err: any) {
      console.error(`[IDENTITY_SYNC:ERROR] ${err.message}`);
    }
  }, [profile, stableUserId]);

  const { globalWalletAddress, isHydrating, syncWalletToSupabase } = useSovereignWallet(stableUserId);
  const { wallet: nativeWallet, hasWallet, createWallet, importWallet, getSeedPhrase } = useWallet();
  const localAddress = nativeWallet?.address;

  const handleCreateWallet = async () => {
    try {
      const newWallet = await createWallet();
      if (newWallet?.address) {
        const seed = await getSeedPhrase();
        return { address: newWallet.address, mnemonic: seed || "" };
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const handleImportWallet = async (seedPhrase: string) => {
    try {
      return await importWallet(seedPhrase);
    } catch (error) {
      return false;
    }
  };

  const handleGetSeedPhrase = async (): Promise<string | null> => {
    try {
      return await getSeedPhrase();
    } catch (error) {
      return null;
    }
  };

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [creditSimulation, setCreditSimulation] = useState<CreditSimulation | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [showNFCModal, setShowNFCModal] = useState(false);
  const [showSendRequestModal, setShowSendRequestModal] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  const displayAddress = globalWalletAddress || localAddress;
  const isProvisioned = !!displayAddress;
  const hasFBO = !!profile?.fbo_account_id;

  const linkedPairsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!stableUserId || !hasWallet || !localAddress) return;
    const pairKey = `${stableUserId}:${localAddress.toLowerCase()}`;
    if (linkedPairsRef.current.has(pairKey)) return;
    linkedPairsRef.current.add(pairKey);
    syncWalletToSupabase(localAddress);
  }, [hasWallet, localAddress, stableUserId, globalWalletAddress]);

  useEffect(() => {
    if (stableUserId) {
      fetchTransactions(stableUserId);
    }
  }, [stableUserId]);

  const fetchTransactions = async (userId: string) => {
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

      const mappedTx = (txResult.data || [])
        .map((tx: any) => {
          try {
            if (tx.amount === null || tx.amount === undefined) return null;
            const strictCurrency = tx.currency || tx.metadata?.currency;
            return {
              id: tx.id,
              transaction_type: tx.transaction_type,
              amount: Number(tx.amount),
              description: tx.description || "UNLABELED_TRANSACTION",
              source: strictCurrency || "USD",
              created_at: tx.created_at,
              metadata: tx.metadata || {},
            };
          } catch (err) {
            return null;
          }
        })
        .filter(Boolean) as Transaction[];

      const mappedSynapse = (synapseResult.data || [])
        .map((syn: any) => {
          try {
            let sourceAsset = "CREDS";
            let atomicAmount = syn.amount_usdc ?? syn.amount_idia_usd ?? syn.amount ?? 0;

            if (syn.amount_usdc !== null) sourceAsset = "USDC";
            else if (syn.amount_idia_usd !== null) sourceAsset = "IDIA";

            return {
              id: syn.id,
              transaction_type: "synapse_ledger_event",
              amount: atomicAmount > 0 ? -Math.abs(atomicAmount) : atomicAmount,
              description: syn.description || "SYNAPSE_CREDIT_EVENT",
              source: sourceAsset,
              created_at: syn.created_at,
              metadata: { type: "synapse_ledger_event", original_data: syn },
            };
          } catch (err) {
            return null;
          }
        })
        .filter(Boolean) as Transaction[];

      setTransactions(
        [...mappedTx, ...mappedSynapse].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      );
    } catch (error: any) {
      console.error(`[FETCH_LEDGERS:FAILURE] ${error.message}`);
    }
  };

  const handleCopyMetadata = () => {
    if (!selectedTransaction?.metadata) return;
    setIsCopying(true);
    const json = JSON.stringify(selectedTransaction.metadata, null, 2);
    navigator.clipboard.writeText(json);
    toast({
      title: "Ledger Copied",
      description: "Cryptographic artifacts stored to clipboard.",
    });
    setTimeout(() => setIsCopying(false), 2000);
  };

  const handleCalculateScore = async (moduleScores: Record<string, number>) => {
    setIsCalculating(true);
    try {
      const { tut, ...actualTelemetry } = moduleScores;
      const { data, error } = await supabase.functions.invoke("calculate-trust-score", {
        body: { user_id: stableUserId, telemetry: actualTelemetry },
      });
      if (error) throw error;
      if (updateProfile) {
        await updateProfile({
          trust_score: data.trust_score,
          available_credit_line: data.credit_line,
        });
      }
      setCreditSimulation({
        current_score: profile?.trust_score ?? "NO SCORE",
        simulated_score: data.trust_score,
        actions: ["Psychometric telemetry verified via IDIA Protocol", "Capital limit recalculated"],
      });
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setIsCalculating(false);
      setShowTestModal(false);
      setTimeout(() => fireFinaleConfetti(), 400);
    }
  };

  const getTransactionIcon = (type: string, currency: string) => {
    if (type === "synapse_ledger_event") return BrainCircuit;
    if (currency === "USDC") return Shield;
    switch (type) {
      case "DATA_SALE_PAYOUT":
      case "data_sale":
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

  const getTransactionColor = (amount: number) => (amount > 0 ? "text-green-600" : "text-red-600");

  const formatAmount = (amount: number, currency: string) => {
    const prefix = amount > 0 ? "+" : "";
    return `${prefix}${Math.abs(amount).toFixed(2)} ${currency}`;
  };

  if (loading || balanceLoading || isHydrating) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3"></div>
        <div className="h-32 bg-muted rounded"></div>
        <div className="h-64 bg-muted rounded"></div>
      </div>
    );
  }

  const TestModal = () => (
    <Dialog open={showTestModal} onOpenChange={setShowTestModal}>
      <DialogTrigger asChild>
        <Button className="w-full font-bold shadow-lg shadow-orange-500/30 bg-gradient-to-r from-teal-500 to-orange-500 hover:from-teal-600 hover:to-orange-600 text-white">
          {isCalculating ? "Calculating..." : "Need an advance? Take our Tests"} <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background p-0 border-none">
        <DialogHeader className="sr-only">
          <DialogTitle>Psychometric Validation</DialogTitle>
          <DialogDescription>Establish Trust Score via telemetry modules.</DialogDescription>
        </DialogHeader>
        <PsychometricTestingCenter onCompleteAll={handleCalculateScore} onCancel={() => setShowTestModal(false)} />
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
          <Card className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Total Balance</h2>
                <Wallet className="w-6 h-6 opacity-50" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <p className="text-teal-100 text-[10px] font-medium uppercase font-bold">Fiat (USD)</p>
                  <p className="text-xl font-black">${walletBalance?.cash_balance?.toFixed(2) || "0.00"}</p>
                </div>
                <div className="text-center border-x border-white/20">
                  <p className="text-teal-100 text-[10px] font-medium uppercase font-bold">Stable USDC</p>
                  <p className="text-xl font-black">${walletBalance?.usdc_balance?.toFixed(2) || "0.00"}</p>
                </div>
                <div className="text-center">
                  <p className="text-teal-100 text-[10px] font-medium uppercase font-bold">IDIA Token</p>
                  <p className="text-xl font-black">{walletBalance?.idia_token_balance?.toFixed(2) || "0.00"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-4">
            <Button
              className="h-14 flex-col bg-teal-600 hover:bg-teal-700 text-xs"
              onClick={() => setShowSendRequestModal(true)}
            >
              <div className="flex space-x-1 mb-1">
                <ArrowUpRight className="w-4 h-4" />
                <ArrowDownLeft className="w-4 h-4" />
              </div>{" "}
              Send/Req
            </Button>
            <Button variant="outline" className="h-14 flex-col text-xs" onClick={() => setShowNFCModal(true)}>
              <Smartphone size={18} className="mb-1" /> NFC Pay
            </Button>
            <Button
              variant="outline"
              className="h-14 flex-col text-xs"
              onClick={() => setShowAddFundsModal(true)}
              disabled={!fiatProvisioned && !usdcProvisioned}
            >
              <Plus size={18} className="mb-1" /> Add Funds
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="flex-1 min-h-0 overflow-hidden mt-2">
          <div className="h-full overflow-y-auto no-scrollbar pr-1" style={{ WebkitOverflowScrolling: "touch" }}>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground italic">No verified ledger records found.</div>
            ) : (
              <div className="space-y-3 pb-24">
                {transactions.map((tx) => {
                  const Icon = getTransactionIcon(tx.transaction_type, tx.source);
                  return (
                    <div
                      key={tx.id}
                      onClick={() => {
                        console.log(`[LEDGER_AUDIT] Opening receipt for: ${tx.id}`);
                        setSelectedTransaction(tx);
                      }}
                      className="flex items-center space-x-3 p-3 border rounded-xl bg-card transition-all active:scale-[0.98] hover:bg-slate-50 border-slate-100 cursor-pointer shadow-sm"
                    >
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Icon size={18} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate text-slate-800">{tx.description}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-medium text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </p>
                          <Badge
                            variant="outline"
                            className="text-[8px] h-3.5 px-1 uppercase font-black tracking-tighter opacity-60"
                          >
                            {tx.source}
                          </Badge>
                        </div>
                      </div>
                      <div className={`font-black text-xs shrink-0 ${getTransactionColor(tx.amount)}`}>
                        {formatAmount(tx.amount, tx.source)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="credit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Capital Advancement</CardTitle>
            </CardHeader>
            <CardContent>
              {creditSimulation ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-xs text-muted-foreground">Current</p>
                      <p className="text-xl font-bold">{creditSimulation.current_score}</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg bg-green-50/30">
                      <p className="text-xs text-muted-foreground">Updated</p>
                      <p className="text-xl font-bold text-green-600">{creditSimulation.simulated_score}</p>
                    </div>
                  </div>
                  <div className="pt-4">
                    <TestModal />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 flex flex-col items-center">
                  <BrainCircuit className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground max-w-xs mb-6">
                    Limits are calculated via verifiable behavioral telemetry.
                  </p>
                  <TestModal />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" /> Security & Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span>Self-Custody Status</span>
                <Badge variant={isProvisioned ? "default" : "destructive"}>
                  {isProvisioned ? "Connected" : "Not Linked"}
                </Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>FBO Rail Status</span>
                <Badge variant={hasFBO ? "default" : "secondary"}>{hasFBO ? "Connected" : "Not Linked"}</Badge>
              </div>
              <div className="mt-6 pt-4 border-t">
                {isProvisioned ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-secondary/50 rounded-lg border">
                      <p className="text-xs text-muted-foreground mb-1">Global Vault Attached</p>
                      <p className="font-mono text-xs break-all">{displayAddress}</p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setSetupMode("view-seed");
                        setIsSetupModalOpen(true);
                      }}
                    >
                      <Shield className="w-4 h-4 mr-2" /> Reveal Recovery Phrase
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <Button
                      onClick={() => {
                        setSetupMode("create");
                        setIsSetupModalOpen(true);
                      }}
                    >
                      <Shield className="w-4 h-4 mr-2" /> Create
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSetupMode("import");
                        setIsSetupModalOpen(true);
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" /> Import
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* --- AUDIT RECEIPT POP-UP (ACCESSIBILITY FIXED) --- */}
      <Dialog open={!!selectedTransaction} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none rounded-3xl shadow-2xl bg-white">
          <DialogHeader className="p-0">
            <div className="bg-teal-700 p-8 text-white relative">
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-1">
                  <DialogTitle className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 m-0">
                    Sovereign Receipt
                  </DialogTitle>
                  <DialogDescription className="font-mono text-[9px] opacity-40 text-white">
                    ID: {selectedTransaction?.id}
                  </DialogDescription>
                </div>
                <Activity className="w-8 h-8 opacity-20" />
              </div>
              <div className="text-center py-4">
                <p className="text-[11px] font-bold uppercase tracking-widest opacity-60 mb-1">Verified Amount</p>
                <h2 className="text-4xl font-black tracking-tight">
                  {selectedTransaction && formatAmount(selectedTransaction.amount, selectedTransaction.source)}
                </h2>
                <Badge className="mt-4 bg-white/10 hover:bg-white/20 border-white/20 text-[10px] font-black uppercase tracking-widest px-3 py-1">
                  {selectedTransaction?.transaction_type?.replace(/_/g, " ")}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <Clock size={12} /> Verification Time
                </div>
                <p className="text-sm font-bold text-slate-800">
                  {selectedTransaction && new Date(selectedTransaction.created_at).toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <Hash size={12} /> Asset Rail
                </div>
                <p className="text-sm font-bold text-slate-800">{selectedTransaction?.source}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <Info size={12} /> Description
              </div>
              <p className="text-sm text-slate-700 leading-relaxed font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
                {selectedTransaction?.description}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <Fingerprint size={12} /> Ledger Metadata
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[9px] font-bold uppercase text-teal-700 hover:text-teal-800 hover:bg-teal-50"
                  onClick={handleCopyMetadata}
                >
                  {isCopying ? <Check size={10} className="mr-1" /> : <Copy size={10} className="mr-1" />}
                  {isCopying ? "Copied" : "Copy Raw"}
                </Button>
              </div>
              <div className="bg-slate-900 rounded-2xl p-4 font-mono text-[10px] text-teal-400 max-h-48 overflow-y-auto custom-scrollbar border border-slate-800 shadow-inner">
                <pre className="whitespace-pre-wrap break-all">
                  {JSON.stringify(selectedTransaction?.metadata, null, 2)}
                </pre>
              </div>
            </div>

            <Button
              className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold h-12 rounded-2xl transition-all shadow-lg shadow-teal-900/20"
              onClick={() => setSelectedTransaction(null)}
            >
              Close Verification
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <NFCPayrollModal isOpen={showNFCModal} onClose={() => setShowNFCModal(false)} />
      <SendRequestModal isOpen={showSendRequestModal} onClose={() => setShowSendRequestModal(false)} />
      <AddFundsModal
        isOpen={showAddFundsModal}
        onClose={() => setShowAddFundsModal(false)}
        fiatEnabled={fiatProvisioned}
        usdcEnabled={usdcProvisioned}
        usdcAddress={usdcAddress || displayAddress}
      />
      <WalletSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        mode={setupMode}
        onCreateWallet={handleCreateWallet}
        onImportWallet={handleImportWallet}
        getSeedPhrase={handleGetSeedPhrase}
        walletAddress={displayAddress}
      />
    </div>
  );
};

export default EnhancedWalletDashboard;
