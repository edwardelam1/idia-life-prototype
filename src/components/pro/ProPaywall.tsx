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
import { SubscriptionTier, TIER_RANK } from "@/hooks/useSubscription";
import { toast } from "@/hooks/use-toast";

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
    features: ["Human Reliability Index (HRI)", "Performance Tools", "Bio-Tether Link", "Cognitive Alerts"],
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
    features: ["Everything in Pro", "CPM Dashboard", "40Hz Gamma Trigger", "Memory Anchoring"],
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
    features: ["Everything in Pro+", "P&L Fusion", "Ghost Protocol", "Sovereign Biometrics"],
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
    }
  };

  return (
    <div className="p-4 pb-24 space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <Shield className="w-8 h-8 text-[hsl(28,80%,55%)] mx-auto" />
        <h1 className="text-2xl font-bold">Unlock Your Edge</h1>
        <p className="text-sm text-muted-foreground">Advanced cognitive & financial tools.</p>
      </div>

      <div className="space-y-4">
        {tiers.map((t) => {
          const isActive = currentTier === t.id;
          const currentRank = TIER_RANK[String(currentTier)] || 0;
          const targetRank = TIER_RANK[String(t.id)];
          const isUpgrade = targetRank > currentRank;

          return (
            <div
              key={t.id}
              className={`relative rounded-2xl border p-5 bg-card/80 backdrop-blur-xl ${isActive ? "border-[hsl(178,42%,32%)]" : t.border}`}
            >
              {isActive && (
                <div className="absolute top-0 right-0 bg-[hsl(178,42%,32%)] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl tracking-tighter">
                  CURRENT PLAN
                </div>
              )}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${t.color} flex items-center justify-center`}>
                    <t.icon className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-sm">{t.name}</h3>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold">{t.price}</span>
                  <span className="text-[10px] text-muted-foreground">/mo</span>
                </div>
              </div>
              <ul className="space-y-1.5 mb-5">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Check className="w-3 h-3 text-[hsl(178,42%,32%)]" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className={`w-full bg-gradient-to-r ${t.color} border-0`}
                onClick={() => setConfirmTier(t)}
                disabled={isActive || subscribing}
              >
                {isActive ? "Active" : isUpgrade ? "Upgrade" : "Downgrade"}
              </Button>
            </div>
          );
        })}
      </div>

      <Dialog open={!!confirmTier} onOpenChange={() => setConfirmTier(null)}>
        <DialogContent className="max-w-sm backdrop-blur-xl bg-card/95">
          <DialogHeader>
            <DialogTitle>Confirm Plan Change</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTier(null)}>
              Cancel
            </Button>
            <Button
              className={`bg-gradient-to-r ${confirmTier?.color} text-white`}
              onClick={handleConfirm}
              disabled={subscribing}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProPaywall;
