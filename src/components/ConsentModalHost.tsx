import { useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { supabase } from "@/integrations/supabase/client";
import { nextConsentRoute } from "@/config/consent";
import { Button } from "@/components/ui/button";
import AgeVerification from "@/pages/AgeVerification";
import TermsOfService from "@/pages/TermsOfService";
import AuthorityOfRecord from "@/pages/AuthorityOfRecord";

/** Do not mount protected content until server-verified consent is complete. */
export default function ConsentModalHost({ session, children }: { session: Session | null; children: ReactNode }) {
  const [verified, setVerified] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    let sequence = 0;
    const check = async () => {
      const request = ++sequence;
      setChecking(true);
      setFailed(false);
      console.log("[CONSENT_GUARD][BEGIN] Checking current consent with Auth.");
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!alive || request !== sequence) return;
        if (error || !data.user) throw new Error("Consent verification unavailable");
        setVerified(data.user);
        console.log(`[CONSENT_GUARD][END] required=${nextConsentRoute(data.user.user_metadata) ?? "none"}`);
      } catch {
        if (!alive || request !== sequence) return;
        setVerified(null);
        setFailed(true);
        console.log("[CONSENT_GUARD][END] BLOCKED: Unable to verify consent.");
      } finally {
        if (alive && request === sequence) setChecking(false);
      }
    };
    if (!session) {
      setVerified(null);
      setChecking(false);
      return;
    }
    void check();
    const onForeground = () => {
      if (document.visibilityState === "visible") void check();
      else setChecking(true);
    };
    const onNativeResume = () => { void check(); };
    document.addEventListener("visibilitychange", onForeground);
    window.addEventListener("pageshow", onNativeResume);
    window.addEventListener("idia:app-foreground", onNativeResume);
    let removeNative: (() => void) | undefined;
    void import("@capacitor/app").then(async ({ App }) => {
      const listener = await App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) void check();
        else if (alive) setChecking(true);
      });
      if (!alive) void listener.remove();
      else removeNative = () => { void listener.remove(); };
    }).catch(() => { /* Custom iOS shell uses DOM foreground events. */ });
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onForeground);
      window.removeEventListener("pageshow", onNativeResume);
      window.removeEventListener("idia:app-foreground", onNativeResume);
      removeNative?.();
    };
  }, [session, attempt]);

  if (!session) return <>{children}</>;
  // Also block the first render after an account switch, before the effect runs.
  if (checking || failed || verified?.id !== session.user.id) {
    return <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-4 bg-background text-foreground" role="status">
      <p>{failed ? "We couldn't verify your consent. Please try again." : "Checking your account…"}</p>
      {failed && <><Button onClick={() => setAttempt(value => value + 1)}>Try again</Button>
        <Button variant="ghost" onClick={() => { void supabase.auth.signOut({ scope: "local" }); }}>Sign out</Button></>}
    </div>;
  }
  const target = nextConsentRoute(verified.user_metadata);
  if (!target) return <>{children}</>;
  if (target === "/age-verification") return <AgeVerification />;

  return <DialogPrimitive.Root open>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-[300] bg-foreground/35 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className="royalty-glass-panel fixed inset-0 z-[301] m-auto flex h-[min(90dvh,900px)] w-[calc(100%-2rem)] max-w-2xl flex-col overflow-hidden rounded-lg border border-life-amber/55 bg-background/90 text-foreground backdrop-blur-xl"
        onEscapeKeyDown={event => event.preventDefault()}
        onPointerDownOutside={event => event.preventDefault()}
        onInteractOutside={event => event.preventDefault()}
        aria-describedby="required-consent-description"
      >
        <div className="shrink-0 border-b border-border/60 px-5 py-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-life-amber">Life by IDIA</p>
          <DialogPrimitive.Title className="mt-1 text-lg font-bold">{target === "/terms" ? "Review and Accept the Terms" : "Complete Your Attestation"}</DialogPrimitive.Title>
          <DialogPrimitive.Description id="required-consent-description" className="mt-1 text-xs text-muted-foreground">
            {target === "/terms" ? "Step 1 of 2 · Please review the Terms to continue." : "Step 2 of 2 · Record your decision to continue. Authorization is optional."}
          </DialogPrimitive.Description>
        </div>
        {target === "/terms" ? <TermsOfService embedded onComplete={() => setAttempt(value => value + 1)} /> :
          <AuthorityOfRecord embedded onComplete={() => setAttempt(value => value + 1)} />}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>;
}