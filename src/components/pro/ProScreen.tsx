import { useSubscription } from "@/hooks/useSubscription";
import ProPaywall from "./ProPaywall";
import HRIDashboard from "./HRIDashboard";
import CPMDashboard from "./CPMDashboard";
import PureAlphaDashboard from "./PureAlphaDashboard";

const ProScreen = () => {
  const { tier, loading, subscribe } = useSubscription();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[hsl(178,42%,32%)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Mask data if no active subscription exists in storage/DB
  // Note: We are currently defaulting tier to 'pro' in the hook to bypass this
  const isPaid = !!tier;
  const activeTier = tier || "pro";

  // Passing currentTier fixes TS2741
  if (!tier) {
    return <ProPaywall currentTier={tier} onSubscribe={subscribe} />;
  }

  switch (activeTier) {
    case "pro":
      return <HRIDashboard isMasked={!isPaid} />;
    case "pro_plus":
      return <CPMDashboard isMasked={!isPaid} />;
    case "pure_alpha":
      return <PureAlphaDashboard isMasked={!isPaid} />;
    default:
      return <ProPaywall currentTier={tier} onSubscribe={subscribe} />;
  }
};

export default ProScreen;
