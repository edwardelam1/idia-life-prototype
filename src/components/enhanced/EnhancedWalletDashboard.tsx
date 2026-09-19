import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AddFundsModal from "../AddFundsModal";
import WalletSetupModal from "../WalletSetupModal";
import SeedBackupModal from "../wallet/SeedBackupModal";
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
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { useSovereignWallet } from "@/hooks/useSovereignWallet";
import { useWallet } from "@/hooks/useWallet";
import { IS_TESTNET } from "@/config/contracts";
import { USDC_CONFIG } from "@/config/usdc";
import { NFCPayrollModal } from "../NFCPayrollModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AUTHORIZE_STAGE_LABEL } from "@/lib/authorizeStages";
import SendRequestModal from "../SendRequestModal";
import PaymentTrigger from "../PaymentTrigger";
import { fireFinaleConfetti } from "../psychometric/confetti";
import { useChainReceiveWatcher, type ChainReceipt } from "@/hooks/useChainReceiveWatcher";
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
  Activity,
  Hash,
  Clock,
  Copy,
  AlertTriangle,
  Link2,
  RefreshCw,
  Loader2,
  Vote,
  Network,
  ExternalLink,
  Lock,
  Upload,
  ShieldCheck,
  CheckCircle2,
  Fingerprint,
  Car,
  AlertCircle,
  XCircle,
} from "lucide-react";
import idiaHubLogo from "@/assets/idia-hub-logo.png.asset.json";
import { generateACAHash } from "@/utils/acaGenerator";
import { recordACA } from "@/utils/acaLedger";

// --- SOVEREIGN CONSENT MODAL ---
function SovereignConsentModal({
  extraction,
  userId,
  onAuthorized,
  onClose,
}: {
  extraction: any | null;
  userId: string | null;
  onAuthorized: () => void;
  onClose: () => void;
}) {
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [acaHash, setAcaHash] = useState<string | null>(null);

  // Reset internal state when a new extraction is selected
  useEffect(() => {
    if (extraction) {
      setIsComplete(false);
      setAcaHash(null);
    }
  }, [extraction]);

  const isOpen = !!extraction;
  const eventId = extraction?.id || "";
  const extractorName = "Commercial Extractor (Verified)";
  const licensePlate = extraction?.license_plate || "UNKNOWN";
  const timestamp = extraction?.created_at || new Date().toISOString();
  const dividendAmount = 0.75;

  const handleAuthorize = async () => {
    if (!userId || !eventId) return;
    setIsAuthorizing(true);
    try {
      // 1. HARDWARE-ANCHORED CONSENT: identical path to Strava / Ford / Nest.
      console.log(`[BEGIN: LIDD_CONSENT] Requesting biological binding for event ${eventId}`);
      const { hash, payload } = await generateACAHash(userId, "lidd_consent_authorize", [
        "DATA_MONETIZATION",
        "ALPR_INGESTION",
      ]);

      // 2. MIRROR TO THE ACA LEDGER
      await recordACA({
        userId,
        sourceId: "lidd_consent_authorize",
        consentType: "DATA_MONETIZATION_V1",
        hash,
        payload,
      });

      // 3. TRANSMIT TO LEDGER: Send the signed mandate to the cloud to unlock the event
      const { data, error } = await supabase.functions.invoke("verify-idia-life-tap", {
        body: {
          event_id: eventId,
          aca_hash_key: hash,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.success || !data?.event) {
        throw new Error("Ledger did not confirm the consent update.");
      }

      console.log(`[END: LIDD_CONSENT] Event ${eventId} status → ${data.event.payment_status}`);
      setAcaHash(hash);
      setIsComplete(true);
      toast({
        title: "Identity Verified",
        description: "Consent cryptographically signed.",
      });
    } catch (err: any) {
      console.error(`[FAIL: LIDD_CONSENT] ${err?.message}`);
      toast({
        title: "Authorization Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleDeny = () => {
    toast({
      title: "Consent Denied",
      description: "You have rejected the data monetization request.",
    });
    onClose();
  };

  const handleExit = () => {
    if (isComplete && onAuthorized) {
      onAuthorized();
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleExit()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-none rounded-3xl shadow-2xl bg-white">
        <DialogHeader className="p-0">
          <div
            className={`p-8 text-white relative transition-colors duration-500 ${isComplete ? "bg-teal-700" : "bg-indigo-700"}`}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-1">
                <DialogTitle className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 m-0 text-left">
                  {isComplete ? "Sovereign Receipt" : "Consent Action Required"}
                </DialogTitle>
                <DialogDescription className="font-mono text-[9px] opacity-40 text-white text-left">
                  ID: {eventId}
                </DialogDescription>
              </div>
              {isComplete ? (
                <CheckCircle2 className="w-8 h-8 opacity-20" />
              ) : (
                <ShieldCheck className="w-8 h-8 opacity-20" />
              )}
            </div>
            <div className="text-center py-4">
              <p className="text-[11px] font-bold uppercase tracking-widest opacity-60 mb-1">Monetization Dividend</p>
              <h2 className="text-4xl font-black tracking-tight">+${dividendAmount.toFixed(2)}</h2>
              <Badge className="mt-4 bg-white/10 hover:bg-white/20 border-white/20 text-[10px] font-black uppercase tracking-widest px-3 py-1">
                ALPR DATA INGESTION
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {isComplete ? (
            <div className="flex flex-col items-center justify-center space-y-3 py-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-2">
                <Fingerprint className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-sm text-center text-slate-600 px-4 font-medium">
                Your device has securely signed the ACA Mandate via Secure Enclave.
              </p>
              <div className="text-xs font-mono text-slate-500 bg-slate-50 p-3 rounded-lg w-full text-center break-all border border-slate-100 mt-2">
                {acaHash}
              </div>
              <Button onClick={handleExit} className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white h-12">
                Close Receipt
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <Clock size={12} /> Scan Time
                  </div>
                  <p className="text-sm font-bold text-slate-800">{new Date(timestamp).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <Car size={12} /> Asset
                  </div>
                  <p className="text-sm font-bold text-slate-800">{licensePlate}</p>
                </div>
              </div>

              <div className="space-y-3 border-t border-border pt-5">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Requesting Entity</p>
                  <p className="text-sm font-bold text-slate-800">{extractorName}</p>
                </div>

                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex items-start gap-3 mt-4">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    By authorizing, your device's Secure Enclave will cryptographically sign a CDLA mandate, unlocking
                    this data point for monetization on the Synapse Ledger.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border mt-6">
                <Button
                  variant="outline"
                  onClick={handleDeny}
                  className="h-12 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Deny
                </Button>
                <Button
                  onClick={handleAuthorize}
                  disabled={isAuthorizing}
                  className="h-12 bg-slate-900 hover:bg-slate-800 text-white shadow-lg"
                >
                  {isAuthorizing ? (
                    <span className="animate-pulse flex items-center gap-2">Signing...</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Fingerprint className="h-5 w-5" />
                      Biometric Auth
                    </span>
                  )}
                </Button>
              </div>
              <div className="mt-2">
                <Button
                  variant="ghost"
                  onClick={handleExit}
                  className="w-full text-slate-400 hover:text-slate-600 h-10"
                >
                  Exit
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --------------------------------------------------------

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  description: string;
  source: string;
  created_at: string;
  metadata?: any;
  /** True for lidd_extraction_events rows still awaiting sovereign consent. */
  pending?: boolean;
  /** Raw extraction row, present only on pending entries. */
  extraction?: any;
}

// Internal allocation / distribution line items that should not surface in the
// wallet history list. These are accounting artifacts, not user-facing transactions.
const HIDDEN_HISTORY_DESCRIPTIONS = ["regional/war chest", "Corp revenue Syn", "60% Corporate Revenue"];

function isHiddenHistoryItem(description: string): boolean {
  const d = (description || "").toLowerCase();
  return HIDDEN_HISTORY_DESCRIPTIONS.some((pattern) => d.includes(pattern.toLowerCase()));
}

async function resolveBaseBlockNumber(transactionHash: string): Promise<number | null> {
  try {
    const response = await fetch(USDC_CONFIG.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionReceipt",
        params: [transactionHash],
      }),
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const blockHex = payload?.result?.blockNumber;
    return typeof blockHex === "string" ? Number.parseInt(blockHex, 16) : null;
  } catch (error) {
    console.warn("[WALLET_HISTORY] Could not resolve Base block", error);
    return null;
  }
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
  const [selectedPendingExtraction, setSelectedPendingExtraction] = useState<any | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [synapseCredits, setSynapseCredits] = useState<number>(0);
  const [showTestModal, setShowTestModal] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [creditSimulation, setCreditSimulation] = useState<{
    current_score: number | string;
    simulated_score: number | string;
    actions: string[];
  } | null>(null);

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

  // New useWallet API — returns balances.eth, balances.idia, balances.usdc
  const {
    wallet,
    balances,
    votingPower,
    delegatee,
    loading: walletLoading,
    balancesLoading,
    activeNetworkKey,
    availableNetworks,
    switchNetwork,
    createWallet,
    importWallet,
    getSeedPhrase,
    refreshBalances,
    delegateVotes,
    provisioningStage,
    authorizationStatus,
    authorizationLoading,
    authorizationError,
    refreshAuthorization,
    authorizeWallet,
  } = useWallet();

  const [isAuthorizing, setIsAuthorizing] = useState(false);

  // Stage labels are shared with the Hub authorization hand-off screen.
  const handleAuthorizeWallet = async () => {
    setIsAuthorizing(true);
    try {
      const ok = await authorizeWallet();
      if (ok) {
        toast({
          title: "Wallet authorized",
          description: "This wallet can now purchase Synapse Credits on the Hub.",
        });
      }
    } finally {
      setIsAuthorizing(false);
    }
  };

  const hasWallet = wallet !== null;
  const localAddress = wallet?.address;

  // ── Wallet handlers ──

  const handleCreateWallet = async () => {
    try {
      const newWallet = await createWallet();
      if (newWallet?.address && stableUserId) await syncWalletToSupabase(newWallet.address);
      const seed = await getSeedPhrase();
      if (newWallet?.address) {
        const short = `${newWallet.address.slice(0, 6)}…${newWallet.address.slice(-4)}`;
        toast({
          title: "Sovereign Vault created",
          description: `${short} is now linked. Back up your recovery phrase.`,
        });
        window.dispatchEvent(new CustomEvent("vault-linked", { detail: { address: newWallet.address } }));
      }
      return newWallet ? { address: newWallet.address, mnemonic: seed || newWallet.mnemonic || "" } : null;
    } catch (error) {
      console.error("Wallet creation error:", error);
      return null;
    }
  };

  const handleImportWallet = async (seedPhrase: string) => {
    try {
      const result = await importWallet(seedPhrase);
      if (result?.address && stableUserId) await syncWalletToSupabase(result.address);
      if (result?.address) {
        const short = `${result.address.slice(0, 6)}…${result.address.slice(-4)}`;
        toast({
          title: "Wallet linked",
          description: `${short} connected to this device.`,
        });
        window.dispatchEvent(new CustomEvent("vault-linked", { detail: { address: result.address } }));
      }
      return !!result;
    } catch (error) {
      console.error("Wallet import error:", error);
      return false;
    }
  };

  const handleSyncIdiaWallet = async () => {
    if (!wallet?.address || !stableUserId) return;
    await syncWalletToSupabase(wallet.address);
  };

  const handleGetSeedPhrase = async (): Promise<string | null> => {
    try {
      return await getSeedPhrase();
    } catch (error) {
      console.error("Seed phrase error:", error);
      return null;
    }
  };

  const handleDelegateVotes = async () => {
    if (!wallet?.address) {
      toast({
        title: "Recovery phrase needed",
        description: "This device doesn't hold the keys for this wallet. Import your recovery phrase to delegate.",
      });
      setSetupMode("import");
      setIsSetupModalOpen(true);
      return;
    }
    try {
      await delegateVotes();
      toast({ title: "Voting power activated", description: "Self-delegation submitted on-chain." });
    } catch (e: any) {
      console.error("Delegation failed:", e);
      const code = e?.code || e?.info?.error?.code;
      const msg = (e?.message || "").toLowerCase();
      const isNoGas = code === "INSUFFICIENT_FUNDS" || code === -32003 || msg.includes("insufficient funds");
      if (isNoGas) {
        toast({
          title: "Not enough ETH for gas",
          description:
            "Self-delegation is an on-chain transaction on Base and needs a small amount of ETH to pay gas. Add ETH on Base to this wallet, then try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Delegation failed",
          description: e?.shortMessage || e?.message || "Try again.",
          variant: "destructive",
        });
      }
    }
  };

  // ── Native Bridge Auth Handover ──

  const handleHubTap = async (e: React.MouseEvent) => {
    e.preventDefault();
    console.log(
      "🔗 [HUB_BRIDGE_LOG][BEGIN: React.HubBridge.Initiate] Checking for active native shell bridge hooks...",
    );

    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error(
          "🚨 [HUB_BRIDGE_LOG][FATAL: React.HubBridge.SessionError] Supabase returned an error:",
          error.message,
        );
        return;
      }

      if (session) {
        if (
          (window as any).webkit &&
          (window as any).webkit.messageHandlers &&
          (window as any).webkit.messageHandlers.openExternalHub
        ) {
          console.log(
            "🔗 [HUB_BRIDGE_LOG][PROCESS: React.HubBridge.Handover] Native shell message handler found. Executing secure token handover...",
          );

          (window as any).webkit.messageHandlers.openExternalHub.postMessage({
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            expiry: session.expires_in,
          });
        } else {
          console.log(
            "🔗 [HUB_BRIDGE_LOG][PROCESS: React.HubBridge.Fallback] Running in a standard web browser context. Redirecting normally.",
          );
          window.location.href = "https://hub.thebigidia.com/dashboard";
        }
      } else {
        console.warn(
          "🚨 [HUB_BRIDGE_LOG][FATAL: React.HubBridge.SessionMissing] No active session found locally to execute handover.",
        );
        window.location.href = "https://hub.thebigidia.com/dashboard";
      }
    } catch (err: any) {
      console.error(
        `🚨 [HUB_BRIDGE_LOG][FATAL: React.HubBridge.Exception] Unhandled exception during handover: ${err.message}`,
      );
    }
  };

  // ── Refs and state ──

  const [showNFCModal, setShowNFCModal] = useState(false);
  const [showSendRequestModal, setShowSendRequestModal] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [backupModalMode, setBackupModalMode] = useState<"backup" | "restore">("backup");
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [seedBackedUp, setSeedBackedUp] = useState<boolean>(false);
  const [isCalculating, setIsCalculating] = useState(false);

  const displayAddress = globalWalletAddress || localAddress;
  const isProvisioned = !!displayAddress;

  // ── Recovery-phrase backup status ──
  useEffect(() => {
    if (!stableUserId) return;
    let active = true;
    (async () => {
      const { data } = await (supabase.from("profiles") as any)
        .select("is_seed_backed_up")
        .eq("user_id", stableUserId)
        .maybeSingle();
      if (active) setSeedBackedUp(!!data?.is_seed_backed_up);
    })();
    return () => {
      active = false;
    };
  }, [stableUserId]);

  // ── Auto-link wallet to Supabase ──
  const linkedPairsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!stableUserId || !hasWallet || !localAddress) return;
    const pairKey = `${stableUserId}:${localAddress.toLowerCase()}`;
    if (linkedPairsRef.current.has(pairKey)) return;
    linkedPairsRef.current.add(pairKey);
    syncWalletToSupabase(localAddress);
  }, [hasWallet, localAddress, stableUserId, globalWalletAddress]);

  // ── Native bridge ──
  useEffect(() => {
    const handleNativeAuthMessage = (event: MessageEvent) => {
      const type = event.data?.type;
      if (type === "IDIA_AUTH_COMPLETE") {
        console.log("📱 [NATIVE_BRIDGE] Handshake Confirmed. Transitioning to Active Dashboard.");
        window.location.href = "/dashboard";
      } else if (type === "IDIA_AUTH_CANCELLED") {
        console.log("📱 [NATIVE_BRIDGE] Auth cancelled by user or failed.");
      }
    };
    window.addEventListener("message", handleNativeAuthMessage);
    return () => window.removeEventListener("message", handleNativeAuthMessage);
  }, []);

  // ── Cross-component: open Security sub-tab + setup modal on request ──
  useEffect(() => {
    const handler = (event: any) => {
      const detailMode = event?.detail?.mode;
      setActiveTab("security");
      if (detailMode === "backup") {
        setBackupModalMode("backup");
        setIsBackupModalOpen(true);
        return;
      }
      setSetupMode(detailMode === "import" ? "import" : "create");
      setIsSetupModalOpen(true);
    };

    window.addEventListener("wallet:open-security", handler as EventListener);
    return () => window.removeEventListener("wallet:open-security", handler as EventListener);
  }, []);

  // ── On-chain receive watcher → auto-open Sovereign Receipt + add History row ──
  useChainReceiveWatcher(displayAddress, (receipt: ChainReceipt) => {
    const synthetic: Transaction = {
      id: `chain-${receipt.asset}-${receipt.observed_at}`,
      transaction_type: "chain_receive",
      amount: receipt.amount,
      description: `Received ${receipt.asset}`,
      source: receipt.asset,
      created_at: receipt.observed_at,
      metadata: { onchain: true, address: receipt.address, asset: receipt.asset, delta: receipt.amount },
    };
    setTransactions((prev) => [synthetic, ...prev]);
    setSelectedTransaction(synthetic);
    toast({
      title: `Received ${receipt.asset}`,
      description: formatAmount(receipt.amount, receipt.asset),
    });
    try {
      refreshBalances();
    } catch {}
  });

  // ── Transactions ──
  useEffect(() => {
    if (stableUserId) fetchTransactions();
  }, [stableUserId]);

  // ── Live Extraction Listener (Realtime) ──
  useEffect(() => {
    if (!stableUserId) return;

    console.log(`[REALTIME_LINK] Subscribing to extraction events for citizen: ${stableUserId}`);

    const extractionChannel = supabase
      .channel("lidd-extractions-listener")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "lidd_extraction_events",
          filter: `citizen_guid=eq.${stableUserId}`,
        },
        (payload) => {
          console.log("[REALTIME_EVENT] New extraction detected:", payload);

          // Trigger the notification
          toast({
            title: "Data Monetization Request",
            description: "A commercial entity has scanned your asset. Tap to authorize the CDLA mandate.",
            duration: 8000,
          });

          // Refresh the UI to display the new Pending Extraction request
          fetchTransactions();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[REALTIME_LINK] Connected to extraction ledger.");
        }
      });

    return () => {
      supabase.removeChannel(extractionChannel);
    };
  }, [stableUserId]);

  const fetchTransactions = async () => {
    if (!stableUserId) return;
    try {
      const [txResult, synapseResult, synapseTotalResult, pendingResult] = await Promise.all([
        supabase
          .from("transactions")
          .select("*")
          .eq("user_id", stableUserId)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("synapse_credit_ledger")
          .select("*")
          .eq("user_id", stableUserId)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase.from("synapse_credit_ledger").select("amount").eq("user_id", stableUserId),
        supabase
          .from("lidd_extraction_events")
          .select("*")
          .eq("citizen_guid", stableUserId)
          .eq("payment_status", "pending_consent")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      console.log(`[FETCH_LEDGERS] Pending consent events: ${(pendingResult.data || []).length}`);

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

      const mappedSynapseRows = (synapseResult.data || [])
        .map((syn: any) => {
          try {
            const isPurchase =
              syn.metadata?.class === "Synapse_Purchase" || syn.metadata?.product_class === "SAAS_UTILITY_PURCHASE";
            const entryType = String(syn.entry_type ?? "").toLowerCase();
            const isConsumption = ["usage", "debit", "consumption"].includes(entryType);
            const metadataAsset = String(syn.metadata?.asset ?? "").toUpperCase();
            const isRoyalty = !isPurchase && !isConsumption && (metadataAsset === "USDC" || metadataAsset === "IDIA");
            let sourceAsset = "CREDS";
            let atomicAmount = syn.amount_usdc ?? syn.amount_idia_usd ?? syn.amount ?? 0;

            if (isPurchase) {
              sourceAsset = "CR";
              atomicAmount = Number(syn.amount ?? 0);
            } else if (isConsumption) {
              sourceAsset = "CR";
              atomicAmount = -Math.abs(Number(syn.amount ?? 0));
            } else if (isRoyalty) {
              sourceAsset = metadataAsset;
              atomicAmount = Math.abs(Number(syn.amount ?? syn.amount_usdc ?? syn.amount_idia_usd ?? 0));
            } else if (syn.amount_usdc !== null) sourceAsset = "USDC";
            else if (syn.amount_idia_usd !== null) sourceAsset = "IDIA";

            return {
              id: syn.id,
              transaction_type: isPurchase ? "synapse_credit_purchase" : "synapse_ledger_event",
              amount: isPurchase
                ? Math.abs(Number(atomicAmount))
                : isRoyalty
                  ? Math.abs(Number(atomicAmount))
                  : isConsumption
                    ? atomicAmount
                    : atomicAmount > 0
                      ? -Math.abs(atomicAmount)
                      : atomicAmount,

              description: isPurchase ? "Synapse Credits Purchase" : syn.description || "SYNAPSE_CREDIT_EVENT",
              source: sourceAsset,
              created_at: syn.created_at,
              metadata: {
                type: isPurchase ? "synapse_credit_purchase" : "synapse_ledger_event",
                credits_purchased: isPurchase ? Number(syn.amount ?? 0) : undefined,
                usdc_paid: isPurchase ? Number(syn.metadata?.usd_amount ?? 0) : undefined,
                rate_usd_per_credit: isPurchase ? Number(syn.metadata?.rate_usd_per_cr ?? 0) : undefined,
                wallet_address: isPurchase ? syn.metadata?.user_wallet : undefined,
                transaction_hash: syn.blockchain_tx_hash || undefined,
                original_data: syn,
              },
            };
          } catch (err) {
            return null;
          }
        })
        .filter(Boolean) as Transaction[];

      const mappedSynapse = await Promise.all(
        mappedSynapseRows.map(async (transaction) => {
          const transactionHash = transaction.metadata?.transaction_hash;
          if (transaction.transaction_type !== "synapse_credit_purchase" || !transactionHash) return transaction;
          const blockNumber = await resolveBaseBlockNumber(transactionHash);
          return {
            ...transaction,
            metadata: { ...transaction.metadata, block_number: blockNumber },
          };
        }),
      );

      const runningTotal = (synapseTotalResult.data || []).reduce(
        (acc: number, r: any) => acc + Number(r.amount ?? 0),
        0,
      );
      setSynapseCredits(runningTotal);

      // Pending consent requests live in the same history list — they are the
      // same ledger events, awaiting a signature.
      const mappedPending: Transaction[] = (pendingResult.data || []).map((e: any) => ({
        id: e.id,
        transaction_type: "pending_consent",
        amount: 0.75,
        description: "Data Monetization Request",
        source: "USDC",
        created_at: e.created_at || e.extraction_timestamp || new Date().toISOString(),
        metadata: {},
        pending: true,
        extraction: e,
      }));

      const ZERO_DISPLAY_EPSILON = 0.00005;
      setTransactions(
        [
          ...[...mappedTx, ...mappedSynapse]
            .filter((tx) => !isHiddenHistoryItem(tx.description))
            .filter((tx) => {
              const value = Number(tx.amount);
              return Number.isFinite(value) && Math.abs(value) >= ZERO_DISPLAY_EPSILON;
            }),
          ...mappedPending,
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
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

  // ── Transaction display helpers ──
  const getTransactionIcon = (type: string, currency: string) => {
    if (type === "synapse_ledger_event" || type === "synapse_credit_purchase") return BrainCircuit;
    if (type === "chain_receive") return ArrowDownLeft;
    if (currency === "USDC") return Shield;
    switch (type) {
      case "data_sale_payout":
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
    if (currency === "CR")
      return `${prefix}${Math.abs(amount).toLocaleString(undefined, { maximumFractionDigits: 4 })} CR`;
    if (currency === "ETH") return `${prefix}${Math.abs(amount).toFixed(6)} ETH`;
    if (currency === "IDIA")
      return `${prefix}${Math.abs(amount).toLocaleString(undefined, { maximumFractionDigits: 4 })} IDIA`;
    const value = Math.abs(amount).toFixed(2);
    if (currency === "USDC") return `${prefix}${value} USDC`;
    if (currency === "IDIA Token") return `${prefix}${value} IDIA`;
    return `${prefix}$${value}`;
  };

  if (loading || balanceLoading || isHydrating || walletLoading) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3"></div>
        <div className="h-32 bg-muted rounded"></div>
        <div className="h-64 bg-muted rounded"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        <TabsList className="grid grid-cols-3 w-full bg-muted/20 shrink-0">
          <TabsTrigger value="overview" className="text-[11px] px-1">
            Overview
          </TabsTrigger>
          <TabsTrigger value="transactions" className="text-[11px] px-1">
            History
          </TabsTrigger>
          <TabsTrigger value="security" className="text-[11px] px-1">
            Security
          </TabsTrigger>
        </TabsList>

        {/* ═══ OVERVIEW TAB ═══ */}
        <TabsContent value="overview" className="flex-1 min-h-0 overflow-hidden mt-2">
          <div
            className="h-full overflow-y-auto no-scrollbar pr-1 space-y-4 pb-24"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {/* Pending consent requests now live inside the History tab. */}


            <Card className="bg-gradient-to-br from-[hsl(178,42%,32%)] to-[hsl(178,42%,42%)] text-white border-none shadow-xl rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-7">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-100/60">Total Balance</p>
                    <h2 className="text-4xl font-black">
                      ${walletBalance?.usdc_balance?.toFixed(2) || "0.00"}{" "}
                      <span className="text-sm font-medium text-teal-100/40">USDC</span>
                    </h2>
                  </div>
                  <Wallet className="w-10 h-10 text-orange-400 drop-shadow-lg" />
                </div>
                <div className="mt-6 flex items-center gap-2 border-t border-white/10 pt-4">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isProvisioned ? "bg-emerald-400 animate-pulse" : "bg-orange-400"}`}
                  />
                  <span className="text-[9px] font-black uppercase tracking-widest text-teal-50">
                    IDIA ·{" "}
                    {(walletBalance?.idia_token_balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    {!isProvisioned && " · Link vault to liquidate"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Elevated Sovereign Treasury Details */}
            {displayAddress && (
              <div className="space-y-4">
                {/* Banner when global wallet exists but device has no signing keys */}
                {!wallet && globalWalletAddress && (
                  <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-300 mt-0.5 shrink-0" />
                    <div className="flex-1 text-xs text-amber-900 dark:text-amber-100">
                      <p className="font-semibold mb-1">Wallet not on this device</p>
                      <p className="mb-2">
                        Balances are live and read-only. To sign transactions (delegate, send), import your recovery
                        phrase.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => {
                          setSetupMode("import");
                          setIsSetupModalOpen(true);
                        }}
                      >
                        <Download className="w-3 h-3 mr-1" /> Import Recovery Phrase
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Tap-to-Pay / NFC Trigger ── */}
                <PaymentTrigger />

                {/* Balances — ETH, IDIA, USDC */}
                <div className="space-y-3">
                  {/* ETH */}
                  <div className="p-3 bg-secondary/30 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">ETH (Gas)</p>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={refreshBalances}>
                        <RefreshCw className={`w-3 h-3 ${balancesLoading ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                    <p className="text-lg font-bold mt-1">
                      {balances?.eth
                        ? Number(balances.eth.balanceFormatted).toFixed(6)
                        : (walletBalance?.eth_balance ?? 0).toFixed(6)}
                      <span className="text-sm text-muted-foreground font-normal ml-1">ETH</span>
                    </p>
                  </div>

                  {/* IDIA Token */}
                  <div className="p-3 bg-gradient-to-br from-teal-50 to-blue-50 dark:from-teal-950 dark:to-blue-950 rounded-lg border">
                    <p className="text-xs text-muted-foreground">IDIA Token</p>
                    <p className="text-2xl font-bold mt-1">
                      {(balances?.idia
                        ? Number(balances.idia.balanceFormatted)
                        : (walletBalance?.idia_token_balance ?? 0)
                      ).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      <span className="text-sm text-muted-foreground font-normal ml-1">IDIA</span>
                    </p>
                  </div>

                  {/* Synapse Credits (off-chain ledger total) + Hub link */}
                  <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg border">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Synapse Credits</p>
                        <p className="text-2xl font-bold mt-1">
                          {synapseCredits.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                          <span className="text-sm text-muted-foreground font-normal ml-1">CR</span>
                        </p>
                      </div>
                      <button
                        onClick={handleHubTap}
                        className="flex flex-col items-center gap-1 shrink-0 hover:opacity-80 transition-opacity bg-transparent border-none p-0 outline-none"
                        aria-label="Visit The IDIA Hub"
                      >
                        <img
                          src={idiaHubLogo.url}
                          alt="The IDIA Hub"
                          className="w-10 h-10 rounded-lg object-cover shadow-sm"
                        />
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                          The IDIA Hub
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Voting Power */}
                <div className="p-3 bg-secondary/30 rounded-lg border">
                  <p className="text-xs text-muted-foreground">Voting Power</p>
                  <p className="text-lg font-bold mt-1">
                    {(() => {
                      const vp = votingPower ?? walletBalance?.voting_power ?? 0;
                      return Number(vp).toFixed(0);
                    })()}{" "}
                    <span className="text-sm text-muted-foreground font-normal">votes</span>
                  </p>
                  {(() => {
                    const d = delegatee ?? walletBalance?.delegatee ?? null;
                    if (d && d !== "0x0000000000000000000000000000000000000000") {
                      return (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Delegated to: {d.slice(0, 8)}...{d.slice(-6)}
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Self-delegate — readiness-aware; opens import modal if no local keys */}
                {(() => {
                  const idiaAmount = balances?.idia
                    ? Number(balances.idia.balanceFormatted)
                    : Number(walletBalance?.idia_token_balance ?? 0);
                  const ethAmount = balances?.eth
                    ? Number(balances.eth.balanceFormatted)
                    : Number(walletBalance?.eth_balance ?? 0);
                  const hasIdia = idiaAmount >= 1;
                  const hasGas = ethAmount >= 0.0001;
                  const d = (delegatee ?? walletBalance?.delegatee ?? "").toLowerCase();
                  const me = (wallet?.address ?? displayAddress ?? "").toLowerCase();
                  const isSelfDelegated = !!d && !!me && d === me;
                  const isReady = hasIdia && hasGas && !isSelfDelegated;

                  const missing: string[] = [];
                  if (!hasIdia) missing.push(`${(1 - idiaAmount).toFixed(2)} IDIA`);
                  if (!hasGas) missing.push(`${(0.0001 - ethAmount).toFixed(6)} ETH`);

                  let label = "Self-Delegate (need ≥1 IDIA & ~0.0001 ETH)";
                  if (isSelfDelegated) label = "Re-Delegate to Self";
                  else if (isReady) label = "Self-Delegate — Claim Your Voice";

                  return (
                    <div className="space-y-1.5">
                      <Button
                        onClick={handleDelegateVotes}
                        variant={isReady ? "default" : "outline"}
                        className={
                          isReady
                            ? "w-full bg-gradient-to-r from-teal-600 to-amber-500 hover:from-teal-700 hover:to-amber-600 text-white font-black shadow-lg shadow-amber-500/30 ring-2 ring-amber-300/40 animate-pulse"
                            : "w-full"
                        }
                      >
                        <Vote className="w-4 h-4 mr-2" />
                        {label}
                      </Button>
                      {!isSelfDelegated && !isReady && missing.length > 0 && (
                        <p className="text-[10px] text-muted-foreground text-center">Missing: {missing.join(", ")}</p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ═══ TRANSACTIONS TAB ═══ */}
        <TabsContent value="transactions" className="flex-1 min-h-0 overflow-hidden mt-2">
          <div className="h-full overflow-y-auto no-scrollbar pr-1" style={{ WebkitOverflowScrolling: "touch" }}>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground italic">No verified ledger records found.</div>
            ) : (
              <div className="space-y-3 pb-24">
                {transactions.map((tx) => {
                  const Icon = tx.pending ? ShieldCheck : getTransactionIcon(tx.transaction_type, tx.source);
                  return (
                    <div
                      key={tx.id}
                      onClick={() => {
                        if (tx.pending) {
                          console.log(`[LEDGER_AUDIT] Opening pending consent: ${tx.id}`);
                          setSelectedPendingExtraction(tx.extraction);
                          return;
                        }
                        console.log(`[LEDGER_AUDIT] Opening receipt for: ${tx.id}`);
                        setSelectedTransaction(tx);
                      }}
                      className={`flex items-center space-x-3 p-3 border rounded-xl transition-all active:scale-[0.98] cursor-pointer shadow-sm relative overflow-hidden ${
                        tx.pending
                          ? "border-amber-200 bg-amber-50/50 hover:bg-amber-50"
                          : "bg-card hover:bg-slate-50 border-slate-100"
                      }`}
                    >
                      {tx.pending && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400" />}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          tx.pending ? "bg-amber-100" : "bg-muted"
                        }`}
                      >
                        <Icon size={18} className={tx.pending ? "text-amber-600" : "text-muted-foreground"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-bold text-sm truncate ${tx.pending ? "text-amber-900" : "text-slate-800"}`}
                        >
                          {tx.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-[10px] font-medium ${
                              tx.pending ? "text-amber-700/70" : "text-muted-foreground"
                            }`}
                          >
                            {new Date(tx.created_at).toLocaleDateString()}
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-[8px] h-3.5 px-1 uppercase font-black tracking-tighter opacity-60 ${
                              tx.pending ? "border-amber-300 text-amber-800" : ""
                            }`}
                          >
                            {tx.pending ? "REQUIRES CONSENT" : tx.source}
                          </Badge>
                        </div>
                      </div>
                      <div
                        className={`font-semibold ${tx.pending ? "text-amber-700" : getTransactionColor(tx.amount)}`}
                      >
                        {tx.pending ? "+$0.75" : formatAmount(tx.amount, tx.source)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ═══ CREDIT TAB ═══ */}
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
                    <Dialog open={showTestModal} onOpenChange={setShowTestModal}>
                      <DialogTrigger asChild>
                        <Button className="w-full font-bold shadow-lg shadow-orange-500/30 bg-gradient-to-r from-teal-500 to-orange-500 hover:from-teal-600 hover:to-orange-600 text-white">
                          {isCalculating ? "Calculating..." : "Need an advance? Take our Tests"}{" "}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background p-0 border-none">
                        <DialogHeader className="sr-only">
                          <DialogTitle>Psychometric Validation</DialogTitle>
                          <DialogDescription>Establish Trust Score via telemetry modules.</DialogDescription>
                        </DialogHeader>
                        <PsychometricTestingCenter
                          onCompleteAll={handleCalculateScore}
                          onCancel={() => setShowTestModal(false)}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 flex flex-col items-center">
                  <BrainCircuit className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground max-w-xs mb-6">
                    Limits are calculated via verifiable behavioral telemetry.
                  </p>
                  <Dialog open={showTestModal} onOpenChange={setShowTestModal}>
                    <DialogTrigger asChild>
                      <Button className="w-full font-bold shadow-lg shadow-orange-500/30 bg-gradient-to-r from-teal-500 to-orange-500 hover:from-teal-600 hover:to-orange-600 text-white">
                        {isCalculating ? "Calculating..." : "Need an advance? Take our Tests"}{" "}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background p-0 border-none">
                      <DialogHeader className="sr-only">
                        <DialogTitle>Psychometric Validation</DialogTitle>
                        <DialogDescription>Establish Trust Score via telemetry modules.</DialogDescription>
                      </DialogHeader>
                      <PsychometricTestingCenter
                        onCompleteAll={handleCalculateScore}
                        onCancel={() => setShowTestModal(false)}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ WALLET TAB (was "Security") ═══ */}
        <TabsContent value="security" className="flex-1 min-h-0 overflow-hidden">
          <div
            className="h-full overflow-y-auto touch-pan-y no-scrollbar pr-1 space-y-4 pb-24"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {hasWallet && wallet ? (
              <>
                {/* ── Wallet Card ── */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Wallet className="w-4 h-4 text-teal-600" />
                        IDIA Wallet
                      </CardTitle>
                      {IS_TESTNET && (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs">
                          Testnet
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Sync mismatch warning */}
                    {globalWalletAddress && globalWalletAddress.toLowerCase() !== wallet.address.toLowerCase() && (
                      <div className="p-3 rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-950 space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-700 dark:text-yellow-300 mt-0.5 shrink-0" />
                          <div className="flex-1 text-xs text-yellow-900 dark:text-yellow-100">
                            <p className="font-semibold mb-1">Account linked to a different wallet</p>
                            <p>Tap below to use this IDIA wallet instead.</p>
                            <p className="font-mono text-[10px] mt-2 break-all">Linked: {globalWalletAddress}</p>
                            <p className="font-mono text-[10px] break-all">IDIA: {wallet.address}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                          onClick={handleSyncIdiaWallet}
                        >
                          <Link2 className="w-3 h-3 mr-2" />
                          Use IDIA Wallet for My Account
                        </Button>
                      </div>
                    )}

                    {/* Address */}
                    <div className="p-3 bg-secondary/50 rounded-lg border">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-muted-foreground">Wallet Address</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => navigator.clipboard.writeText(wallet.address)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="font-mono text-xs break-all text-muted-foreground mb-2">{wallet.address}</p>
                    </div>

                    {/* ── Hub Authorization ── */}
                    {(() => {
                      const mismatch =
                        !!globalWalletAddress && globalWalletAddress.toLowerCase() !== wallet.address.toLowerCase();
                      const authorized = authorizationStatus?.authorized === true;
                      const checking = authorizationLoading && !authorizationStatus;

                      // Status couldn't be determined — never accuse a working wallet.
                      if (authorizationStatus?.indeterminate) return null;

                      if (authorized) {
                        return (
                          <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40">
                            <div className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                              <div className="text-xs text-emerald-900 dark:text-emerald-100">
                                <p className="font-semibold mb-0.5">Wallet Authorized</p>
                                <p>This wallet can operate in The IDIA Hub.</p>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 space-y-2">
                          <div className="flex items-start gap-2">
                            <ShieldCheck className="w-4 h-4 text-amber-700 dark:text-amber-300 mt-0.5 shrink-0" />
                            <div className="flex-1 text-xs text-amber-900 dark:text-amber-100">
                              <p className="font-semibold mb-0.5">Wallet Authorization</p>
                              {checking ? (
                                <p>Checking this wallet's authorization…</p>
                              ) : mismatch ? (
                                <p>
                                  Your account is linked to a different wallet. Tap “Use IDIA Wallet for My Account”
                                  above first, then authorize.
                                </p>
                              ) : (
                                <p>
                                  This wallet hasn't been authorized yet, so Synapse Credit purchases on the Hub will be
                                  declined.
                                </p>
                              )}
                              {authorizationError && <p className="mt-1 font-medium">{authorizationError}</p>}
                              {!checking &&
                                !mismatch &&
                                authorizationStatus &&
                                !authorizationStatus.hasGas &&
                                !authorizationStatus.dripAvailable && (
                                  <p className="mt-1">
                                    This wallet needs a small amount of ETH on Base to complete authorization.
                                  </p>
                                )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                            disabled={mismatch || checking || isAuthorizing}
                            onClick={handleAuthorizeWallet}
                          >
                            {isAuthorizing ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                {AUTHORIZE_STAGE_LABEL[provisioningStage] ?? "Authorizing…"}
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-3 h-3 mr-2" />
                                {authorizationError ? "Retry Authorization" : "Authorize Wallet"}
                              </>
                            )}
                          </Button>
                          {!isAuthorizing && !checking && (
                            <button
                              className="w-full text-[11px] text-amber-800 dark:text-amber-200 underline"
                              onClick={() => refreshAuthorization()}
                            >
                              Re-check status
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* Network selector — only visible in test builds */}
                    {IS_TESTNET && (
                      <div>
                        <label className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                          <Network className="w-3 h-3" /> Network
                        </label>
                        <select
                          className="w-full p-2 border rounded-md text-sm bg-background"
                          value={activeNetworkKey}
                          onChange={(e) => switchNetwork(e.target.value)}
                        >
                          {availableNetworks.map(({ key, config }) => (
                            <option key={key} value={key}>
                              {config.name}
                              {config.isTestnet ? " (Testnet)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* ── MetaMask Deep Link ── */}
                <Button
                  onClick={() => {
                    console.log("[EnhancedWalletDashboard][DeepLink][START] Launching native MetaMask application");
                    window.location.href = "metamask://";
                  }}
                  className="w-full bg-[#F6851B] hover:bg-[#E2761B] text-white shadow-md shadow-orange-500/20"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Send / Receive via MetaMask
                </Button>

                {/* ── Wallet Management ── */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Shield className="w-4 h-4" />
                      Wallet Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
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

                    {/* ── Encrypted passphrase backup ── */}
                    <div className="rounded-lg border bg-secondary/40 p-3 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">Encrypted Backup</p>
                          <p className="text-[11px] text-muted-foreground">
                            {seedBackedUp ? "Recovery phrase backed up" : "Recovery phrase not backed up yet"}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={
                            seedBackedUp
                              ? "bg-teal-100 text-teal-800 text-[10px]"
                              : "bg-amber-100 text-amber-900 text-[10px]"
                          }
                        >
                          {seedBackedUp ? "Backed up" : "Action needed"}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setBackupModalMode("backup");
                          setIsBackupModalOpen(true);
                        }}
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        Back Up Recovery Phrase
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => {
                          setBackupModalMode("restore");
                          setIsBackupModalOpen(true);
                        }}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Restore from Backup File
                      </Button>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setSetupMode("import");
                        setIsSetupModalOpen(true);
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Import Different Wallet
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    {globalWalletAddress ? "Upgrade Your Wallet" : "Set Up Your IDIA Wallet"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {globalWalletAddress ? (
                      <>
                        Your account is linked to a previous wallet:
                        <br />
                        <code className="text-[10px]">
                          {globalWalletAddress.slice(0, 8)}...{globalWalletAddress.slice(-6)}
                        </code>
                        <br />
                        <br />
                        Create or import an IDIA wallet to enable full features.
                      </>
                    ) : (
                      "Create a new EVM wallet or restore from a 12-word seed phrase."
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => {
                        setSetupMode("create");
                        setIsSetupModalOpen(true);
                      }}
                      className="bg-teal-500 hover:bg-teal-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create New
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSetupMode("import");
                        setIsSetupModalOpen(true);
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Import
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
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
            {selectedTransaction?.transaction_type === "synapse_credit_purchase" && (
              <div className="space-y-3 border-t border-border pt-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">USDC Paid</p>
                    <p className="text-sm font-bold text-foreground">
                      {Number(selectedTransaction.metadata?.usdc_paid ?? 0).toFixed(2)} USDC
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Price per Credit</p>
                    <p className="text-sm font-bold text-foreground">
                      ${Number(selectedTransaction.metadata?.rate_usd_per_credit ?? 0).toFixed(2)}
                    </p>
                  </div>
                </div>
                {selectedTransaction.metadata?.wallet_address && (
                  <div>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Purchasing Wallet</p>
                    <p className="break-all font-mono text-xs text-foreground">
                      {selectedTransaction.metadata.wallet_address}
                    </p>
                  </div>
                )}
                {selectedTransaction.metadata?.transaction_hash && (
                  <div>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Base Transaction</p>
                    <a
                      href={`${USDC_CONFIG.blockExplorer}/tx/${selectedTransaction.metadata.transaction_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all font-mono text-xs text-primary underline"
                    >
                      {selectedTransaction.metadata.transaction_hash}
                    </a>
                  </div>
                )}
                {selectedTransaction.metadata?.block_number && (
                  <div>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Confirmed Base Block</p>
                    <p className="font-mono text-sm font-bold text-foreground">
                      #{Number(selectedTransaction.metadata.block_number).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── SOVEREIGN CONSENT ACTION MODAL ── */}
      <SovereignConsentModal
        extraction={selectedPendingExtraction}
        userId={stableUserId}
        onClose={() => setSelectedPendingExtraction(null)}
        onAuthorized={() => {
          setSelectedPendingExtraction(null);
          fetchTransactions();
        }}
      />

      {/* ═══ MODALS ═══ */}
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
        provisioningStage={provisioningStage}
      />
      <SeedBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        mode={backupModalMode}
        walletAddress={displayAddress}
        getSeedPhrase={handleGetSeedPhrase}
        onRestore={async (m) => {
          await handleImportWallet(m);
        }}
        onBackedUp={() => setSeedBackedUp(true)}
      />
    </div>
  );
};

export default EnhancedWalletDashboard;
