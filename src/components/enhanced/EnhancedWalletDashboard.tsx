import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEnhancedProfile } from '@/hooks/useEnhancedProfile';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { supabase } from '@/integrations/supabase/client';
import NFCPayrollModal from '../NFCPayrollModal';
import SendRequestModal from '../SendRequestModal';
import AddFundsModal from '../AddFundsModal';
import { 
  CreditCard, TrendingUp, ArrowUpRight, ArrowDownLeft, Shield, Download,
  Smartphone, Clock, Plus, ShieldCheck, Landmark, History
} from 'lucide-react';

interface Transaction {
  id: string; transaction_type: string; amount: number; description: string;
  source: string; created_at: string; metadata?: any;
}

interface CreditSimulation {
  current_score: number; simulated_score: number; actions: string[];
}

const EnhancedWalletDashboard: React.FC = () => {
  const { profile, loading } = useEnhancedProfile();
  const { balance: walletBalance, loading: balanceLoading } = useWalletBalance();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [creditSimulation, setCreditSimulation] = useState<CreditSimulation | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showNFCModal, setShowNFCModal] = useState(false);
  const [showSendRequestModal, setShowSendRequestModal] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);

  useEffect(() => { fetchTransactions(); }, []);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase.from('transactions').select('*')
        .order('created_at', { ascending: false }).limit(20);
      if (error) console.error('Error fetching transactions:', error);
      else setTransactions(data || []);
    } catch (error) { console.error('Error fetching transactions:', error); }
  };

  const simulateTrustScore = async () => {
    setCreditSimulation({
      current_score: profile?.trust_score || 650,
      simulated_score: (profile?.trust_score || 650) + 50,
      actions: ['Complete verification', 'Connect bank account', 'Make regular payments', 'Maintain positive social health metrics']
    });
  };

  const exportTaxableEvents = async () => {
    try {
      const taxableEvents = transactions.filter(t => 
        ['data_reward', 'crypto_sale', 'income'].includes(t.transaction_type));
      const csvContent = ['Date,Type,Amount,Description,Tax Category',
        ...taxableEvents.map(t => `${t.created_at},${t.transaction_type},${t.amount},${t.description},Taxable Income`)
      ].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `taxable-events-${new Date().getFullYear()}.csv`;
      a.click(); window.URL.revokeObjectURL(url);
    } catch (error) { console.error('Error exporting taxable events:', error); }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'data_reward': case 'data_earnings': return TrendingUp;
      case 'payment_sent': return ArrowUpRight;
      case 'payment_received': case 'payroll': return ArrowDownLeft;
      case 'nfc_payroll': return Smartphone;
      default: return CreditCard;
    }
  };

  const totalValue = walletBalance.cash_balance + walletBalance.idia_usd_balance;

  if (loading || balanceLoading) {
    return (
      <div className="p-4 bg-background min-h-screen">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-background min-h-screen p-4">
      {/* Identity & Security Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">Wallet</h1>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Bio-Sovereign Protected</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2 py-1 rounded bg-accent/10 text-accent border border-accent/20">
            KYC TIER 1
          </span>
          <Button variant="ghost" size="sm" onClick={exportTaxableEvents}>
            <Download className="w-4 h-4" />
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
          <Card className="bg-gradient-to-br from-primary/5 to-accent/5 shadow-lg backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground font-medium">Total Account Value</p>
                <Landmark className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-3xl font-bold text-foreground mb-5 font-mono">
                ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <div className="h-px bg-border mb-4" />
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Cash (FBO)</p>
                  <p className="text-lg font-bold text-foreground font-mono">${walletBalance.cash_balance.toFixed(2)}</p>
                </div>
                <div className="text-center border-x border-border">
                  <p className="text-xs text-muted-foreground font-medium mb-1">IDIA-USD</p>
                  <p className="text-lg font-bold text-foreground font-mono">${walletBalance.idia_usd_balance.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground font-medium mb-1">IDIA Token</p>
                  <p className="text-lg font-bold text-foreground font-mono">{walletBalance.idia_token_balance.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-3">
            <Button variant="outline" className="h-14 flex-col text-sm py-0.5 shadow-sm"
              onClick={() => setShowSendRequestModal(true)}>
              <div className="flex items-center space-x-1 mb-1">
                <ArrowUpRight className="w-4 h-4" /><ArrowDownLeft className="w-4 h-4" />
              </div>
              Send / Request
            </Button>
            <Button variant="outline" className="h-14 flex-col text-sm py-0.5 shadow-sm"
              onClick={() => setShowNFCModal(true)}>
              <Smartphone className="w-5 h-5 mb-1" />
              Tap To Payroll
            </Button>
            <Button className="h-14 flex-col text-sm py-0.5 shadow-md"
              onClick={() => setShowAddFundsModal(true)}>
              <Plus className="w-5 h-5 mb-1" />
              Add Funds
            </Button>
          </div>

          <Card className="shadow-sm">
            <CardHeader className="py-2 px-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-primary" />
                Trust Score & Credit
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-primary">{profile?.trust_score || 650}</div>
                  <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Excellent</Badge>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-accent">${profile?.available_credit_line || 0}</div>
                  <p className="text-xs text-muted-foreground">Available Credit</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={simulateTrustScore} className="text-xs h-8">
                  Simulate Improvement
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-8">Apply for Credit</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-muted-foreground" />
                Transaction History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground"><p>No transactions yet</p></div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          {transaction.amount > 0 ? (
                            <ArrowDownLeft className="w-4 h-4 text-accent" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground truncate max-w-[180px]">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">{new Date(transaction.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold font-mono ${transaction.amount > 0 ? 'text-accent' : 'text-muted-foreground'}`}>
                          {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">Settled</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credit" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader><CardTitle>Credit Simulation</CardTitle></CardHeader>
            <CardContent>
              {creditSimulation ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Current Score</p>
                      <p className="text-2xl font-bold text-foreground">{creditSimulation.current_score}</p>
                    </div>
                    <div className="text-center p-4 border border-accent/20 rounded-lg bg-accent/5">
                      <p className="text-sm text-muted-foreground">Potential Score</p>
                      <p className="text-2xl font-bold text-accent">{creditSimulation.simulated_score}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2 text-foreground">Recommended Actions:</h4>
                    <ul className="space-y-1">
                      {creditSimulation.actions.map((action, index) => (
                        <li key={index} className="text-sm flex items-center gap-2 text-muted-foreground">
                          <div className="w-2 h-2 bg-primary rounded-full" />{action}
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
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />Wallet Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-foreground">Seed Phrase Backup</span>
                <Badge variant="destructive">Not backed up</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground">PIN Protection</span>
                <Badge className="bg-primary/10 text-primary border-primary/20">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground">Biometric Auth</span>
                <Badge variant="secondary">Available</Badge>
              </div>
              <Button variant="outline" className="w-full">Backup Seed Phrase</Button>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Last login: Today at 2:30 PM</p>
                <p>Last transaction: 2 hours ago</p>
                <p>Device: iPhone 15 Pro</p>
                <p>Location: San Francisco, CA</p>
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
