import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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

// FIX 1: Strict relative path to avoid Vite/Lovable ENOENT build errors
import OnboardingModal from "./ui/OnboardingModal";

const MainApp = () => {
  const [activeTab, setActiveTab] = useState("data"); // Default to Data to prevent initial load lock
  const [showFriend, setShowFriend] = useState(false);
  const [friendTrigger, setFriendTrigger] = useState<"social" | "wallet" | "data" | "achievement" | undefined>();

  // Infrastructure State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasDismissedOnboarding, setHasDismissedOnboarding] = useState(false);
  const [isProvisioned, setIsProvisioned] = useState({ circle: false, fbo: false });
  const [auditComplete, setAuditComplete] = useState(false);

  // 1. The Isolated Infrastructure Audit
  useEffect(() => {
    const verifySovereignInfrastructure = async () => {
      console.log("[START] MainApp: Executing infrastructure audit...");
      try {
        // @ts-ignore
        const { data, error: authError } = await supabase.auth.getUser();

        if (authError || !data?.user) {
          setAuditComplete(true);
          return;
        }

        // FIX 2: VULNERABILITY PATCHED: Casting to 'any' bypasses Lovable's outdated local schema cache
        const { data: profileData, error: profileError } = await (supabase.from("profiles") as any)
          .select("circle_user_id, fbo_account_id")
          .eq("user_id", data.user.id)
          .single();

        if (profileError) throw profileError;

        setIsProvisioned({
          circle: !!profileData?.circle_user_id,
          fbo: !!profileData?.fbo_account_id,
        });

        console.log(
          `[SUCCESS] MainApp Audit Complete - Circle: ${!!profileData?.circle_user_id}, FBO: ${!!profileData?.fbo_account_id}`,
        );
      } catch (error) {
        console.error("[ERROR] MainApp: Infrastructure audit failed.", error);
      } finally {
        setAuditComplete(true);
      }
    };

    verifySovereignInfrastructure();
  }, []);

  // 2. THE "FLOOR SENSOR" - 1 of 2 required to bypass.
  useEffect(() => {
    if (auditComplete && activeTab === "wallet") {
      // Logic Update: They are only fully locked if they have NEITHER rail.
      const isFullyLocked = !isProvisioned.circle && !isProvisioned.fbo;

      if (isFullyLocked && !hasDismissedOnboarding && !showOnboarding) {
        console.log("[INFO] Floor Sensor Triggered: 0 Rails detected. Deploying Modal.");
        setShowOnboarding(true);
      }
    }
  }, [activeTab, isProvisioned, auditComplete, hasDismissedOnboarding, showOnboarding]);

  const tabs = [
    { id: "wallet", label: "Wallet", icon: Wallet, component: EnhancedWalletDashboard },
    { id: "data", label: "My Data", icon: Database, component: DataDashboard },
    { id: "social", label: "Social", icon: Users, component: EnhancedSocialScreen },
    { id: "shop", label: "Shop", icon: ShoppingBag, component: ShopScreen },
    { id: "vote", label: "Vote", icon: Vote, component: GovernanceScreen },
    { id: "pro", label: "Pro", icon: Crown, component: ProScreen },
  ];

  useEffect(() => {
    if (activeTab === "social") {
      setFriendTrigger("social");
      setShowFriend(true);
    } else {
      if (friendTrigger === "social") setShowFriend(false);
    }
  }, [activeTab, friendTrigger]);

  useEffect(() => {
    const handleShowFriend = (event: CustomEvent) => {
      const { trigger } = event.detail;
      setFriendTrigger(trigger);
      setShowFriend(true);
    };

    window.addEventListener("showFriend", handleShowFriend as EventListener);
    return () => window.removeEventListener("showFriend", handleShowFriend as EventListener);
  }, []);

  const ActiveComponent = tabs.find((tab) => tab.id === activeTab)?.component || EnhancedWalletDashboard;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Header is now completely isolated from MainApp's state updates */}
      <Header />

      {/* Added 'relative' to main to contain the Glass Shield */}
      <main className="flex-1 overflow-hidden pt-[calc(3.5rem+env(safe-area-inset-top))] relative">
        {/* THE GLASS SHIELD: Intercepts all physical touches if they have 0 rails setup */}
        {activeTab === "wallet" && !isProvisioned.circle && !isProvisioned.fbo && !showOnboarding && (
          <div
            className="absolute inset-0 z-40 bg-background/20 backdrop-blur-[1px] cursor-pointer"
            onClick={() => {
              console.log("[INFO] Wallet touch intercepted. Relaunching Modal.");
              setShowOnboarding(true);
            }}
          />
        )}

        <div className="h-full max-w-4xl mx-auto">
          <div className="h-full px-2 pb-2 overflow-y-auto">
            <ActiveComponent />
          </div>
        </div>
      </main>

      {/* FORTIFIED NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border pb-[env(safe-area-inset-bottom)] z-[9999] isolate pointer-events-auto shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        <div className="max-w-4xl mx-auto px-2">
          <div className="flex justify-around py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex flex-col items-center space-y-0.5 transition-colors p-2 z-[10000] ${
                    activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5 pointer-events-none" />
                  <span className="text-xs pointer-events-none">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {showOnboarding && (
        <OnboardingModal
          isVisible={showOnboarding}
          onClose={() => {
            console.log("[INFO] Modal dismissed. Engaging the Glass Shield.");
            setShowOnboarding(false);
            setHasDismissedOnboarding(true);
            // Notice: We NO LONGER eject them to "data". They stay on wallet.
          }}
          needsCircle={!isProvisioned.circle}
          needsFBO={!isProvisioned.fbo}
        />
      )}

      {showFriend && (
        <FriendAssistant
          isVisible={showFriend}
          onClose={() => {
            setShowFriend(false);
            setFriendTrigger(undefined);
          }}
          trigger={friendTrigger}
        />
      )}
    </div>
  );
};

export default MainApp;