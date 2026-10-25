import { useEffect, useRef } from "react";
import { Coins, Crown, Gavel, Landmark, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import idiaTokenLogo from "@/assets/idia-token-logo.jpg.asset.json";

interface WelcomeToGovOverlayProps {
  onDismiss: () => void;
}

const GOV_FEATURES: { icon: typeof Coins; logo?: string; title: string; description: string }[] = [
  { icon: Coins, logo: idiaTokenLogo.url, title: "IDIA Token", description: "Your governance balance, verifiable on Basescan." },
  { icon: Scale, title: "Jurisdiction", description: "Switch between the Wyoming DUNA and Delaware portals." },
  { icon: Crown, title: "Hats", description: "The roles you hold in the DAO." },
  { icon: Landmark, title: "Decentralized Community Grant Pools", description: "Live on-chain local funding pools." },
  { icon: Gavel, title: "Proposals", description: "Review, vote 1:1, and submit when eligible." },
];

export default function WelcomeToGovOverlay({ onDismiss }: WelcomeToGovOverlayProps) {
  const okayButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    okayButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/35 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onDismiss();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-to-gov-title"
        aria-describedby="welcome-to-gov-description"
        className="max-h-full w-full max-w-md overflow-y-auto rounded-lg border border-life-amber/55 bg-background/90 p-5 shadow-[0_18px_60px_hsl(var(--foreground)/0.24),0_0_32px_hsl(var(--life-amber)/0.2)] backdrop-blur-xl motion-safe:animate-in motion-safe:zoom-in-95"
      >
        <header className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-life-amber">Life by IDIA</p>
          <h2 id="welcome-to-gov-title" className="mt-1 text-2xl font-black leading-tight text-foreground">
            Welcome to Gov
          </h2>
          <p id="welcome-to-gov-description" className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Shape the IDIA Protocol through transparent, on-chain community governance.
          </p>
        </header>

        <div className="mt-5 divide-y divide-border/60 border-y border-border/60">
          {GOV_FEATURES.map(({ icon: Icon, logo, title, description }) => (
            <div key={title} className="flex items-start gap-3 py-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-life-teal/35 bg-life-teal/10 text-life-teal">
                {logo ? <img src={logo} alt="" className="h-8 w-8 rounded-full object-cover" /> : <Icon className="h-4 w-4" aria-hidden="true" />}
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground">{title}</h3>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>

        <Button ref={okayButtonRef} type="button" className="mt-5 w-full" onClick={onDismiss}>
          Okay
        </Button>
      </section>
    </div>
  );
}