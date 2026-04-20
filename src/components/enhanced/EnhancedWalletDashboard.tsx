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
import { Slider } from "@/components/ui/slider";
import { useEnhancedProfile } from "@/hooks/useEnhancedProfile";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { supabase } from "@/integrations/supabase/client";
import NFCPayrollModal from "../NFCPayrollModal";
import SendRequestModal from "../SendRequestModal";
import AddFundsModal from "../AddFundsModal";
import {
  Wallet,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Shield,
  Download,
  Smartphone,
  Clock,
  Plus,
  Users,
  Heart,
  BrainCircuit,
  ArrowRight,
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [creditSimulation, setCreditSimulation] = useState<CreditSimulation | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [showNFCModal, setShowNFCModal] = useState(false);
  const [showSendRequestModal, setShowSendRequestModal] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);

  // Trust Score Test States
  const [showTestModal, setShowTestModal] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [testScores, setTestScores] = useState({
    seb: 50,
    ass: 50,
    snv: 50, // Social Connectivity
    jrda: 50,
    ocs: 50,
    pcf: 50, // Work Engagement
    eq: 50,
    gup: 50,
    scs: 50, // Prosocial Disposition
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error fetching transactions:", error);
      } else {
        setTransactions(data || []);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  // The IDIA Algorithm Execution
  const handleCalculateScore = async () => {
    setIsCalculating(true);

    try {
      const telemetryPayload = {
        social_exchange_balance: testScores.seb,
        attachment_security: testScores.ass,
        social_network_vitality: testScores.snv,
        job_resources_demands: testScores.jrda,
        org_citizenship: testScores.ocs,
        psych_contract: testScores.pcf,
        empathy_quotient: testScores.eq,
        generosity_under_pressure: testScores.gup,
        social_context_sensitivity: testScores.scs,
      };

      const { data, error } = await supabase.functions.invoke("calculate-trust-score", {
        body: { user_id: profile?.id, telemetry: telemetryPayload },
      });

      if (error) throw error;

      // Update the blind ledger
      if (updateProfile) {
        await updateProfile({
          trust_score: data.trust_score,
          available_credit_line: data.credit_line,
        });
      }

      setCreditSimulation({
        current_score: profile?.trust_score != null ? profile.trust_score : "Unverified",
        simulated_score: data.trust_score,
        actions: [
          "Psychometric telemetry verified via Edge Function",
          "Capital advance limit dynamically recalculated",
        ],
      });
    } catch (err) {
      console.error("Error executing edge function:", err);
    } finally {
      setIsCalculating(false);
      setShowTestModal(false);
      // Switch to credit tab to see results
      setActiveTab("credit");
    }
  };

  const exportTaxableEvents = async () => {
    try {
      const taxableEvents = transactions.filter(
        (t) =>
          t.transaction_type === "data_reward" ||
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

  const getTransactionIcon = (type: string) => {
    switch (type) {
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

  const getTransactionColor = (amount: number) => {
    return amount > 0 ? "text-green-600" : "text-red-600";
  };

  const formatAmount = (amount: number) => {
    const sign = amount > 0 ? "+" : "";
    return `${sign}$${Math.abs(amount).toFixed(2)}`;
  };

  if (loading || balanceLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  // Reusable Test Modal Component
  const TestModal = () => (
    <Dialog open={showTestModal} onOpenChange={setShowTestModal}>
      <DialogTrigger asChild>
        <Button className="w-full font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground">
          Need an advance? Take our Tests <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Psychometric Validation</DialogTitle>
          <DialogDescription>
            Complete these three pillars to establish your cryptographic IDIA Trust Score.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 py-4">
          {/* Pillar 1 */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-xl border">
            <h4 className="font-bold text-primary flex items-center gap-2">
              <Users className="w-4 h-4" /> 1. Social Connectivity Index (45%)
            </h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <label>Social Exchange Balance (Equity)</label>
                  <span>{testScores.seb}%</span>
                </div>
                <Slider
                  value={[testScores.seb]}
                  onValueChange={([v]) => setTestScores((prev) => ({ ...prev, seb: v }))}
                  max={100}
                  step={1}
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <label>Attachment Security</label>
                  <span>{testScores.ass}%</span>
                </div>
                <Slider
                  value={[testScores.ass]}
                  onValueChange={([v]) => setTestScores((prev) => ({ ...prev, ass: v }))}
                  max={100}
                  step={1}
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <label>Network Vitality</label>
                  <span>{testScores.snv}%</span>
                </div>
                <Slider
                  value={[testScores.snv]}
                  onValueChange={([v]) => setTestScores((prev) => ({ ...prev, snv: v }))}
                  max={100}
                  step={1}
                />
              </div>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-xl border">
            <h4 className="font-bold text-emerald-500 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> 2. Work Engagement Index (35%)
            </h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <label>Job Resources-Demands Delta</label>
                  <span>{testScores.jrda}%</span>
                </div>
                <Slider
                  value={[testScores.jrda]}
                  onValueChange={([v]) => setTestScores((prev) => ({ ...prev, jrda: v }))}
                  max={100}
                  step={1}
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <label>Organizational Citizenship</label>
                  <span>{testScores.ocs}%</span>
                </div>
                <Slider
                  value={[testScores.ocs]}
                  onValueChange={([v]) => setTestScores((prev) => ({ ...prev, ocs: v }))}
                  max={100}
                  step={1}
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <label>Psychological Contract Fulfillment</label>
                  <span>{testScores.pcf}%</span>
                </div>
                <Slider
                  value={[testScores.pcf]}
                  onValueChange={([v]) => setTestScores((prev) => ({ ...prev, pcf: v }))}
                  max={100}
                  step={1}
                />
              </div>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-xl border">
            <h4 className="font-bold text-purple-500 flex items-center gap-2">
              <Heart className="w-4 h-4" /> 3. Prosocial Disposition Index (20%)
            </h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <label>Empathy Quotient</label>
                  <span>{testScores.eq}%</span>
                </div>
                <Slider
                  value={[testScores.eq]}
                  onValueChange={([v]) => setTestScores((prev) => ({ ...prev, eq: v }))}
                  max={100}
                  step={1}
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <label>Generosity Under Pressure</label>
                  <span>{testScores.gup}%</span>
                </div>
                <Slider
                  value={[testScores.gup]}
                  onValueChange={([v]) => setTestScores((prev) => ({ ...prev, gup: v }))}
                  max={100}
                  step={1}
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <label>Social Context Sensitivity</label>
                  <span>{testScores.scs}%</span>
                </div>
                <Slider
                  value={[testScores.scs]}
                  onValueChange={([v]) => setTestScores((prev) => ({ ...prev, scs: v }))}
                  max={100}
                  step={1}
                />
              </div>
            </div>
          </div>

          <Button className="w-full h-12 text-lg" onClick={handleCalculateScore} disabled={isCalculating}>
            {isCalculating ? "Processing Cryptographic Attestation..." : "Calculate Limits"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">IDIA Wallet</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportTaxableEvents}>
            <Download className="w-4 h-4 mr-2" />
            Tax Report
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="credit">Credit</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Enhanced Balance Card */}
          <Card className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Total Balance</h2>
                <Wallet className="w-6 h-6" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <p className="text-teal-100 text-xs font-medium">Cash</p>
                  <p className="text-xl font-bold">${walletBalance.cash_balance.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-teal-100 text-xs font-medium">IDIA-BETA</p>
                  <p className="text-xl font-bold">${walletBalance.idia_usd_balance.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-teal-100 text-xs font-medium">IDIA Token</p>
                  <p className="text-xl font-bold">{walletBalance.idia_token_balance.toFixed(2)}</p>
                </div>
              </div>

              {!walletBalance && (
                <div className="mt-4 p-3 bg-yellow-500/20 rounded-lg">
                  <p className="text-sm font-medium">⚠️ Backup your wallet seed phrase for security</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-4">
            <Button
              className="h-14 flex-col bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white text-sm py-0.5"
              onClick={() => setShowSendRequestModal(true)}
            >
              <div className="flex items-center space-x-1 mb-1">
                <ArrowUpRight className="w-4 h-4" />
                <ArrowDownLeft className="w-4 h-4" />
              </div>
              Send / Request
            </Button>

            <Button
              variant="outline"
              className="h-14 flex-col border border-teal-200 hover:bg-teal-50 hover:border-teal-300 text-teal-700 text-sm py-0.5"
              onClick={() => setShowNFCModal(true)}
            >
              <Smartphone className="w-5 h-5 mb-1 text-teal-600" />
              Tap To Payroll
            </Button>

            <Button
              variant="outline"
              className="h-14 flex-col border border-cyan-200 hover:bg-cyan-50 hover:border-cyan-300 text-cyan-700 text-sm py-0.5"
              onClick={() => setShowAddFundsModal(true)}
            >
              <Plus className="w-5 h-5 mb-1 text-cyan-600" />
              Add Funds
            </Button>
          </div>

          {/* Trust Score & Credit - Condensed */}
          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4" />
                Trust Score & Credit
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-primary">
                    {profile?.trust_score != null ? profile.trust_score : "---"}
                  </div>
                  <Badge variant={profile?.trust_score != null ? "secondary" : "outline"} className="text-xs">
                    {profile?.trust_score != null ? "Active" : "Unverified"}
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-600">
                    ${profile?.available_credit_line?.toLocaleString() || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Available Credit</p>
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
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No transactions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => {
                    const Icon = getTransactionIcon(transaction.transaction_type);
                    return (
                      <div key={transaction.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Icon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{transaction.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className={`font-semibold ${getTransactionColor(transaction.amount)}`}>
                          {formatAmount(transaction.amount)}
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
              <CardTitle>Capital Advancement Control</CardTitle>
            </CardHeader>
            <CardContent>
              {creditSimulation ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Current Score</p>
                      <p className="text-2xl font-bold">{creditSimulation.current_score}</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg bg-green-50">
                      <p className="text-sm text-muted-foreground">New Score</p>
                      <p className="text-2xl font-bold text-green-600">{creditSimulation.simulated_score}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Actions Registered:</h4>
                    <ul className="space-y-1">
                      {creditSimulation.actions.map((action, index) => (
                        <li key={index} className="text-sm flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-4">
                    <TestModal />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 space-y-4 flex flex-col items-center">
                  <BrainCircuit className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Your advancement limits are calculated based on verifiable behavioral and social telemetry.
                  </p>
                  <div className="w-full max-w-xs">
                    <TestModal />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Wallet Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Seed Phrase Backup</span>
                  <Badge variant="destructive">Not backed up</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>PIN Protection</span>
                  <Badge variant="default">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Biometric Auth</span>
                  <Badge variant="secondary">Available</Badge>
                </div>
                <Button variant="outline" className="w-full">
                  Backup Seed Phrase
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p>Last login: Today at 2:30 PM</p>
                  <p>Last transaction: 2 hours ago</p>
                  <p>Device: iPhone 15 Pro</p>
                  <p>Location: San Francisco, CA</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <NFCPayrollModal isOpen={showNFCModal} onClose={() => setShowNFCModal(false)} />

      <SendRequestModal isOpen={showSendRequestModal} onClose={() => setShowSendRequestModal(false)} />

      <AddFundsModal isOpen={showAddFundsModal} onClose={() => setShowAddFundsModal(false)} />
    </div>
  );
};

export default EnhancedWalletDashboard;
