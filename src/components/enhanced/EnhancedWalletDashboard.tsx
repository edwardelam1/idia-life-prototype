import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEnhancedProfile } from '@/hooks/useEnhancedProfile';
import { supabase } from '@/integrations/supabase/client';
import { 
  Wallet, 
  CreditCard, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Shield, 
  Download,
  Smartphone,
  Clock
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
  const { profile, wallet, loading } = useEnhancedProfile();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [creditSimulation, setCreditSimulation] = useState<CreditSimulation | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

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
      // Simulate trust score improvement actions
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
      // Filter taxable events from transactions
      const taxableEvents = transactions.filter(t => 
        t.transaction_type === 'data_reward' || 
        t.transaction_type === 'crypto_sale' ||
        t.transaction_type === 'income'
      );

      // Create CSV content
      const csvContent = [
        'Date,Type,Amount,Description,Tax Category',
        ...taxableEvents.map(t => 
          `${t.created_at},${t.transaction_type},${t.amount},${t.description},Taxable Income`
        )
      ].join('\n');

      // Download CSV
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

  const getTransactionColor = (amount: number) => {
    return amount > 0 ? 'text-green-600' : 'text-red-600';
  };

  const formatAmount = (amount: number) => {
    const sign = amount > 0 ? '+' : '';
    return `${sign}$${Math.abs(amount).toFixed(2)}`;
  };

  if (loading) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">IDIA Wallet</h1>
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

        <TabsContent value="overview" className="space-y-6">
          {/* Enhanced Balance Card */}
          <Card className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">Total Balance</h2>
                <Wallet className="w-6 h-6" />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-teal-100 text-xs font-medium">Cash</p>
                  <p className="text-xl font-bold">${wallet?.cash_balance.toFixed(2) || '0.00'}</p>
                </div>
                <div className="text-center">
                  <p className="text-teal-100 text-xs font-medium">IDIA-USD</p>
                  <p className="text-xl font-bold">${wallet?.idia_usd_balance.toFixed(2) || '0.00'}</p>
                </div>
                <div className="text-center">
                  <p className="text-teal-100 text-xs font-medium">IDIA Token</p>
                  <p className="text-xl font-bold">{wallet?.idia_token_balance.toFixed(2) || '0.00'}</p>
                </div>
              </div>

              {wallet && !wallet.is_seed_backed_up && (
                <div className="mt-4 p-3 bg-yellow-500/20 rounded-lg">
                  <p className="text-sm font-medium">⚠️ Backup your wallet seed phrase for security</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button className="h-20 flex-col">
              <ArrowUpRight className="w-6 h-6 mb-2" />
              Send Money
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <ArrowDownLeft className="w-6 h-6 mb-2" />
              Request
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Smartphone className="w-6 h-6 mb-2" />
              NFC Receive
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <CreditCard className="w-6 h-6 mb-2" />
              Add Funds
            </Button>
          </div>

          {/* Trust Score & Credit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Trust Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-primary">
                    {profile?.trust_score || 650}
                  </div>
                  <Badge variant="secondary">Excellent</Badge>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={simulateTrustScore}
                    className="w-full mt-4"
                  >
                    Simulate Score Improvement
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Available Credit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-green-600">
                    ${profile?.available_credit_line || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Based on your trust score and data contribution
                  </p>
                  <Button variant="outline" size="sm" className="w-full mt-4">
                    Apply for Credit Increase
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
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
              <CardTitle>Credit Simulation</CardTitle>
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
                      <p className="text-sm text-muted-foreground">Potential Score</p>
                      <p className="text-2xl font-bold text-green-600">{creditSimulation.simulated_score}</p>
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
                  <Button onClick={simulateTrustScore}>
                    Run Credit Simulation
                  </Button>
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
                  <Badge variant={wallet?.is_seed_backed_up ? "default" : "destructive"}>
                    {wallet?.is_seed_backed_up ? "Backed up" : "Not backed up"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>PIN Protection</span>
                  <Badge variant="default">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Biometric Auth</span>
                  <Badge variant="secondary">Available</Badge>
                </div>
                {!wallet?.is_seed_backed_up && (
                  <Button variant="outline" className="w-full">
                    Backup Seed Phrase
                  </Button>
                )}
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
    </div>
  );
};

export default EnhancedWalletDashboard;