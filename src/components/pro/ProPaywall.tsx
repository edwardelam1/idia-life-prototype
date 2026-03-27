import { useState } from 'react';
import { Crown, Brain, Zap, Shield, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { SubscriptionTier } from '@/hooks/useSubscription';
import { toast } from '@/hooks/use-toast';

const tiers = [
  {
    id: 'pro' as SubscriptionTier,
    name: 'IDIA Life Pro',
    price: '$9.99',
    period: '/mo',
    subtitle: 'Workforce Optimization',
    icon: Crown,
    color: 'from-[hsl(178,42%,32%)] to-[hsl(178,42%,42%)]',
    border: 'border-[hsl(178,42%,32%)/0.3]',
    features: [
      'Human Reliability Index (HRI)',
      'Gig Economy Performance Tools',
      'Bio-Tether Link',
      'Cognitive Battery Alerts',
    ],
  },
  {
    id: 'pro_plus' as SubscriptionTier,
    name: 'IDIA Life Pro+',
    price: '$29.99',
    period: '/mo',
    subtitle: 'Cognitive Performance',
    icon: Brain,
    color: 'from-[hsl(28,80%,55%)] to-[hsl(28,80%,45%)]',
    border: 'border-[hsl(28,80%,55%)/0.3]',
    popular: true,
    features: [
      'Everything in Pro',
      'CPM Dashboard',
      '40Hz Gamma Trigger',
      'RSVP Memory Anchoring',
      'Pattern of Life Monitor',
    ],
  },
  {
    id: 'pure_alpha' as SubscriptionTier,
    name: 'Pure Alpha',
    price: '$99.99',
    period: '/mo',
    subtitle: 'Executive Sovereignty',
    icon: Zap,
    color: 'from-[hsl(270,60%,50%)] to-[hsl(270,60%,35%)]',
    border: 'border-[hsl(270,60%,50%)/0.3]',
    features: [
      'Everything in Pro+',
      'P&L Fusion Dashboard',
      'HRV × Revenue Correlation',
      'Ghost Protocol (Duress)',
      'Sovereign Auth Biometrics',
    ],
  },
];

interface ProPaywallProps {
  onSubscribe: (tier: SubscriptionTier) => Promise<boolean>;
}

const ProPaywall = ({ onSubscribe }: ProPaywallProps) => {
  const [confirmTier, setConfirmTier] = useState<typeof tiers[0] | null>(null);
  const [subscribing, setSubscribing] = useState(false);

  const handleConfirm = async () => {
    if (!confirmTier) return;
    setSubscribing(true);
    const ok = await onSubscribe(confirmTier.id);
    setSubscribing(false);
    if (ok) {
      toast({ title: 'Welcome to ' + confirmTier.name, description: 'Your subscription is now active.' });
      setConfirmTier(null);
    } else {
      toast({ title: 'Subscription failed', description: 'Please sign in and try again.', variant: 'destructive' });
    }
  };

  return (
    <div className="p-4 pb-24 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xl border border-white/20">
          <Shield className="w-4 h-4 text-[hsl(28,80%,55%)]" />
          <span className="text-xs font-medium text-muted-foreground">Sovereign Access</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Unlock Your Edge</h1>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Advanced cognitive & financial tools powered by your bio-data sovereignty.
        </p>
      </div>

      {/* Tier Cards */}
      <div className="space-y-4">
        {tiers.map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.id}
              className={`relative rounded-2xl border ${t.border} bg-card/80 backdrop-blur-xl shadow-lg overflow-hidden transition-all hover:shadow-xl`}
            >
              {t.popular && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-[hsl(28,80%,55%)] to-[hsl(28,80%,65%)] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                  MOST POPULAR
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${t.color} flex items-center justify-center`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-sm">{t.name}</h3>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t.subtitle}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-foreground">{t.price}</span>
                    <span className="text-xs text-muted-foreground">{t.period}</span>
                  </div>
                </div>
                <ul className="space-y-1.5 mb-4">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="w-3 h-3 text-[hsl(178,42%,32%)] shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full bg-gradient-to-r ${t.color} text-white border-0 hover:opacity-90`}
                  onClick={() => setConfirmTier(t)}
                >
                  Subscribe
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Dialog (Mock RevenueCat) */}
      <Dialog open={!!confirmTier} onOpenChange={() => setConfirmTier(null)}>
        <DialogContent className="max-w-sm backdrop-blur-xl bg-card/95">
          <DialogHeader>
            <DialogTitle>Confirm Subscription</DialogTitle>
            <DialogDescription>
              You're subscribing to <strong>{confirmTier?.name}</strong> at {confirmTier?.price}/month. You can cancel anytime.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            <p>✓ 7-day free trial included</p>
            <p>✓ Cancel anytime from Settings</p>
            <p>✓ Secured by Bio-Sovereign Auth</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTier(null)}>Cancel</Button>
            <Button
              className={`bg-gradient-to-r ${confirmTier?.color} text-white border-0`}
              onClick={handleConfirm}
              disabled={subscribing}
            >
              {subscribing ? 'Processing...' : 'Confirm & Subscribe'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProPaywall;
