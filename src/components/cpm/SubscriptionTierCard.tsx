import { SubscriptionTier } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubscriptionTierCardProps {
  tier: SubscriptionTier;
  onSelect?: (tierId: SubscriptionTier['id']) => void;
}

const SubscriptionTierCard = ({ tier, onSelect }: SubscriptionTierCardProps) => {
  const getIcon = (id: SubscriptionTier['id']) => {
    switch (id) {
      case 'life-pro': return Zap;
      case 'pro-plus': return Sparkles;
      case 'pure-alpha': return Crown;
    }
  };

  const getBgGradient = (id: SubscriptionTier['id'], isActive: boolean) => {
    if (!isActive) return 'bg-card';
    switch (id) {
      case 'life-pro': return 'bg-gradient-to-br from-blue-500/10 to-blue-600/20 border-blue-500/30';
      case 'pro-plus': return 'bg-gradient-to-br from-purple-500/10 to-purple-600/20 border-purple-500/30';
      case 'pure-alpha': return 'bg-gradient-to-br from-amber-500/10 to-amber-600/20 border-amber-500/30';
    }
  };

  const Icon = getIcon(tier.id);

  return (
    <Card className={cn(
      "transition-all duration-300",
      getBgGradient(tier.id, tier.isActive),
      tier.isActive && "ring-2 ring-primary/50"
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={cn(
              "w-5 h-5",
              tier.id === 'life-pro' ? 'text-blue-500' :
              tier.id === 'pro-plus' ? 'text-purple-500' : 'text-amber-500'
            )} />
            <span className="text-base">{tier.name}</span>
          </div>
          {tier.isActive && (
            <Badge className="bg-primary text-primary-foreground text-xs">
              Current Plan
            </Badge>
          )}
        </CardTitle>
        <p className="text-2xl font-bold">{tier.price}</p>
        <p className="text-sm text-muted-foreground">{tier.description}</p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 mb-4">
          {tier.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm">
              <Check className={cn(
                "w-4 h-4 mt-0.5 shrink-0",
                tier.id === 'life-pro' ? 'text-blue-500' :
                tier.id === 'pro-plus' ? 'text-purple-500' : 'text-amber-500'
              )} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <Button 
          variant={tier.isActive ? "secondary" : "default"}
          className="w-full"
          onClick={() => onSelect?.(tier.id)}
          disabled={tier.isActive}
        >
          {tier.isActive ? 'Current Plan' : 'Upgrade'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SubscriptionTierCard;
