
import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, CreditCard, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import AddFundsModal from './AddFundsModal';

const WalletDashboard = () => {
  const [balances, setBalances] = useState({
    cash: 0,
    idiaUsd: 0,
    idiaToken: 0
  });
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalances();
  }, []);

  const fetchBalances = async () => {
    try {
      // For demo purposes, we'll use hardcoded values since there's no auth
      // In a real app, this would query the user_balances table
      setBalances({
        cash: 2847.32,
        idiaUsd: 1523.89,
        idiaToken: 847.23
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching balances:', error);
      setLoading(false);
    }
  };

  const recentTransactions = [
    {
      type: 'Data Earnings',
      amount: '+$23.45',
      source: 'Nike Run Club - Fitness Analytics',
      time: '2 hours ago',
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      type: 'Payment Sent',
      amount: '-$45.00',
      source: 'Coffee Shop Downtown',
      time: '1 day ago',
      icon: ArrowUpRight,
      color: 'text-red-600'
    },
    {
      type: 'IDIA Pay Payroll',
      amount: '+$750.00',
      source: 'Weekly Payroll',
      time: '3 days ago',
      icon: ArrowDownLeft,
      color: 'text-green-600'
    }
  ];

  if (loading) {
    return (
      <div className="p-4 space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-6"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Condensed Balance Card */}
      <Card className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Your Balances</h2>
            <div className="text-teal-100 text-sm">+2.3% today</div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-teal-100 text-xs font-medium">Cash</p>
              <p className="text-xl font-bold">${balances.cash.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-teal-100 text-xs font-medium">IDIA-USD</p>
              <p className="text-xl font-bold">${balances.idiaUsd.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-teal-100 text-xs font-medium">IDIA Token</p>
              <p className="text-xl font-bold">{balances.idiaToken.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <Button className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 py-6 rounded-xl">
            <div className="text-center">
              <ArrowUpRight className="w-6 h-6 mx-auto mb-1" />
              <span className="block text-sm font-semibold">Send Money</span>
            </div>
          </Button>
          <Button 
            variant="outline" 
            className="py-6 rounded-xl border-2 hover:bg-gray-50"
            onClick={() => setIsAddFundsOpen(true)}
          >
            <div className="text-center">
              <CreditCard className="w-6 h-6 mx-auto mb-1 text-gray-600" />
              <span className="block text-sm font-semibold text-gray-700">Add Funds</span>
            </div>
          </Button>
        </div>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentTransactions.map((transaction, index) => {
            const Icon = transaction.icon;
            return (
              <div key={index} className="flex items-center space-x-3 py-2">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{transaction.type}</p>
                  <p className="text-sm text-gray-600">{transaction.source}</p>
                  <p className="text-xs text-gray-500">{transaction.time}</p>
                </div>
                <div className={`font-semibold ${transaction.color}`}>
                  {transaction.amount}
                </div>
              </div>
            );
          })}
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
