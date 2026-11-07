import { useEffect, useState } from "react";
import { ShieldCheck, Loader2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { getVerifiedTotpFactor } from "@/lib/identityVerification";

interface Props {
  reason: string;
  onVerified: () => void;
  onCancel?: () => void;
  onSignOut?: () => void;
}

/** Enrolls an Authenticator app if needed, then verifies a 6-digit code. */
export default function MfaPanel({ reason, onVerified, onCancel, onSignOut }: Props) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const verified = await getVerifiedTotpFactor();
        if (verified) {
          if (alive) setFactorId(verified.id);
        } else {
          // Clear stale unverified factors, then enroll fresh.
          const { data } = await supabase.auth.mfa.listFactors();
          for (const f of data?.all ?? []) {
            if (f.factor_type === "totp" && f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
          }
          const { data: en, error } = await supabase.auth.mfa.enroll({
            factorType: "totp",
            friendlyName: `IDIA Life ${Date.now()}`,
          });
          if (error) throw error;
          if (!alive) return;
          setEnrolling(true);
          setFactorId(en.id);
          setQr(en.totp.qr_code);
          setSecret(en.totp.secret);
        }
      } catch (e: any) {
        if (alive) setError(e?.message || "Could not start verification.");
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const submit = async (value: string) => {
    if (!factorId || value.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: value });
      if (error) throw error;
      onVerified();
    } catch (e: any) {
      setError("That code didn't match. Check your authenticator app and try again.");
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="royalty-glass-panel w-full max-w-sm rounded-3xl border border-amber-400/40 p-6 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-500">Life by IDIA</p>
      <div className="mx-auto mt-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
        <ShieldCheck className="h-6 w-6 text-primary" />
      </div>
      <h2 className="mt-3 text-xl font-black text-foreground">
        {enrolling ? "Set up your Authenticator" : "Enter your security code"}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{reason}</p>

      {enrolling && qr && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-muted-foreground">
            Scan this with Google Authenticator, 1Password, or Apple Passwords, then enter the 6-digit code.
          </p>
          <img src={qr} alt="Authenticator setup QR code" className="mx-auto h-40 w-40 rounded-lg bg-card p-2" />
          {secret && (
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(secret)}
              className="mx-auto flex items-center gap-1 break-all text-[10px] font-mono text-muted-foreground"
            >
              <Copy className="h-3 w-3 shrink-0" /> {secret}
            </button>
          )}
        </div>
      )}

      <div className="mt-5 flex justify-center">
        {busy && !factorId ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : (
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(v) => {
              const digits = v.replace(/\D/g, "");
              setCode(digits);
              if (digits.length === 6) submit(digits);
            }}
            disabled={busy}
            autoFocus
            inputMode="numeric"
          >
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        )}
      </div>
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

      <div className="mt-5 flex flex-col gap-2">
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
        {onSignOut && (
          <Button variant="ghost" size="sm" onClick={onSignOut}>
            Sign out
          </Button>
        )}
      </div>
    </div>
  );
}
