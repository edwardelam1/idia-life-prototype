
import { ArrowUpRight, ArrowDownLeft, CreditCard, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const WalletDashboard = () => {
  const balances = [
    {
      type: 'Cash',
      amount: '$2,847.32',
      change: '+$127.45',
      color: 'from-green-500 to-emerald-600'
    },
    {
      type: 'IDIA-USD',
      amount: '$1,523.89',
      change: '+$89.23',
      color: 'from-teal-500 to-cyan-600'
    },
    {
      type: 'IDIA Token',
      amount: '847.23 IDIA',
      change: '+12.5%',
      color: 'from-purple-500 to-violet-600'
    }
  ];

  const recentTransactions = [
    {
      type: 'Data Earnings',
      amount: '+$23.45',
      source: 'Location Data - Retail Analytics',
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
      type: 'Data Earnings',
      amount: '+$18.92',
      source: 'Shopping Behavior - Market Research',
      time: '2 days ago',
      icon: TrendingUp,
      color: 'text-green-600'
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

  return (
    <div className="p-4 space-y-6">
      {/* Balance Cards */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Your Balances</h2>
        {balances.map((balance, index) => (
          <Card key={index} className="overflow-hidden">
            <div className={`h-1 bg-gradient-to-r ${balance.color}`} />
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">{balance.type}</p>
                  <p className="text-2xl font-bold text-gray-900">{balance.amount}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-green-600 font-medium">{balance.change}</p>
                  <p className="text-xs text-gray-500">24h</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
          <Button variant="outline" className="py-6 rounded-xl border-2 hover:bg-gray-50">
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
    </div>
  );
};

export default WalletDashboard;
