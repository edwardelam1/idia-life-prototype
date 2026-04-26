import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { supabase } from "@/integrations/supabase/client";
import NFCPayrollModal from "../NFCPayrollModal";
import SendRequestModal from "../SendRequestModal";
import AddFundsModal from "../AddFundsModal";
import { fireFinaleConfetti } from "../psychometric/confetti";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useSignMessage } from "wagmi";
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
  Fingerprint,
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
  const { balance: walletBalance, loading: balanceLoading } = useWalletBalance();

  // 1. Pull the universal cross-device state from Supabase
  const { globalWalletAddress, isHydrating, syncWalletToSupabase } = useSovereignWallet(profile?.user_id);

  // 2. Pull local Web3 state
  const { address: localAddress, isConnected: isLocalConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [creditSimulation, setCreditSimulation] = useState<CreditSimulation | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [showNFCModal, setShowNFCModal] = useState(false);
  const [showSendRequestModal, setShowSendRequestModal] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  // IDIA Infrastructure State - NOW HYDRATED GLOBALLY
  const displayAddress = globalWalletAddress || localAddress;
  const isProvisioned = !!displayAddress;
  const hasFBO = !!profile?.fbo_account_id;

  useEffect(() => {
    const handleNativeAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === "IDIA_AUTH_COMPLETE") {
        console.log("📱 [NATIVE_BRIDGE] Handshake Confirmed. Transitioning to Active Dashboard.");

        // DYNAMIC NAVIGATION: Force a state refresh or route change
        // This clears the "Linked" screen and pulls the fresh profile data
        window.location.href = "/dashboard";
      }
    };

    window.addEventListener("message", handleNativeAuthMessage);
    return () => window.removeEventListener("message", handleNativeAuthMessage);
  }, []);
  // Sync new local connections to the global Supabase truth
  useEffect(() => {
    if (isLocalConnected && localAddress && localAddress !== globalWalletAddress) {
      console.log(`🔗 [WEB3_WATCHER] Local connection detected. Pushing to global state: ${localAddress}`);
      syncWalletToSupabase(localAddress);
      window.dispatchEvent(new CustomEvent("vault-linked", { detail: { address: localAddress } }));
    }
  }, [isLocalConnected, localAddress, globalWalletAddress, syncWalletToSupabase]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    console.log("[START] Fetching transactions from fiat_ledger...");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("fiat_ledger")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("[ERROR] Transaction fetch failed:", error);
      } else {
        const mappedTransactions = (data || []).map((tx) => ({
          id: tx.id,
          transaction_type: tx.transaction_type,
          amount: tx.amount_usd,
          description: tx.description,
          source: "IDIA Protocol",
          created_at: tx.created_at,
          metadata: tx.metadata,
        }));
        setTransactions(mappedTransactions);
      }
    } catch (error) {
      console.error("[ERROR] Silent stalling in fetchTransactions:", error);
    }
  };

  const exportTaxableEvents = async () => {
    try {
      const taxableEvents = transactions.filter(
        (t) =>
          t.transaction_type === "DATA_SALE_PAYOUT" ||
          t.transaction_type === "crypto_sale" ||
          t.transaction_type === "income",
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
    } catch (error) {
      console.error("Error exporting taxable events:", error);
    }
  };

  const handleCalculateScore = async (moduleScores: Record<string, number>) => {
    setIsCalculating(true);
    try {
      const { tut, ...actualTelemetry } = moduleScores;
      const { data, error } = await supabase.functions.invoke("calculate-trust-score", {
        body: { user_id: profile?.user_id, telemetry: actualTelemetry },
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
        actions: ["Psychometric telemetry verified via IDIA Protocol", "Deterministic capital limit recalculated"],
      });
    } catch (err) {
      console.error("IDIA Algorithm Execution Failed:", err);
    } finally {
      setIsCalculating(false);
      setShowTestModal(false);
      setTimeout(() => fireFinaleConfetti(), 400);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "DATA_SALE_PAYOUT":
      case "data_reward":
      case "data_earnings":
        return TrendingUp;
      case "payment_sent":
        return ArrowUpRight;
      case "payment_received":
      case "payroll":
        return ArrowDownLeft;
      case "nfc_payroll":
        return Smartphone;
      default:
        return CreditCard;
    }
  };

  const getTransactionColor = (amount: number) => (amount > 0 ? "text-green-600" : "text-red-600");
  const formatAmount = (amount: number) => `${amount > 0 ? "+" : ""}$${Math.abs(amount).toFixed(2)}`;

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">IDIA Wallet</h1>
        <Button variant="outline" size="sm" onClick={exportTaxableEvents}>
          <Download className="w-4 h-4 mr-2" /> Tax Report
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">History</TabsTrigger>
          <TabsTrigger value="credit">Credit</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
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
                  <p className="text-teal-100 text-[10px] font-medium uppercase">Vault Assets</p>
                  <p className="text-xl font-bold">${walletBalance?.idia_beta_balance?.toFixed(2) || "0.00"}</p>
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
              <Smartphone className="w-5 h-5 mb-1" /> Tap Pay
            </Button>
            <Button variant="outline" className="h-14 flex-col text-xs" onClick={() => setShowAddFundsModal(true)}>
              <Plus className="w-5 h-5 mb-1" /> Add Funds
            </Button>
          </div>

          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4" /> Trust Score & Credit
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center border-r">
                  <div className="text-xl font-bold text-primary">{profile?.trust_score ?? "NO SCORE"}</div>
                  <Badge variant={profile?.trust_score ? "secondary" : "outline"} className="text-[10px]">
                    {profile?.trust_score ? "Active" : "Unverified"}
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-600">
                    ${profile?.available_credit_line?.toLocaleString() || 0}
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase">Available Credit</p>
                </div>
              </div>
              <div className="mt-4">
                <TestModal />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground italic">
                  No transactions found in fiat_ledger
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => {
                    const Icon = getTransactionIcon(tx.transaction_type);
                    return (
                      <div key={tx.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Icon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className={`font-semibold ${getTransactionColor(tx.amount)}`}>
                          {formatAmount(tx.amount)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
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

              {/* The Read-Only / Require Tap Handshake Flow */}
              <div className="mt-6 pt-4 border-t">
                {isProvisioned ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-secondary/50 rounded-lg border">
                      <p className="text-xs text-muted-foreground mb-1">Global Vault Attached</p>
                      <p className="font-mono text-xs break-all">{displayAddress}</p>
                    </div>

                    <Button
                      className="w-full bg-primary hover:bg-primary/90"
                      onClick={async () => {
                        try {
                          if (!localAddress) {
                            console.error("🚨 [AUTH_HANDSHAKE] ERROR_START: No local Web3 context found.");
                            console.error(
                              "🚨 [AUTH_HANDSHAKE] ERROR_DETAILS: Cannot sign without an active Wagmi session.",
                            );
                            console.error("🚨 [AUTH_HANDSHAKE] ERROR_END: Signature prompt aborted.");
                            return;
                          }

                          console.log("⚡️ [AUTH_HANDSHAKE] START: Prompting local wallet for cryptographic signature.");
                          // This triggers the overlay in the Swift Wrapper
                          // proving physical presence and ownership of the private key
                          await signMessageAsync({
                            account: localAddress as `0x${string}`,
                            message: "I authenticate this device for IDIA Protocol actions.",
                          });
                          console.log("⚡️ [AUTH_HANDSHAKE] END: Sovereign identity verified.");
                        } catch (err) {
                          console.error("🚨 [AUTH_HANDSHAKE] ERROR_START: Signature rejected or failed.");
                          console.error("🚨 [AUTH_HANDSHAKE] ERROR_DETAILS:", err);
                          console.error("🚨 [AUTH_HANDSHAKE] ERROR_END: Handshake failed.");
                        }
                      }}
                    >
                      <Fingerprint className="w-4 h-4 mr-2" />
                      Authenticate Identity
                    </Button>
                  </div>
                ) : (
                  <ConnectButton.Custom>
                    {({ account, chain, openConnectModal, mounted }) => {
                      const ready = mounted;
                      const connected = ready && account && chain;
                      return (
                        <Button className="w-full bg-primary hover:bg-primary/90" onClick={openConnectModal}>
                          {connected ? "Manage Sovereign Vault" : "Link Sovereign Vault"}
                        </Button>
                      );
                    }}
                  </ConnectButton.Custom>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <NFCPayrollModal isOpen={showNFCModal} onClose={() => setShowNFCModal(false)} />
      <SendRequestModal isOpen={showSendRequestModal} onClose={() => setShowSendRequestModal(false)} />
      <AddFundsModal isOpen={showAddFundsModal} onClose={() => setShowAddFundsModal(false)} />
    </div>
  );
};

export default EnhancedWalletDashboard;
