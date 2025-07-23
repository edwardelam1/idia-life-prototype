import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Wallet, 
  TrendingUp, 
  Send, 
  QrCode, 
  Eye, 
  EyeOff,
  CreditCard,
  Award,
  Smartphone,
  History
} from 'lucide-react';
import { useEnhancedProfile } from '@/hooks/useEnhancedProfile';
import { supabase } from '@/integrations/supabase/client';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency?: string;
  status: string;
  metadata?: any;
  created_at: string;
}

export const EnhancedWalletDashboard: React.FC = () => {
  const { profile, wallet, generateWallet } = useEnhancedProfile();
  const [showBalances, setShowBalances] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      // Map the database fields to our interface
      const mappedTransactions = (data || []).map(tx => ({
        id: tx.id,
        type: tx.transaction_type,
        amount: tx.amount,
        currency: 'USD',
        status: tx.status,
        metadata: { description: tx.description, source: tx.source },
        created_at: tx.created_at
      }));
      
      setTransactions(mappedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    if (currency === 'IDIA-USD') {
      return `Ⓘ${amount.toFixed(2)}`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'data_earnings':
        return <Award className="w-4 h-4 text-green-600" />;
      case 'payment_sent':
        return <Send className="w-4 h-4 text-red-600" />;
      case 'payment_received':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'payroll':
        return <Smartphone className="w-4 h-4 text-blue-600" />;
      default:
        return <History className="w-4 h-4 text-gray-600" />;
    }
  };

  const handleCreateWallet = async () => {
    try {
      await generateWallet();
    } catch (error) {
      console.error('Error creating wallet:', error);
    }
  };

  if (!wallet) {
    return (
      <div className="p-4 space-y-6">
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
          <CardContent className="p-8 text-center">
            <Wallet className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold mb-2">Welcome to IDIA Wallet</h2>
            <p className="text-muted-foreground mb-6">
              Create your secure wallet to start earning from your data and participating in the IDIA ecosystem.
            </p>
            <Button onClick={handleCreateWallet} size="lg">
              Create Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Wallet Overview */}
      <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-primary-foreground/80 text-sm">Total Balance</p>
              <div className="flex items-center space-x-2">
                {showBalances ? (
                  <p className="text-3xl font-bold">
                    {formatCurrency(wallet.cash_balance + wallet.idia_usd_balance)}
                  </p>
                ) : (
                  <p className="text-3xl font-bold">••••••</p>
                )}
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setShowBalances(!showBalances)}
                  className="text-primary-foreground hover:bg-primary-foreground/20"
                >
                  {showBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-primary-foreground/80">Trust Score</p>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-primary">
                  {Math.round((profile?.trust_score || 0.5) * 1000)}
                </Badge>
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Balance Breakdown */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-primary-foreground/10 rounded-lg p-3">
              <p className="text-xs text-primary-foreground/80">Cash Balance</p>
              <p className="font-semibold">
                {showBalances ? formatCurrency(wallet.cash_balance) : '••••'}
              </p>
            </div>
            <div className="bg-primary-foreground/10 rounded-lg p-3">
              <p className="text-xs text-primary-foreground/80">IDIA Balance</p>
              <p className="font-semibold">
                {showBalances ? formatCurrency(wallet.idia_usd_balance, 'IDIA-USD') : '••••'}
              </p>
            </div>
          </div>

          {/* Wallet Address */}
          <div className="mt-4 p-3 bg-primary-foreground/10 rounded-lg">
            <p className="text-xs text-primary-foreground/80 mb-1">Wallet Address</p>
            <p className="font-mono text-sm break-all">{wallet.wallet_address}</p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button className="py-6" variant="outline">
          <div className="text-center">
            <Send className="w-6 h-6 mx-auto mb-1" />
            <span className="block text-sm font-semibold">Send</span>
          </div>
        </Button>
        <Button className="py-6" variant="outline">
          <div className="text-center">
            <QrCode className="w-6 h-6 mx-auto mb-1" />
            <span className="block text-sm font-semibold">Receive</span>
          </div>
        </Button>
      </div>

      {/* Credit Line */}
      {profile?.available_credit_line && profile.available_credit_line > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>Available Credit</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(profile.available_credit_line)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Based on your IDIA Trust Score™ of {Math.round((profile.trust_score || 0.5) * 1000)}
            </p>
            <Button className="mt-3" size="sm">
              Apply for Credit
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="w-5 h-5" />
            <span>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded animate-pulse mb-1" />
                    <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                  </div>
                  <div className="h-4 bg-muted rounded animate-pulse w-16" />
                </div>
              ))}
            </div>
          ) : transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((transaction, index) => (
                <div key={transaction.id}>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {transaction.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.metadata?.description || new Date(transaction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        transaction.type.includes('received') || transaction.type.includes('earnings') 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {transaction.type.includes('received') || transaction.type.includes('earnings') ? '+' : '-'}
                        {formatCurrency(transaction.amount, transaction.currency || 'USD')}
                      </p>
                      <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                  {index < transactions.length - 1 && <Separator className="mt-3" />}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No transactions yet</p>
              <p className="text-sm text-muted-foreground">
                Connect your data sources to start earning
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};