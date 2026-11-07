import { useEffect, useRef } from "react";
import { Fingerprint, FileKey, ShieldCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BiometricConsentOverlayProps {
  onAuthorize: () => void;
  onDismiss: () => void;
  busy: boolean;
}

const CONSENT_POINTS = [
  {
    icon: Fingerprint,
    title: "Your consent, your biometrics",
    description: "Face ID, Touch ID, or fingerprint proves it's really you giving consent — no one else can approve for you.",
  },
  {
    icon: FileKey,
    title: "Auditable Consent Artifact",
    description: "Your biometric consent creates a secure consent key that records exactly what you agreed to share.",
  },
  {
    icon: ShieldCheck,
    title: "No consent, no data",
    description: "Nothing from Apple Health, Ford, Strava, Nest, or future sources is ingested without your consent.",
  },
  {
    icon: Lock,
    title: "Earn royalties safely",
    description: "Your consent key protects your data and ensures royalties are paid only to you.",
  },
];

export default function BiometricConsentOverlay({ onAuthorize, onDismiss, busy }: BiometricConsentOverlayProps) {
  const authorizeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    authorizeRef.current?.focus();
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
        aria-labelledby="biometric-consent-title"
        aria-describedby="biometric-consent-description"
        className="max-h-full w-full max-w-md overflow-y-auto rounded-lg border border-life-amber/55 bg-background/90 p-5 shadow-[0_18px_60px_hsl(var(--foreground)/0.24),0_0_32px_hsl(var(--life-amber)/0.2)] backdrop-blur-xl motion-safe:animate-in motion-safe:zoom-in-95"
      >
        <header className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-life-amber">Life by IDIA</p>
          <h2 id="biometric-consent-title" className="mt-1 text-2xl font-black leading-tight text-foreground">
            Biometric Consent
          </h2>
          <p id="biometric-consent-description" className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Before any of your data can be ingested, we need your consent — confirmed with your device's biometric ID.
          </p>
        </header>

        <div className="mt-5 divide-y divide-border/60 border-y border-border/60">
          {CONSENT_POINTS.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-start gap-3 py-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-life-teal/35 bg-life-teal/10 text-life-teal">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground">{title}</h3>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>

        <Button ref={authorizeRef} type="button" className="mt-5 w-full" onClick={onAuthorize} disabled={busy}>
          {busy ? "Verifying…" : "Give Consent with Biometrics"}
        </Button>
        <Button type="button" variant="ghost" className="mt-2 w-full" onClick={onDismiss} disabled={busy}>
          Not now
        </Button>
      </section>
    </div>
  );
}
