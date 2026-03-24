import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useEnhancedProfile } from '@/hooks/useEnhancedProfile';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { useKYCStatus } from '@/hooks/useKYCStatus';
import { supabase } from '@/integrations/supabase/client';
import NFCPayrollModal from '../NFCPayrollModal';
import SendRequestModal from '../SendRequestModal';
import AddFundsModal from '../AddFundsModal';
import SSNCollectionModal from '../kyc/SSNCollectionModal';
import VerificationCenter from '../kyc/VerificationCenter';
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
  Eye,
  EyeOff,
  Lock,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

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
  current_score: number;
  simulated_score: number;
  actions: string[];
}

const EnhancedWalletDashboard: React.FC = () => {
  const { profile, loading } = useEnhancedProfile();
  const { balance: walletBalance, loading: balanceLoading } = useWalletBalance();
  const kyc = useKYCStatus();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [creditSimulation, setCreditSimulation] = useState<CreditSimulation | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showNFCModal, setShowNFCModal] = useState(false);
  const [showSendRequestModal, setShowSendRequestModal] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [showSSNModal, setShowSSNModal] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [isBlurred, setIsBlurred] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error) setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const simulateTrustScore = async () => {
    setCreditSimulation({
      current_score: profile?.trust_score || 650,
      simulated_score: (profile?.trust_score || 650) + 50,
      actions: [
        'Complete verification',
        'Connect bank account',
        'Make regular payments',
        'Maintain positive social health metrics'
      ]
    });
  };

  const exportTaxableEvents = async () => {
    const taxableEvents = transactions.filter(t => 
      ['data_reward', 'crypto_sale', 'income'].includes(t.transaction_type)
    );
    const csvContent = [
      'Date,Type,Amount,Description,Tax Category',
      ...taxableEvents.map(t => 
        `${t.created_at},${t.transaction_type},${t.amount},${t.description},Taxable Income`
      )
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taxable-events-${new Date().getFullYear()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'data_reward':
      case 'data_earnings': return TrendingUp;
      case 'payment_sent': return ArrowUpRight;
      case 'payment_received':
      case 'payroll': return ArrowDownLeft;
      case 'nfc_payroll': return Smartphone;
      default: return CreditCard;
    }
  };

  const getTransactionColor = (amount: number) => amount > 0 ? 'text-green-600' : 'text-destructive';
  const formatAmount = (amount: number) => `${amount > 0 ? '+' : ''}$${Math.abs(amount).toFixed(2)}`;

  const blurClass = isBlurred ? 'blur-sm select-none' : '';

  if (loading || balanceLoading || kyc.loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  // Show verification center
  if (showVerification) {
    return (
      <VerificationCenter
        kycStatus={kyc.status}
        onStartVerification={() => {}}
        onDocumentSubmit={kyc.submitVerification}
        onLivenessComplete={kyc.completeLiveness}
        onSimulateVerification={kyc.simulateVerification}
        onBack={() => { setShowVerification(false); kyc.reload(); }}
      />
    );
  }

  // Wallet gated — needs SSN or address
  if (kyc.isWalletGated) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">IDIA Wallet</h1>
          <Badge variant="secondary" className="text-xs">
            <Lock className="w-3 h-3 mr-1" />
            Restricted
          </Badge>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Complete Your Identity</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  As a regulated money transmitter and crypto wallet, we need to verify your identity before you can access wallet features.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
                <div className="flex items-center gap-2">
                  {kyc.hasAddress ? (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-primary-foreground text-xs">✓</span>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground text-xs">1</span>
                    </div>
                  )}
                  <span className="text-sm font-medium text-foreground">Verified Address</span>
                </div>
                {kyc.hasAddress ? (
                  <Badge className="text-[10px] bg-primary">Complete</Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">Needed</Badge>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
                <div className="flex items-center gap-2">
                  {kyc.hasSSN ? (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-primary-foreground text-xs">✓</span>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground text-xs">2</span>
                    </div>
                  )}
                  <span className="text-sm font-medium text-foreground">Social Security Number</span>
                </div>
                {kyc.hasSSN ? (
                  <Badge className="text-[10px] bg-primary">•••• {kyc.ssnLastFour}</Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">Needed</Badge>
                )}
              </div>
            </div>

            {!kyc.hasSSN && (
              <Button className="w-full" onClick={() => setShowSSNModal(true)}>
                <Shield className="w-4 h-4 mr-2" />
                Provide SSN to Continue
              </Button>
            )}
            {kyc.hasSSN && !kyc.hasAddress && (
              <p className="text-sm text-muted-foreground text-center">
                Please update your address in Settings to continue.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex items-start gap-2 px-2">
          <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-tight">
            Your data is encrypted at rest and in transit. We comply with all federal and state money transmitter regulations.
          </p>
        </div>

        <SSNCollectionModal
          isOpen={showSSNModal}
          onClose={() => setShowSSNModal(false)}
          onSubmit={kyc.submitSSN}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with tier badge and privacy toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-foreground">IDIA Wallet</h1>
          {kyc.tier === 1 && (
            <Badge variant="secondary" className="text-[10px]">
              <AlertTriangle className="w-3 h-3 mr-0.5" />
              Restricted
            </Badge>
          )}
          {kyc.tier === 2 && (
            <Badge className="text-[10px] bg-primary">
              <Shield className="w-3 h-3 mr-0.5" />
              Verified
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsBlurred(!isBlurred)}>
            {isBlurred ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={exportTaxableEvents} className="text-xs h-8">
            <Download className="w-3 h-3 mr-1" />
            Tax
          </Button>
        </div>
      </div>

      {/* Upgrade nudge for Tier 1 */}
      {kyc.tier === 1 && kyc.status === 'basic' && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-bold text-foreground">Unlock Full Access</h3>
                <p className="text-xs text-muted-foreground">
                  Verify your ID to increase limits from $1,000 to Unlimited
                </p>
              </div>
              <Button size="sm" className="text-xs h-8" onClick={() => setShowVerification(true)}>
                Start
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verification pending */}
      {kyc.status === 'pending' && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary animate-pulse" />
              <div>
                <p className="text-sm font-medium text-foreground">Verification Pending</p>
                <p className="text-xs text-muted-foreground">Typically verified in &lt; 5 mins</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Activity</TabsTrigger>
          <TabsTrigger value="credit">Credit</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Balance Card */}
          <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Total Balance</h2>
                <Wallet className="w-6 h-6" />
              </div>
              <div className={`grid grid-cols-3 gap-2 ${blurClass}`}>
                <div className="text-center">
                  <p className="text-primary-foreground/70 text-xs font-medium">Cash FBO</p>
                  <p className="text-xl font-bold">${walletBalance.cash_balance.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-primary-foreground/70 text-xs font-medium">IDIA-USD</p>
                  <p className="text-xl font-bold">${walletBalance.idia_usd_balance.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-primary-foreground/70 text-xs font-medium">IDIA Token</p>
                  <p className="text-xl font-bold">{walletBalance.idia_token_balance.toFixed(2)}</p>
                </div>
              </div>
              {kyc.tier === 1 && (
                <div className="mt-3 p-2 rounded bg-primary-foreground/10 text-xs text-center">
                  Deposit limit: ${kyc.depositLimit.toLocaleString()} · <button className="underline" onClick={() => setShowVerification(true)}>Upgrade</button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions with gating */}
          <div className="grid grid-cols-3 gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button 
                    className="h-14 w-full flex-col bg-primary hover:bg-primary/90 text-primary-foreground text-sm py-0.5"
                    onClick={() => setShowSendRequestModal(true)}
                    disabled={!kyc.canWithdraw}
                  >
                    <div className="flex items-center space-x-1 mb-1">
                      <ArrowUpRight className="w-4 h-4" />
                      <ArrowDownLeft className="w-4 h-4" />
                    </div>
                    Send / Request
                    {!kyc.canWithdraw && <Lock className="w-3 h-3 ml-1 opacity-50" />}
                  </Button>
                </div>
              </TooltipTrigger>
              {!kyc.canWithdraw && (
                <TooltipContent>
                  <p className="text-xs">Verify your identity to unlock transfers</p>
                </TooltipContent>
              )}
            </Tooltip>

            <Button 
              variant="outline" 
              className="h-14 flex-col text-sm py-0.5"
              onClick={() => setShowNFCModal(true)}
              disabled={!kyc.canWithdraw}
            >
              <Smartphone className="w-5 h-5 mb-1" />
              Tap Pay
              {!kyc.canWithdraw && <Lock className="w-3 h-3 ml-1 opacity-50" />}
            </Button>
            
            <Button 
              variant="outline" 
              className="h-14 flex-col text-sm py-0.5"
              onClick={() => setShowAddFundsModal(true)}
            >
              <Plus className="w-5 h-5 mb-1" />
              Add Funds
            </Button>
          </div>

          {/* Trust Score */}
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
                  <div className={`text-xl font-bold text-primary ${blurClass}`}>
                    {profile?.trust_score || 650}
                  </div>
                  <Badge variant="secondary" className="text-xs">Excellent</Badge>
                </div>
                <div className="text-center">
                  <div className={`text-xl font-bold text-green-600 ${blurClass}`}>
                    ${profile?.available_credit_line || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Available Credit</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={simulateTrustScore} className="text-xs h-8">
                  Simulate
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button variant="outline" size="sm" className="text-xs h-8 w-full" disabled={!kyc.canWithdraw}>
                        Apply for Credit
                        {!kyc.canWithdraw && <Lock className="w-3 h-3 ml-1" />}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {!kyc.canWithdraw && (
                    <TooltipContent>
                      <p className="text-xs">Verify your identity to apply for credit</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Transaction History</CardTitle></CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground"><p>No transactions yet</p></div>
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
                        <div className={`font-semibold ${blurClass} ${getTransactionColor(transaction.amount)}`}>
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
            <CardHeader><CardTitle>Credit Simulation</CardTitle></CardHeader>
            <CardContent>
              {creditSimulation ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Current Score</p>
                      <p className={`text-2xl font-bold ${blurClass}`}>{creditSimulation.current_score}</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg bg-primary/5">
                      <p className="text-sm text-muted-foreground">Potential Score</p>
                      <p className={`text-2xl font-bold text-primary ${blurClass}`}>{creditSimulation.simulated_score}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Recommended Actions:</h4>
                    <ul className="space-y-1">
                      {creditSimulation.actions.map((action, index) => (
                        <li key={index} className="text-sm flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Button onClick={simulateTrustScore}>Run Credit Simulation</Button>
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
                Account Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">KYC Tier</span>
                <Badge className={kyc.tier === 2 ? 'bg-primary' : ''}>
                  Tier {kyc.tier} — {kyc.tier === 1 ? 'Basic' : 'Verified'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">SSN on File</span>
                <Badge variant={kyc.hasSSN ? 'default' : 'secondary'}>
                  {kyc.hasSSN ? `•••• ${kyc.ssnLastFour}` : 'Not provided'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Identity Document</span>
                <Badge variant={kyc.documentType ? 'default' : 'secondary'}>
                  {kyc.documentType || 'Not submitted'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Biometric Liveness</span>
                <Badge variant={kyc.livenessVerified ? 'default' : 'secondary'}>
                  {kyc.livenessVerified ? 'Verified' : 'Not verified'}
                </Badge>
              </div>
              {kyc.tier === 1 && (
                <Button className="w-full mt-2" onClick={() => setShowVerification(true)}>
                  <Shield className="w-4 h-4 mr-2" />
                  Upgrade to Tier 2
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Wallet Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Seed Phrase Backup</span>
                <Badge variant="destructive">Not backed up</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">PIN Protection</span>
                <Badge>Enabled</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Biometric Auth</span>
                <Badge variant="secondary">Available</Badge>
              </div>
              <Button variant="outline" className="w-full">Backup Seed Phrase</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <NFCPayrollModal isOpen={showNFCModal} onClose={() => setShowNFCModal(false)} />
      <SendRequestModal isOpen={showSendRequestModal} onClose={() => setShowSendRequestModal(false)} />
      <AddFundsModal isOpen={showAddFundsModal} onClose={() => setShowAddFundsModal(false)} />
      <SSNCollectionModal isOpen={showSSNModal} onClose={() => setShowSSNModal(false)} onSubmit={kyc.submitSSN} />
    </div>
  );
};

export default EnhancedWalletDashboard;
