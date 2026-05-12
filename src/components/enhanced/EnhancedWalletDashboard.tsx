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
} from "@/components/ui/dialog";
import { useEnhancedProfile } from "@/hooks/useEnhancedProfile";
import PsychometricTestingCenter from "../psychometric/PsychometricTestingCenter";
import type { TestId } from "../psychometric/testBank";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { useSovereignWallet } from "@/hooks/useSovereignWallet";
import { useWallet } from "@/hooks/useWallet"; // Seamlessly capture native wallet state
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
} from "lucide-react";

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  description: string;
  source: string; // Used to store Currency Type (USD, USDC, IDIA)
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

  // 1. Force a dedicated, stable ID state to prevent render-looping
  const [stableUserId, setStableUserId] = useState<string | null>(null);

  // 2. Add mode state for Shawn's modal
  const [setupMode, setSetupMode] = useState<"create" | "import" | "view-seed">("create");

  // 3. Deterministic ID Capture: Listen only for the moment the profile hydrates
  useEffect(() => {
    console.log("[IDENTITY_SYNC_START] Evaluating profile hydration state...");
    try {
      const resolvedId = profile?.id || profile?.user_id;
      if (resolvedId && resolvedId !== stableUserId) {
        console.log(`✅ [ID_LOCK] Identity Verified: ${resolvedId}`);
        setStableUserId(resolvedId);
      }
      console.log("[IDENTITY_SYNC_END] Hydration evaluation complete.");
    } catch (err) {
      console.error("[IDENTITY_SYNC_ERROR] Silent failure during ID lock evaluation:", err);
    }
  }, [profile, stableUserId]);

  // 4. Updated useSovereignWallet with the stable ID
  const { globalWalletAddress, isHydrating, syncWalletToSupabase } = useSovereignWallet(stableUserId);

  // 5. Pull local Web3 state exclusively from Native Wallet Infrastructure
  const { wallet: nativeWallet, hasWallet, createWallet, importWallet, getSeedPhrase } = useWallet();
  const localAddress = nativeWallet?.address;

  // 6. Define the exact strict handlers required by WalletSetupModal, routed natively
  const handleCreateWallet = async () => {
    console.log("🛡️ [WALLET_DASHBOARD_LOG] START: handleCreateWallet invoked");
    try {
      console.log("🛡️ [WALLET_DASHBOARD_LOG] ACTION: Generating secure wallet via IDIA Infrastructure");
      const newWallet = await createWallet();
      if (newWallet?.address) {
        const seed = await getSeedPhrase();
        return { address: newWallet.address, mnemonic: seed || "" };
      }
      return null;
    } catch (error) {
      console.error(`🚨 [WALLET_DASHBOARD_ERROR] Creation stalled: ${error}`);
      return null;
    } finally {
      console.log("🛡️ [WALLET_DASHBOARD_LOG] END: handleCreateWallet resolved");
    }
  };

  const handleImportWallet = async (seedPhrase: string) => {
    console.log("🛡️ [WALLET_DASHBOARD_LOG] START: handleImportWallet invoked");
    try {
      console.log("🛡️ [WALLET_DASHBOARD_LOG] ACTION: Processing seed phrase import");
      return await importWallet(seedPhrase);
    } catch (error) {
      console.error(`🚨 [WALLET_DASHBOARD_ERROR] Import stalled: ${error}`);
      return false;
    } finally {
      console.log("🛡️ [WALLET_DASHBOARD_LOG] END: handleImportWallet resolved");
    }
  };

  const handleGetSeedPhrase = async (): Promise<string | null> => {
    console.log("🛡️ [WALLET_DASHBOARD_LOG] START: handleGetSeedPhrase invoked");
    try {
      console.log("🛡️ [WALLET_DASHBOARD_LOG] ACTION: Retrieving secure seed phrase");
      return await getSeedPhrase();
    } catch (error) {
      console.error(`🚨 [WALLET_DASHBOARD_ERROR] Seed phrase retrieval stalled: ${error}`);
      return null;
    } finally {
      console.log("🛡️ [WALLET_DASHBOARD_LOG] END: handleGetSeedPhrase resolved");
    }
  };

  const syncLock = useRef(false);

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

  // --- Identity-gated, one-shot wallet link (loop-proof) ---
  const linkedPairsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    console.log("[WEB3_WATCHER_INIT] Evaluating local vs global wallet parity.");
    try {
      if (!stableUserId || !hasWallet || !localAddress) return;
      if (localAddress === globalWalletAddress) return;

      const pairKey = `${stableUserId}:${localAddress.toLowerCase()}`;
      if (linkedPairsRef.current.has(pairKey)) return;
      linkedPairsRef.current.add(pairKey);

      console.log(`🔗 [WEB3_WATCHER_EXEC] START: One-shot link Vault ${localAddress} to User ${stableUserId}.`);
      syncWalletToSupabase(localAddress);
      window.dispatchEvent(new CustomEvent("vault-linked", { detail: { address: localAddress } }));
      console.log(`🔗 [WEB3_WATCHER_EXEC] END: Link process dispatched.`);
    } catch (err) {
      console.error("[WEB3_WATCHER_ERROR] Vault link parity sequence stalled:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasWallet, localAddress, stableUserId, globalWalletAddress]);

  // --- Native App Handshake ---
  useEffect(() => {
    const handleNativeAuthMessage = (event: MessageEvent) => {
      console.log("[NATIVE_BRIDGE_MESSAGE] Incoming message evaluated.");
      try {
        if (event.data?.type === "IDIA_AUTH_COMPLETE") {
          console.log("📱 [NATIVE_BRIDGE_EXEC] Handshake Confirmed. Transitioning to Active Dashboard.");
          window.location.href = "/dashboard";
        }
      } catch (err) {
        console.error("[NATIVE_BRIDGE_ERROR] Bridge message evaluation stalled:", err);
      }
    };

    window.addEventListener("message", handleNativeAuthMessage);
    return () => window.removeEventListener("message", handleNativeAuthMessage);
  }, []);

  // --- Parallel Ledger Transaction Fetching ---
  useEffect(() => {
    if (stableUserId) {
      console.log(`[EFFECT_TRIGGER] Identity lock confirmed (${stableUserId}). Initiating parallel ledger fetch.`);
      fetchTransactions(stableUserId);
    }
  }, [stableUserId]);

  const fetchTransactions = async (userId: string) => {
    console.log("💳 [FETCH_TRANSACTIONS_START] Fetching multi-ledger transactions (Standard + Synapse)...");
    try {
      // Branch 1: Standard Transactions & Data Royalties
      console.log("💳 [FETCH_TRANSACTIONS_DB_CALL] Initiating core transaction query.");
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (txError) {
        console.error("🚨 [FETCH_TRANSACTIONS_DB_ERROR] Core transaction query rejected by Supabase:", txError);
        throw txError;
      }

      // Branch 2: Synapse Engine Credit Ledger
      console.log("💳 [FETCH_TRANSACTIONS_DB_CALL] Initiating Synapse credit ledger query.");
      const { data: synapseData, error: synapseError } = await supabase
        .from("synapse_credit_ledger")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (synapseError) {
        console.error(
          "🚨 [FETCH_TRANSACTIONS_DB_WARNING] Synapse ledger query failed (table may be uninitialized or empty):",
          synapseError,
        );
      }

      console.log(
        `💳 [FETCH_TRANSACTIONS_DATA_RECV] Ingested ${txData?.length || 0} core records and ${synapseData?.length || 0} Synapse compute records.`,
      );

      // Mapping 1: Core Standard Ledgers
      // FIX: Cast tx to 'any' to bypass strict TS enforcement of the Supabase generated schema
      const mappedTx = (txData || [])
        .map((tx: any) => {
          try {
            const typedMetadata = tx.metadata as Record<string, any> | null;
            let currencyType = tx.currency || typedMetadata?.currency;

            // HARD-LOCK: Enforce USDC on data-related payouts
            if (
              tx.transaction_type === "DATA_SALE_PAYOUT" ||
              tx.transaction_type === "data_reward" ||
              tx.transaction_type === "data_earnings" ||
              tx.transaction_type === "royalty_payout" ||
              tx.transaction_type === "data_sale" // Added from new schema enums
            ) {
              currencyType = "USDC";
            } else if (tx.transaction_type === "synapse_purchase") {
              currencyType = "USD";
            } else if (!currencyType) {
              currencyType = "USD";
            }

            return {
              id: tx.id,
              transaction_type: tx.transaction_type,
              amount: Number(tx.amount) || 0,
              description: tx.description || "Ledger Transaction",
              source: currencyType,
              created_at: tx.created_at,
              metadata: tx.metadata,
            };
          } catch (mapErr) {
            console.error(`🚨 [FETCH_TRANSACTIONS_MAPPING_ERROR] Failed mapping standard TX ${tx?.id}:`, mapErr);
            return null;
          }
        })
        .filter(Boolean) as Transaction[];

      // Mapping 2: Synapse Compute Ledgers
      // FIX: Cast syn to 'any' and use the exact schema columns for amount derivation
      const mappedSynapse = (synapseData || [])
        .map((syn: any) => {
          try {
            // Fallback through the active schema columns directly to derive the cost
            const amountVal = Number(syn.amount_usdc || syn.amount_idia_usd || syn.amount) || 0;
            return {
              id: syn.id || `syn-${Date.now()}-${Math.random()}`,
              transaction_type: "synapse_purchase",
              amount: amountVal > 0 ? -Math.abs(amountVal) : amountVal, // Ensure purchases reflect as deductions
              description: syn.description || "Synapse Engine Compute Credits",
              source: syn.amount_usdc ? "USDC" : "USD",
              created_at: syn.created_at,
              metadata: { type: "synapse_compute_allocation" },
            };
          } catch (mapErr) {
            console.error(`🚨 [FETCH_TRANSACTIONS_MAPPING_ERROR] Failed mapping Synapse TX ${syn?.id}:`, mapErr);
            return null;
          }
        })
        .filter(Boolean) as Transaction[];

      // Synthesis & Chronological Sorting
      console.log("💳 [FETCH_TRANSACTIONS_SYNTHESIS_START] Merging branch arrays into unified historical timeline.");
      const combinedHistory = [...mappedTx, ...mappedSynapse].sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setTransactions(combinedHistory);
      console.log("💳 [FETCH_TRANSACTIONS_STATE_UPDATED] Parallel ledger state array hydrated successfully.");
    } catch (error) {
      console.error(
        "🚨 [FETCH_TRANSACTIONS_CRITICAL_FAILURE] Execution stalled during multi-ledger aggregation:",
        error,
      );
    } finally {
      console.log("💳 [FETCH_TRANSACTIONS_END] fetchTransactions routine complete and network lock released.");
    }
  };

  const exportTaxableEvents = async () => {
    console.log("[EXPORT_TAX_EVENTS_START] Aggregating taxable ledger history...");
    try {
      const taxableEvents = transactions.filter(
        (t) =>
          t.transaction_type === "DATA_SALE_PAYOUT" ||
          t.transaction_type === "crypto_sale" ||
          t.transaction_type === "income" ||
          t.transaction_type === "royalty_payout" ||
          t.transaction_type === "data_sale",
      );

      const csvContent = [
        "Date,Type,Amount,Description,Tax Category",
        ...taxableEvents.map(
          (t) => `${t.created_at},${t.transaction_type},${t.amount},${t.description},Taxable Income`,
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `taxable-events-${new Date().getFullYear()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      console.log("[EXPORT_TAX_EVENTS_END] Tax payload successfully formatted and downloaded.");
    } catch (error) {
      console.error("[EXPORT_TAX_EVENTS_ERROR] Silent failure during CSV blob generation:", error);
    }
  };

  const handleCalculateScore = async (moduleScores: Record<string, number>) => {
    console.log("[SCORE_CALC_START] Firing telemetry array to remote algorithm.");
    setIsCalculating(true);
    try {
      const { tut, ...actualTelemetry } = moduleScores;
      const { data, error } = await supabase.functions.invoke("calculate-trust-score", {
        body: { user_id: stableUserId, telemetry: actualTelemetry },
      });

      if (error) {
        console.error("[SCORE_CALC_RPC_ERROR] Edge function invocation rejected:", error);
        throw error;
      }

      if (updateProfile) {
        console.log("[SCORE_CALC_UPDATE] Persisting computed matrix to user profile.");
        await updateProfile({
          trust_score: data.trust_score,
          available_credit_line: data.credit_line,
        });
      }

      setCreditSimulation({
        current_score: profile?.trust_score ?? "NO SCORE",
        simulated_score: data.trust_score,
        actions: ["Psychometric telemetry verified via IDIA Protocol", "Deterministic capital limit recalculated"],
      });
      console.log("[SCORE_CALC_SUCCESS] Financial payload accepted.");
    } catch (err) {
      console.error("[SCORE_CALC_CRITICAL_ERROR] Algorithm Execution Failed entirely:", err);
    } finally {
      setIsCalculating(false);
      setShowTestModal(false);
      setTimeout(() => fireFinaleConfetti(), 400);
      console.log("[SCORE_CALC_END] Calculation sequence terminated.");
    }
  };

  const getTransactionIcon = (type: string, currency: string) => {
    if (type === "synapse_purchase" || type === "synapse_credit_purchase") return BrainCircuit;

    if (currency === "USDC") return Shield;
    if (currency === "IDIA Token") return BrainCircuit;

    switch (type) {
      case "DATA_SALE_PAYOUT":
      case "data_reward":
      case "data_earnings":
      case "royalty_payout":
      case "data_sale":
        return TrendingUp;
      case "payment_sent":
      case "withdrawal":
        return ArrowUpRight;
      case "payment_received":
      case "payroll":
      case "deposit":
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
    const value = Math.abs(amount).toFixed(2);

    if (currency === "USDC") return `${prefix}${value} USDC`;
    if (currency === "IDIA Token") return `${prefix}${value} IDIA`;
    return `${prefix}$${value}`;
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
          <DialogDescription>Establish your cryptographic IDIA Trust Score via telemetry modules.</DialogDescription>
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
                  <p className="text-teal-100 text-[10px] font-medium uppercase">Fiat (USD)</p>
                  <p className="text-xl font-bold">${walletBalance?.cash_balance?.toFixed(2) || "0.00"}</p>
                </div>
                <div className="text-center border-x border-white/20">
                  <p className="text-teal-100 text-[10px] font-medium uppercase">Stable USDC</p>
                  <p className="text-xl font-bold">${walletBalance?.usdc_balance?.toFixed(2) || "0.00"}</p>
                </div>
                <div className="text-center">
                  <p className="text-teal-100 text-[10px] font-medium uppercase">IDIA Token</p>
                  <p className="text-xl font-bold">{walletBalance?.idia_token_balance?.toFixed(2) || "0.00"}</p>
                </div>
              </div>
              {!isProvisioned && (
                <div className="mt-4 pt-2 border-t border-white/20 text-center">
                  <p className="text-[10px] text-teal-50 italic">Link a Sovereign Vault to enable liquidation</p>
                </div>
              )}
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
              </div>
              Send/Req
            </Button>
            <Button variant="outline" className="h-14 flex-col text-xs" onClick={() => setShowNFCModal(true)}>
              <Smartphone className="w-5 h-5 mb-1" /> Direct NFC Pay
            </Button>
            <Button
              variant="outline"
              className="h-14 flex-col text-xs"
              onClick={() => setShowAddFundsModal(true)}
              disabled={!fiatProvisioned && !usdcProvisioned}
              title={!fiatProvisioned && !usdcProvisioned ? "Set up a wallet rail to add funds" : undefined}
            >
              <Plus className="w-5 h-5 mb-1" /> Add Funds
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="flex-1 min-h-0 overflow-hidden mt-2">
          <div
            className="h-full overflow-y-auto touch-pan-y no-scrollbar pr-1"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground italic">
                No multi-currency records found in IDIA Protocol
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                {transactions.map((tx) => {
                  const Icon = getTransactionIcon(tx.transaction_type, tx.source);
                  return (
                    <div key={tx.id} className="flex items-center space-x-3 p-3 border rounded-lg bg-card">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Icon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{tx.description}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </p>
                          <Badge variant="outline" className="text-[9px] h-4 py-0 px-1 uppercase opacity-70">
                            {tx.source}
                          </Badge>
                        </div>
                      </div>
                      <div className={`font-semibold ${getTransactionColor(tx.amount)}`}>
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
                <Shield className="w-5 h-5" />
                Security & Identity
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

                    <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                      <p className="text-sm font-medium">Recovery Phrase</p>
                      <p className="text-xs text-muted-foreground">
                        Your 12-word phrase is the only way to restore this wallet. Never share it with anyone.
                      </p>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setSetupMode("view-seed");
                          setIsSetupModalOpen(true);
                        }}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Reveal Recovery Phrase
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <Button
                      className="w-full bg-primary hover:bg-primary/90"
                      onClick={() => {
                        setSetupMode("create");
                        setIsSetupModalOpen(true);
                      }}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Create Account
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setSetupMode("import");
                        setIsSetupModalOpen(true);
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Import
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <NFCPayrollModal isOpen={showNFCModal} onClose={() => setShowNFCModal(false)} />
      <SendRequestModal isOpen={showSendRequestModal} onClose={() => setShowSendRequestModal(false)} />
      <AddFundsModal
        isOpen={showAddFundsModal}
        onClose={() => setShowAddFundsModal(false)}
        fiatEnabled={fiatProvisioned}
        usdcEnabled={usdcProvisioned}
        usdcAddress={usdcAddress || globalWalletAddress || nativeWallet?.address || null}
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
