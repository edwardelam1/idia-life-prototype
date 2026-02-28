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
  CreditCard, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Shield, 
  Download,
  Smartphone,
  Clock,
  Plus,
  ShieldCheck,
  Landmark,
  History
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [creditSimulation, setCreditSimulation] = useState<CreditSimulation | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showNFCModal, setShowNFCModal] = useState(false);
  const [showSendRequestModal, setShowSendRequestModal] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching transactions:', error);
      } else {
        setTransactions(data || []);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const simulateTrustScore = async () => {
    try {
      const hypotheticalActions = [
        'Complete verification',
        'Connect bank account',
        'Make regular payments',
        'Maintain positive social health metrics'
      ];

      setCreditSimulation({
        current_score: profile?.trust_score || 650,
        simulated_score: (profile?.trust_score || 650) + 50,
        actions: hypotheticalActions
      });
    } catch (error) {
      console.error('Error simulating trust score:', error);
    }
  };

  const exportTaxableEvents = async () => {
    try {
      const taxableEvents = transactions.filter(t => 
        t.transaction_type === 'data_reward' || 
        t.transaction_type === 'crypto_sale' ||
        t.transaction_type === 'income'
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
    } catch (error) {
      console.error('Error exporting taxable events:', error);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'data_reward':
      case 'data_earnings':
        return TrendingUp;
      case 'payment_sent':
        return ArrowUpRight;
      case 'payment_received':
      case 'payroll':
        return ArrowDownLeft;
      case 'nfc_payroll':
        return Smartphone;
      default:
        return CreditCard;
    }
  };

  const totalValue = walletBalance.cash_balance + walletBalance.idia_usd_balance;

  if (loading || balanceLoading) {
    return (
      <div className="p-4 bg-slate-950 min-h-screen">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-800 rounded w-1/3"></div>
          <div className="h-32 bg-slate-800 rounded"></div>
          <div className="h-64 bg-slate-800 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-slate-950 min-h-screen p-4">
      {/* Identity & Security Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">Wallet</h1>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">Bio-Sovereign Protected</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2 py-1 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
            KYC TIER 1
          </span>
          <Button variant="ghost" size="sm" onClick={exportTaxableEvents} className="text-slate-400 hover:text-white hover:bg-slate-800">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full bg-slate-900 border border-slate-800">
          <TabsTrigger value="overview" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">Overview</TabsTrigger>
          <TabsTrigger value="transactions" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">Transactions</TabsTrigger>
          <TabsTrigger value="credit" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">Credit</TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Three-Pillar Balance Card */}
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-400 font-medium">Total Account Value</p>
                <Landmark className="w-5 h-5 text-slate-500" />
              </div>
              <p className="text-3xl font-bold text-white mb-5 font-mono">
                ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>

              <div className="h-px bg-slate-700 mb-4" />

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs text-slate-500 font-medium mb-1">Cash (FBO)</p>
                  <p className="text-lg font-bold text-white font-mono">${walletBalance.cash_balance.toFixed(2)}</p>
                </div>
                <div className="text-center border-x border-slate-700">
                  <p className="text-xs text-slate-500 font-medium mb-1">IDIA-USD</p>
                  <p className="text-lg font-bold text-white font-mono">${walletBalance.idia_usd_balance.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 font-medium mb-1">IDIA Token</p>
                  <p className="text-lg font-bold text-white font-mono">{walletBalance.idia_token_balance.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-3">
            <Button 
              className="h-14 flex-col bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm py-0.5"
              onClick={() => setShowSendRequestModal(true)}
            >
              <div className="flex items-center space-x-1 mb-1">
                <ArrowUpRight className="w-4 h-4" />
                <ArrowDownLeft className="w-4 h-4" />
              </div>
              Send / Request
            </Button>
            
            <Button 
              className="h-14 flex-col bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm py-0.5"
              onClick={() => setShowNFCModal(true)}
            >
              <Smartphone className="w-5 h-5 mb-1" />
              Tap To Payroll
            </Button>
            
            <Button 
              className="h-14 flex-col bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-0.5"
              onClick={() => setShowAddFundsModal(true)}
            >
              <Plus className="w-5 h-5 mb-1" />
              Add Funds
            </Button>
          </div>

          {/* Trust Score & Credit */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="py-2 px-3">
              <CardTitle className="flex items-center gap-2 text-sm text-white">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                Trust Score & Credit
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-indigo-400">
                    {profile?.trust_score || 650}
                  </div>
                  <Badge className="text-xs bg-indigo-500/15 text-indigo-300 border-indigo-500/20">Excellent</Badge>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-emerald-400">
                    ${profile?.available_credit_line || 0}
                  </div>
                  <p className="text-xs text-slate-500">Available Credit</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={simulateTrustScore}
                  className="text-xs h-8 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  Simulate Improvement
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-8 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                  Apply for Credit
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <History className="w-5 h-5 text-slate-500" />
                Transaction History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>No transactions yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                          {transaction.amount > 0 ? (
                            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200 truncate max-w-[180px]">{transaction.description}</p>
                          <p className="text-xs text-slate-500">{new Date(transaction.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold font-mono ${transaction.amount > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-600">Settled</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credit" className="space-y-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Credit Simulation</CardTitle>
            </CardHeader>
            <CardContent>
              {creditSimulation ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 border border-slate-800 rounded-lg">
                      <p className="text-sm text-slate-500">Current Score</p>
                      <p className="text-2xl font-bold text-white">{creditSimulation.current_score}</p>
                    </div>
                    <div className="text-center p-4 border border-emerald-500/20 rounded-lg bg-emerald-500/5">
                      <p className="text-sm text-slate-500">Potential Score</p>
                      <p className="text-2xl font-bold text-emerald-400">{creditSimulation.simulated_score}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2 text-slate-300">Recommended Actions:</h4>
                    <ul className="space-y-1">
                      {creditSimulation.actions.map((action, index) => (
                        <li key={index} className="text-sm flex items-center gap-2 text-slate-400">
                          <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Button onClick={simulateTrustScore} className="bg-indigo-600 hover:bg-indigo-700">
                    Run Credit Simulation
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Shield className="w-5 h-5 text-indigo-400" />
                Wallet Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Seed Phrase Backup</span>
                <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Not backed up</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">PIN Protection</span>
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Biometric Auth</span>
                <Badge className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20">Available</Badge>
              </div>
              <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                Backup Seed Phrase
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="w-5 h-5 text-slate-500" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-slate-400">
                <p>Last login: Today at 2:30 PM</p>
                <p>Last transaction: 2 hours ago</p>
                <p>Device: iPhone 15 Pro</p>
                <p>Location: San Francisco, CA</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <NFCPayrollModal 
        isOpen={showNFCModal} 
        onClose={() => setShowNFCModal(false)} 
      />
      
      <SendRequestModal 
        isOpen={showSendRequestModal} 
        onClose={() => setShowSendRequestModal(false)} 
      />
      
      <AddFundsModal 
        isOpen={showAddFundsModal} 
        onClose={() => setShowAddFundsModal(false)} 
      />
    </div>
  );
};

export default EnhancedWalletDashboard;
