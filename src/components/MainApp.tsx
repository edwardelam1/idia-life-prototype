
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
    <div className="flex flex-col h-screen overflow-hidden relative">
      {/* Ambient background gradients */}
      <div className="fixed inset-0 bg-background">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/5 via-transparent to-transparent" />
      </div>

      <Header />
      
      <main className="flex-1 overflow-hidden pt-16 pb-20 relative z-10">
        <div className="h-full max-w-4xl mx-auto px-3">
          {/* Holographic Shell - Primary glassmorphism container */}
          <div className="h-full relative">
            {/* Outer glow layer */}
            <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 rounded-2xl blur-2xl opacity-50" />
            
            {/* Main glass container */}
            <div className="relative h-full glass rounded-2xl overflow-hidden holographic-border">
              {/* Inner top highlight */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
              
              {/* Content area */}
              <div className="h-full px-4 py-4 overflow-y-auto">
                <ActiveComponent />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Navigation - Glass effect */}
      <nav className="fixed bottom-0 left-0 right-0 nav-glass z-50">
        {/* Top edge glow */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-around py-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center space-y-1 transition-all duration-300 ${
                    isActive 
                      ? 'text-primary scale-110' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="relative">
                    {isActive && (
                      <div className="absolute inset-0 bg-primary/30 blur-lg rounded-full" />
                    )}
                    <Icon className={`w-5 h-5 relative z-10 ${isActive ? 'text-glow' : ''}`} />
                  </div>
                  <span className={`text-xs font-medium ${isActive ? 'text-glow' : ''}`}>
                    {tab.label}
                  </span>
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
