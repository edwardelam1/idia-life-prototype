import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, Sparkles, Crown } from 'lucide-react';
import CPMDashboard from './cpm/CPMDashboard';
import SubscriptionTierCard from './cpm/SubscriptionTierCard';
import { mockSubscriptionTiers } from './cpm/mockData';
import { SubscriptionTier } from './cpm/types';
import { toast } from '@/hooks/use-toast';

const ProScreen = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubscriptionTier['id']>('pro-plus');
  const [tiers, setTiers] = useState(mockSubscriptionTiers);

  const handleSelectTier = (tierId: SubscriptionTier['id']) => {
    setTiers(prev => prev.map(t => ({
      ...t,
      isActive: t.id === tierId
    })));
    setActiveSubTab(tierId);
    toast({
      title: "Plan Updated",
      description: `You've switched to ${tiers.find(t => t.id === tierId)?.name}`,
    });
  };

  const getTabIcon = (id: SubscriptionTier['id']) => {
    switch (id) {
      case 'life-pro': return <Zap className="w-4 h-4" />;
      case 'pro-plus': return <Sparkles className="w-4 h-4" />;
      case 'pure-alpha': return <Crown className="w-4 h-4" />;
    }
  };

  const currentTier = tiers.find(t => t.isActive);

  return (
    <div className="pb-20">
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as SubscriptionTier['id'])}>
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pt-4 pb-2">
          <h1 className="text-xl font-bold mb-3">IDIA Pro</h1>
          <TabsList className="grid w-full grid-cols-3 h-12">
            <TabsTrigger 
              value="life-pro" 
              className="flex items-center gap-1.5 text-xs data-[state=active]:bg-blue-500/20"
            >
              <Zap className="w-3.5 h-3.5" />
              Life Pro
            </TabsTrigger>
            <TabsTrigger 
              value="pro-plus"
              className="flex items-center gap-1.5 text-xs data-[state=active]:bg-purple-500/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Pro+
            </TabsTrigger>
            <TabsTrigger 
              value="pure-alpha"
              className="flex items-center gap-1.5 text-xs data-[state=active]:bg-amber-500/20"
            >
              <Crown className="w-3.5 h-3.5" />
              Pure Alpha
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Life Pro Content */}
        <TabsContent value="life-pro" className="mt-4 space-y-4">
          <SubscriptionTierCard 
            tier={tiers.find(t => t.id === 'life-pro')!} 
            onSelect={handleSelectTier}
          />
          {currentTier?.id === 'life-pro' && <CPMDashboard />}
          {currentTier?.id !== 'life-pro' && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Upgrade to Life Pro to access CPM features</p>
            </div>
          )}
        </TabsContent>

        {/* Pro+ Content */}
        <TabsContent value="pro-plus" className="mt-4 space-y-4">
          <SubscriptionTierCard 
            tier={tiers.find(t => t.id === 'pro-plus')!} 
            onSelect={handleSelectTier}
          />
          {(currentTier?.id === 'pro-plus' || currentTier?.id === 'pure-alpha') && <CPMDashboard />}
          {currentTier?.id === 'life-pro' && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Upgrade to Pro+ for occupational performance features</p>
            </div>
          )}
        </TabsContent>

        {/* Pure Alpha Content */}
        <TabsContent value="pure-alpha" className="mt-4 space-y-4">
          <SubscriptionTierCard 
            tier={tiers.find(t => t.id === 'pure-alpha')!} 
            onSelect={handleSelectTier}
          />
          {currentTier?.id === 'pure-alpha' && (
            <>
              <CPMDashboard />
              {/* Pure Alpha Exclusive: Executive Dashboard Teaser */}
              <div className="p-4 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-600/20 border border-amber-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-5 h-5 text-amber-500" />
                  <h3 className="font-semibold">Executive Dashboard</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  P&L to HRI correlation and team analytics are available in the Hub portal.
                </p>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 rounded bg-background/50">
                    <p className="text-2xl font-bold text-amber-500">12</p>
                    <p className="text-xs text-muted-foreground">Team Members</p>
                  </div>
                  <div className="p-3 rounded bg-background/50">
                    <p className="text-2xl font-bold text-emerald-500">94%</p>
                    <p className="text-xs text-muted-foreground">Avg. Team HRI</p>
                  </div>
                </div>
              </div>
            </>
          )}
          {currentTier?.id !== 'pure-alpha' && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Upgrade to Pure Alpha for executive-grade features</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProScreen;
