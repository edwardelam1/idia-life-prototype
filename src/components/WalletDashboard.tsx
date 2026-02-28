import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, CreditCard, TrendingUp, ShieldCheck, Landmark, History, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import AddFundsModal from './AddFundsModal';
import { eventTracker } from '@/utils/EventTracker';

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  description: string;
  source: string;
  created_at: string;
}

const WalletDashboard = () => {
  const [balances, setBalances] = useState({
    cash: 0,
    idiaUsd: 0,
    idiaToken: 0
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalances();
    fetchTransactions();
    
    const startTime = Date.now();
    return () => {
      const duration = (Date.now() - startTime) / 1000;
      eventTracker.trackWalletView({
        view_duration: duration,
        balance_checked: true,
        transactions_viewed: transactions.length
      });
    };
  }, []);

  const fetchBalances = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setBalances({ cash: 0, idiaUsd: 0, idiaToken: 0 });
        return;
      }

      const { data: walletData, error: walletError } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletError && walletError.code !== 'PGRST116') {
        console.error('Error fetching wallet:', walletError);
        setBalances({ cash: 0, idiaUsd: 0, idiaToken: 0 });
        return;
      }

      setBalances({
        cash: 0,
        idiaUsd: walletData?.idia_usd_balance || 0,
        idiaToken: 0
      });
    } catch (error) {
      console.error('Error fetching balances:', error);
      setBalances({ cash: 0, idiaUsd: 0, idiaToken: 0 });
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.log('Error fetching transactions:', error);
        setTransactions([]);
      } else {
        setTransactions((data || []).map(transaction => ({
          ...transaction,
          description: transaction.description.replace('Staged_data_reward', 'Health Data Contribution'),
          source: transaction.source || 'IDIA Platform'
        })));
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
      setLoading(false);
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
      default:
        return CreditCard;
    }
  };

  const totalValue = balances.cash + balances.idiaUsd;

  if (loading) {
    return (
      <div className="p-4 space-y-6 bg-background min-h-screen">
        <div className="animate-pulse">
          <div className="h-32 bg-muted rounded-lg mb-6"></div>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-16 bg-muted rounded"></div>
            <div className="h-16 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5 bg-background min-h-screen">
      {/* Identity & Security Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">Wallet</h1>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Bio-Sovereign Protected</span>
          </div>
        </div>
        <span className="text-xs font-mono px-2 py-1 rounded bg-accent text-accent-foreground border">
          KYC TIER 1
        </span>
      </div>

      {/* Three-Pillar Balance Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border overflow-hidden">
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
              <p className="text-lg font-bold text-foreground font-mono">${balances.cash.toFixed(2)}</p>
            </div>
            <div className="text-center border-x border-border">
              <p className="text-xs text-muted-foreground font-medium mb-1">IDIA-USD</p>
              <p className="text-lg font-bold text-foreground font-mono">${balances.idiaUsd.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground font-medium mb-1">IDIA Token</p>
              <p className="text-lg font-bold text-foreground font-mono">{balances.idiaToken.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          className="py-6 rounded-xl"
          onClick={() => setIsAddFundsOpen(true)}
        >
          <div className="text-center">
            <Plus className="w-5 h-5 mx-auto mb-1" />
            <span className="block text-sm font-semibold">Add Funds</span>
          </div>
        </Button>
        <Button
          variant="outline"
          className="py-6 rounded-xl"
        >
          <div className="text-center">
            <ArrowUpRight className="w-5 h-5 mx-auto mb-1" />
            <span className="block text-sm font-semibold">Send Payment</span>
          </div>
        </Button>
      </div>

      {/* Recent Activity Ledger */}
      <Card>
        <div className="flex items-center justify-between p-4 pb-2">
          <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
          <History className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="h-px bg-border mx-4" />
        <CardContent className="p-4">
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">No Transactions Found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((transaction) => {
                const Icon = getTransactionIcon(transaction.transaction_type);
                return (
                  <div key={transaction.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        {transaction.amount > 0 ? (
                          <ArrowDownLeft className="w-4 h-4 text-primary" />
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
                      <p className={`text-sm font-semibold font-mono ${transaction.amount > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                        {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">Settled</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AddFundsModal 
        isOpen={isAddFundsOpen}
        onClose={() => setIsAddFundsOpen(false)}
      />
    </div>
  );
};

export default WalletDashboard;
