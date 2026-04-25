import { useState, useEffect } from "react";
import { Wallet, Database, Users, ShoppingBag, Vote, Crown } from "lucide-react";
import WalletDashboard from "./WalletDashboard";
import EnhancedWalletDashboard from "./enhanced/EnhancedWalletDashboard";
import DataDashboard from "./DataDashboard";
import SocialScreen from "./SocialScreen";
import EnhancedSocialScreen from "./enhanced/EnhancedSocialScreen";
import ShopScreen from "./ShopScreen";
import GovernanceScreen from "./GovernanceScreen";
import ProScreen from "./pro/ProScreen";
import Header from "./Header";
import FriendAssistant from "./FriendAssistant";

const MainApp = () => {
  const [activeTab, setActiveTab] = useState("wallet");
  const [showFriend, setShowFriend] = useState(false);
  const [friendTrigger, setFriendTrigger] = useState<"social" | "wallet" | "data" | "achievement" | undefined>();

  const tabs = [
    { id: "wallet", label: "Wallet", icon: Wallet, component: EnhancedWalletDashboard },
    { id: "data", label: "My Data", icon: Database, component: DataDashboard },
    { id: "social", label: "Social", icon: Users, component: EnhancedSocialScreen },
    { id: "shop", label: "Shop", icon: ShoppingBag, component: ShopScreen },
    { id: "vote", label: "Vote", icon: Vote, component: GovernanceScreen },
    { id: "pro", label: "Pro", icon: Crown, component: ProScreen },
  ];

  // Automated trigger when entering the Social tab
  useEffect(() => {
    if (activeTab === "social") {
      setFriendTrigger("social");
      setShowFriend(true);
    } else {
      if (friendTrigger === "social") {
        setShowFriend(false);
      }
    }
  }, [activeTab, friendTrigger]);

  // Listener for legitimate app-wide events (e.g., from the Edge Function completion)
  useEffect(() => {
    const handleShowFriend = (event: CustomEvent) => {
      const { trigger } = event.detail;
      setFriendTrigger(trigger);
      setShowFriend(true);
    };

    window.addEventListener("showFriend", handleShowFriend as EventListener);
    return () => {
      window.removeEventListener("showFriend", handleShowFriend as EventListener);
    };
  }, []);

  const ActiveComponent = tabs.find((tab) => tab.id === activeTab)?.component || EnhancedWalletDashboard;

  const handleCloseFriend = () => {
    setShowFriend(false);
    setFriendTrigger(undefined);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <Header />
      <main className="flex-1 overflow-hidden pt-[calc(3.5rem+env(safe-area-inset-top))]">
        <div className="h-full max-w-4xl mx-auto">
          <div className="h-full px-2 pb-2 overflow-y-auto">
            <ActiveComponent />
          </div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border pb-[env(safe-area-inset-bottom)] z-50">
        <div className="max-w-4xl mx-auto px-2">
          <div className="flex justify-around py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center space-y-0.5 transition-colors ${
                    activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
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

      <FriendAssistant isVisible={showFriend} onClose={handleCloseFriend} trigger={friendTrigger} />
    </div>
  );
};

export default MainApp;
