import { useState } from "react";
import { Crown, Brain, Zap, Shield, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { SubscriptionTier } from "@/hooks/useSubscription";
import { toast } from "@/hooks/use-toast";

const TIER_RANK: Record<string, number> = {
  pro: 1,
  pro_plus: 2,
  pure_alpha: 3,
};

const tiers = [
  {
    id: "pro" as SubscriptionTier,
    name: "IDIA Life Pro",
    price: "$9.99",
    period: "/mo",
    subtitle: "Workforce Optimization",
    icon: Crown,
    color: "from-[hsl(178,42%,32%)] to-[hsl(178,42%,42%)]",
    border: "border-[hsl(178,42%,32%)/0.3]",
    features: [
      "Human Reliability Index (HRI)",
      "Gig Economy Performance Tools",
      "Bio-Tether Link",
      "Cognitive Battery Alerts",
    ],
  },
  {
    id: "pro_plus" as SubscriptionTier,
    name: "IDIA Life Pro+",
    price: "$29.99",
    period: "/mo",
    subtitle: "Cognitive Performance",
    icon: Brain,
    color: "from-[hsl(28,80%,55%)] to-[hsl(28,80%,45%)]",
    border: "border-[hsl(28,80%,55%)/0.3]",
    popular: true,
    features: [
      "Everything in Pro",
      "CPM Dashboard",
      "40Hz Gamma Trigger",
      "RSVP Memory Anchoring",
      "Pattern of Life Monitor",
    ],
  },
  {
    id: "pure_alpha" as SubscriptionTier,
    name: "Pure Alpha",
    price: "$99.99",
    period: "/mo",
    subtitle: "Executive Sovereignty",
    icon: Zap,
    color: "from-[hsl(270,60%,50%)] to-[hsl(270,60%,35%)]",
    border: "border-[hsl(270,60%,50%)/0.3]",
    features: [
      "Everything in Pro+",
      "P&L Fusion Dashboard",
      "HRV × Revenue Correlation",
      "Ghost Protocol (Duress)",
      "Sovereign Auth Biometrics",
    ],
  },
];

interface ProPaywallProps {
  currentTier: SubscriptionTier;
  onSubscribe: (tier: SubscriptionTier) => Promise<boolean>;
}

const ProPaywall = ({ currentTier, onSubscribe }: ProPaywallProps) => {
  const [confirmTier, setConfirmTier] = useState<(typeof tiers)[0] | null>(null);
  const [subscribing, setSubscribing] = useState(false);

  const handleConfirm = async () => {
    if (!confirmTier) return;
    setSubscribing(true);
    const ok = await onSubscribe(confirmTier.id);
    setSubscribing(false);
    if (ok) {
      toast({ title: "Plan Updated", description: `You are now on ${confirmTier.name}.` });
      setConfirmTier(null);
    } else {
      toast({ title: "Update failed", description: "Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="p-4 pb-24 space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xl border border-white/20">
          <Shield className="w-4 h-4 text-[hsl(28,80%,55%)]" />
          <span className="text-xs font-medium text-muted-foreground">Sovereign Access Control</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Sovereign Subscription Matrix</h1>
      </div>

      <div className="space-y-4">
        {tiers.map((t) => {
          const Icon = t.icon;
          const isActive = currentTier === t.id;
          const isUpgrade = currentTier ? TIER_RANK[t.id as string] > TIER_RANK[currentTier as string] : true;

          return (
            <div
              key={t.id}
              className={`relative rounded-2xl border ${t.border} bg-card/80 backdrop-blur-xl shadow-lg overflow-hidden transition-all ${isActive ? "ring-2 ring-[hsl(178,42%,32%)]" : ""}`}
            >
              {isActive && (
                <div className="absolute top-0 right-0 bg-[hsl(178,42%,32%)] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                  CURRENT PLAN
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${t.color} flex items-center justify-center`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">{t.name}</h3>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t.subtitle}</p>
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
                  className={`w-full bg-gradient-to-r ${t.color} text-white border-0`}
                  onClick={() => setConfirmTier(t)}
                  disabled={isActive || subscribing}
                >
                  {isActive ? "Active" : isUpgrade ? "Upgrade" : "Downgrade"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!confirmTier} onOpenChange={() => setConfirmTier(null)}>
        <DialogContent className="max-w-sm backdrop-blur-xl bg-card/95">
          <DialogHeader>
            <DialogTitle>Confirm Transition</DialogTitle>
            <DialogDescription>
              {currentTier ? (
                <>
                  Moving from <strong>{tiers.find((t) => t.id === currentTier)?.name}</strong> to{" "}
                  <strong>{confirmTier?.name}</strong>.
                </>
              ) : (
                <>
                  Subscribing to <strong>{confirmTier?.name}</strong> at {confirmTier?.price}/mo.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTier(null)}>
              Cancel
            </Button>
            <Button
              className={`bg-gradient-to-r ${confirmTier?.color} text-white border-0`}
              onClick={handleConfirm}
              disabled={subscribing}
            >
              {subscribing ? "Processing..." : "Confirm Change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProPaywall;
