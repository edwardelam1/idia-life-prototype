
import { useState, useEffect } from 'react';
import { Wallet, Database, Users, ShoppingBag, Vote } from 'lucide-react';
import WalletDashboard from './WalletDashboard';
import DataDashboard from './DataDashboard';
import SocialScreen from './SocialScreen';
import ShopScreen from './ShopScreen';
import GovernanceScreen from './GovernanceScreen';
import Header from './Header';
import FriendAssistant from './FriendAssistant';

const MainApp = () => {
  const [activeTab, setActiveTab] = useState('wallet');
  const [showFriend, setShowFriend] = useState(false);
  const [friendTrigger, setFriendTrigger] = useState<'social' | 'wallet' | 'data' | 'achievement' | undefined>();

  const tabs = [
    { id: 'wallet', label: 'Wallet', icon: Wallet, component: WalletDashboard },
    { id: 'data', label: 'My Data', icon: Database, component: DataDashboard },
    { id: 'social', label: 'Social', icon: Users, component: SocialScreen },
    { id: 'shop', label: 'Shop', icon: ShoppingBag, component: ShopScreen },
    { id: 'vote', label: 'Vote', icon: Vote, component: GovernanceScreen },
  ];

  // Handle social tab selection
  useEffect(() => {
    if (activeTab === 'social') {
      setFriendTrigger('social');
      setShowFriend(true);
    } else {
      // Hide friend when leaving social tab (unless triggered by other events)
      if (friendTrigger === 'social') {
        setShowFriend(false);
      }
    }
  }, [activeTab, friendTrigger]);

  // Listen for Friend Assistant trigger events from other components
  useEffect(() => {
    const handleShowFriend = (event: CustomEvent) => {
      const { trigger } = event.detail;
      setFriendTrigger(trigger);
      setShowFriend(true);
    };

    window.addEventListener('showFriend', handleShowFriend as EventListener);
    
    return () => {
      window.removeEventListener('showFriend', handleShowFriend as EventListener);
    };
  }, []);

  // Monitor for significant events (example: wallet balance changes)
  useEffect(() => {
    // This would typically monitor wallet balance changes from context or props
    // For now, we'll simulate checking for balance increases
    const checkForWalletUpdates = () => {
      // In a real implementation, this would come from wallet context/state
      // For demo purposes, we'll simulate occasional balance increases
      const simulateBalanceIncrease = Math.random() < 0.1; // 10% chance per check
      
      if (simulateBalanceIncrease && !showFriend) {
        setFriendTrigger('wallet');
        setShowFriend(true);
      }
    };

    const interval = setInterval(checkForWalletUpdates, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [showFriend]);

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || WalletDashboard;

  const handleCloseFriend = () => {
    setShowFriend(false);
    setFriendTrigger(undefined);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex flex-col">
      {/* Fixed Header */}
      <Header />
      
      {/* Scrollable Main Content with top padding to account for fixed header */}
      <main className="flex-1 overflow-y-auto pt-20 relative z-0">
        <ActiveComponent />
      </main>

      {/* Fixed Bottom Navigation */}
      <div className="sticky bottom-0 z-40 bg-white border-t border-gray-200 shadow-lg">
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

      {/* Friend Assistant Overlay */}
      <FriendAssistant 
        isVisible={showFriend}
        onClose={handleCloseFriend}
        trigger={friendTrigger}
      />
    </div>
  );
};

export default MainApp;
