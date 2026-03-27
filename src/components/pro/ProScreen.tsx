import { useSubscription } from '@/hooks/useSubscription';
import ProPaywall from './ProPaywall';
import HRIDashboard from './HRIDashboard';
import CPMDashboard from './CPMDashboard';
import PureAlphaDashboard from './PureAlphaDashboard';

const ProScreen = () => {
  const { tier, loading, subscribe } = useSubscription();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[hsl(178,42%,32%)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tier) {
    return <ProPaywall onSubscribe={subscribe} />;
  }

  switch (tier) {
    case 'pro':
      return <HRIDashboard />;
    case 'pro_plus':
      return <CPMDashboard />;
    case 'pure_alpha':
      return <PureAlphaDashboard />;
    default:
      return <ProPaywall onSubscribe={subscribe} />;
  }
};

export default ProScreen;
