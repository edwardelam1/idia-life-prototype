
import { useState } from 'react';
import { Wallet, Database, Users, ShoppingBag, Vote } from 'lucide-react';
import WalletDashboard from './WalletDashboard';
import DataDashboard from './DataDashboard';
import SocialScreen from './SocialScreen';
import ShopScreen from './ShopScreen';
import GovernanceScreen from './GovernanceScreen';
import Header from './Header';

const MainApp = () => {
  const [activeTab, setActiveTab] = useState('wallet');

  const tabs = [
    { id: 'wallet', label: 'Wallet', icon: Wallet, component: WalletDashboard },
    { id: 'data', label: 'My Data', icon: Database, component: DataDashboard },
    { id: 'social', label: 'Social', icon: Users, component: SocialScreen },
    { id: 'shop', label: 'Shop', icon: ShoppingBag, component: ShopScreen },
    { id: 'vote', label: 'Vote', icon: Vote, component: GovernanceScreen },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || WalletDashboard;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <Header />
      
      <main className="pb-20">
        <ActiveComponent />
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex justify-around py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'text-teal-600 bg-teal-50' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className={`w-6 h-6 mb-1 ${isActive ? 'scale-110' : ''} transition-transform`} />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MainApp;
