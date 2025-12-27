
import { useState, useEffect } from 'react';
import { Wallet, Database, Users, ShoppingBag, Vote, Sparkles } from 'lucide-react';
import WalletDashboard from './WalletDashboard';
import EnhancedWalletDashboard from './enhanced/EnhancedWalletDashboard';
import DataDashboard from './DataDashboard';
import SocialScreen from './SocialScreen';
import EnhancedSocialScreen from './enhanced/EnhancedSocialScreen';
import ShopScreen from './ShopScreen';
import GovernanceScreen from './GovernanceScreen';
import ProScreen from './ProScreen';
import Header from './Header';
import FriendAssistant from './FriendAssistant';

const MainApp = () => {
  const [activeTab, setActiveTab] = useState('wallet');
  const [showFriend, setShowFriend] = useState(false);
  const [friendTrigger, setFriendTrigger] = useState<'social' | 'wallet' | 'data' | 'achievement' | undefined>();

  const tabs = [
    { id: 'wallet', label: 'Wallet', icon: Wallet, component: EnhancedWalletDashboard },
    { id: 'data', label: 'My Data', icon: Database, component: DataDashboard },
    { id: 'pro', label: 'Pro', icon: Sparkles, component: ProScreen },
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
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <main className="flex-1 overflow-hidden pt-14">
        <div className="h-full max-w-4xl mx-auto">
          <div className="h-full px-2 pb-2 overflow-y-auto">
            <ActiveComponent />
          </div>
        </div>
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="max-w-4xl mx-auto px-2">
          <div className="flex justify-around py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center space-y-0.5 ${
                    activeTab === tab.id ? 'text-primary' : 'text-gray-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

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
