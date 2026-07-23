import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { REQUIRED_AGE_VERIFICATION_VERSION } from "@/config/consent";
import { localDOBVault } from "@/lib/localDOBVault";

const AgeVerification = () => {
  const navigate = useNavigate();
  const [dob, setDob] = useState("");
  const [rejected, setRejected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const maxDate = useMemo(() => {
    console.log("🛡️ [DOB_LOG][BEGIN: Planck.Web.AgeGate.Init] Calculating 18-year threshold.");
    const t = new Date();
    const cutoff = new Date(t.getFullYear() - 18, t.getMonth(), t.getDate());
    const formatted = cutoff.toISOString().split("T")[0];
    console.log(`🛡️ [DOB_LOG][END: Planck.Web.AgeGate.Init] Cutoff locked: ${formatted}`);
    return formatted;
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) navigate("/auth", { replace: true });
    });
  }, [navigate]);

  const handleSubmit = async () => {
    console.log("🛡️ [DOB_LOG][BEGIN: Planck.Web.AgeGate.Verify] Validating submitted date.");
    setError(null);
    if (!dob) {
      setError("Please select your date of birth.");
      return;
    }
    const userDate = new Date(dob);
    const cutoff = new Date(maxDate);
    if (userDate > cutoff) {
      console.log("🚨 [DOB_LOG][REJECT: Planck.Web.AgeGate.Verify] Minor detected.");
      setRejected(true);
      return;
    }

    setLoading(true);
    try {
      const { data: { user }, error: uerr } = await supabase.auth.getUser();
      if (uerr || !user) throw new Error("Session lost");

      localDOBVault.save(dob);
      console.log("🛡️ [DOB_LOG][VAULT] DOB stored to device-only vault.");

      const { error: aerr } = await supabase.auth.updateUser({
        data: {
          age_verified: true,
          age_verified_at: new Date().toISOString(),
          age_verification_version: REQUIRED_AGE_VERIFICATION_VERSION,
        },
      });
      if (aerr) throw aerr;

      console.log("🛡️ [DOB_LOG][END: Planck.Web.AgeGate.Verify] Age cleared. Routing to /terms.");
      toast.success("Age verified");
      navigate("/terms", { replace: true });
    } catch (e: any) {
      console.error("🚨 [DOB_LOG][FATAL]", e);
      setError(e?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  if (rejected) {
    return (
      <div className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-xl flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-destructive/40 bg-card shadow-2xl p-8 space-y-4 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <h1 className="text-lg font-bold">Ineligible</h1>
          <p className="text-sm text-muted-foreground">
            You must be at least 18 years old to use Life by IDIA. Access has been denied for this session.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate("/auth", { replace: true });
            }}
          >
            Return to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-xl flex items-center justify-center p-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-border bg-gradient-to-br from-primary/5 to-transparent flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Verify Your Age</h1>
            <p className="text-xs text-muted-foreground">
              You must be 18 or older to establish your standing.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-xs text-muted-foreground">
            Your date of birth is stored only on this device — it is never transmitted to IDIA servers.
          </p>

          <div>
            <label htmlFor="dob" className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Date of Birth
            </label>
            <input
              id="dob"
              type="date"
              max={maxDate}
              value={dob}
              onChange={(e) => {
                console.log(`🛡️ [DOB_LOG][INPUT] ${e.target.value}`);
                setDob(e.target.value);
                setError(null);
              }}
              className="block w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 text-base"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-destructive">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!dob || loading}
            className="w-full h-12 text-base font-semibold"
          >
            {loading ? "Verifying…" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AgeVerification;
