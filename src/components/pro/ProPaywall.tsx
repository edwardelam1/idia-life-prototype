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
    name: "Life Pro",
    price: "FREE (for Now)",
    period: "/mo",
    subtitle: "Workforce Optimization",
    icon: Zap,
    color: "from-[hsl(178,42%,32%)] to-[hsl(178,42%,42%)]",
    border: "border-[hsl(178,42%,32%)/0.3]",
    features: ["Human Reliability Index", "Performance Tools", "Cognitive Alerts"],
  },
  {
    id: "pro_plus" as SubscriptionTier,
    name: "Life Pro+",
    price: "FREE (for Now)",
    period: "/mo",
    subtitle: "Cognitive Performance",
    icon: Brain,
    color: "from-[hsl(178,42%,32%)] to-[hsl(178,42%,42%)]",
    border: "border-[hsl(178,42%,32%)/0.3]",
    popular: true,
    features: ["Everything in Pro", "Pro+ Dashboard", "40Hz Gamma Trigger", "Memory Anchoring"],
  },
  {
    id: "pure_alpha" as SubscriptionTier,
    name: "Pure Alpha",
    price: "FREE (for Now)",
    period: "/mo",
    subtitle: "Executive Sovereignty",
    icon: Crown,
    color: "from-[hsl(178,42%,32%)] to-[hsl(178,42%,42%)]",
    border: "border-[hsl(178,42%,32%)/0.3]",
    features: ["Everything in Pro+", "P&L Fusion", "Ghost Protocol"],
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
    <div className="flex flex-col space-y-5 bg-background min-h-screen p-4 pb-24 overflow-x-hidden animate-in fade-in duration-700">
      <div className="bg-gradient-to-br from-[hsl(178,42%,32%)] to-[hsl(178,42%,42%)] text-white border-none shadow-xl rounded-[2.5rem] overflow-hidden shrink-0 p-7">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-100/60">IDIA Pro Access</p>
            <h1 className="text-4xl font-black truncate">Unlock Your Edge</h1>
          </div>
          <Shield className="w-10 h-10 text-orange-400 drop-shadow-lg shrink-0" />
        </div>
        <div className="mt-6 flex items-center gap-2 border-t border-white/10 pt-4">
          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-orange-400 animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-widest text-teal-50 truncate">
            Preview · Advanced Cognitive &amp; Financial Tools
          </span>
        </div>
      </div>

      <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2">
        <Crown size={14} className="text-orange-500" /> Access Tiers
      </h2>

      <div className="space-y-2.5">
        {tiers.map((t) => {
          const isActive = currentTier === t.id;
          const currentRank = TIER_RANK[String(currentTier)] || 0;
          const targetRank = TIER_RANK[String(t.id)];
          const isUpgrade = targetRank > currentRank;

          return (
            <div
              key={t.id}
              className={`relative rounded-2xl border p-4 bg-card shadow-sm transition-colors ${isActive ? "border-[hsl(178,42%,32%)]" : "border-border"}`}
            >
              {isActive && (
                <div className="absolute top-2 right-2 text-[9px] font-black uppercase tracking-widest text-emerald-500">
                  Current
                </div>
              )}
              {!isActive && (t as any).popular && (
                <div className="absolute top-2 right-2 text-[9px] font-black uppercase tracking-widest text-orange-500">
                  Popular
                </div>
              )}

              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center shadow-sm`}>
                    <t.icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-[13px] leading-tight uppercase tracking-tight text-foreground">
                      {t.name}
                    </h3>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground leading-tight">
                      {t.subtitle}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-foreground">{t.price}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">/mo</span>
                </div>
              </div>
              <ul className="grid grid-cols-2 gap-x-2 gap-y-1 mb-3">
                {t.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground"
                  >
                    <Check className="w-2.5 h-2.5 text-[hsl(178,42%,42%)] shrink-0" />
                    <span className="truncate">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                size="sm"
                variant={isActive ? "outline" : "default"}
                className={`w-full h-9 text-[10px] font-black uppercase tracking-widest rounded-full ${isActive ? "" : `bg-gradient-to-r ${t.color} border-0 text-white hover:opacity-90`}`}
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
