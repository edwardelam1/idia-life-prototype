import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle2, Fingerprint, Loader2, Lock, ShieldCheck, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getCachedUser } from "@/lib/authUser";
import { generateACAHash } from "@/utils/acaGenerator";
import { supabase } from "@/integrations/supabase/client";
import { saveFileToDevice } from "@/utils/nativeDownload";
import {
  MIN_PASSWORD_LENGTH,
  backupFilename,
  decryptBackup,
  encryptSeed,
  scorePassword,
  serializeBackup,
} from "@/lib/seedBackup";

interface SeedBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "backup" | "restore";
  walletAddress?: string | null;
  getSeedPhrase: () => Promise<string | null>;
  onRestore?: (mnemonic: string) => Promise<void> | void;
  onBackedUp?: () => void;
}

type Step = "gate" | "password" | "saving" | "verify" | "done" | "restore-form" | "restoring";

const SeedBackupModal: React.FC<SeedBackupModalProps> = ({
  isOpen,
  onClose,
  mode,
  walletAddress,
  getSeedPhrase,
  onRestore,
  onBackedUp,
}) => {
  const [step, setStep] = useState<Step>(mode === "restore" ? "restore-form" : "gate");
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [restoreFileText, setRestoreFileText] = useState<string | null>(null);
  const [restoreFileName, setRestoreFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Ciphertext lives in memory only for the verify round-trip.
  const envelopeTextRef = useRef<string | null>(null);

  const reset = () => {
    setStep(mode === "restore" ? "restore-form" : "gate");
    setBusy(false);
    setPassword("");
    setConfirmPassword("");
    setVerifyPassword("");
    setError(null);
    setRestoreFileText(null);
    setRestoreFileName(null);
    envelopeTextRef.current = null;
  };

  useEffect(() => {
    if (isOpen) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode]);

  const handleClose = () => {
    reset();
    onClose();
  };

  // ── Step 1: biometric / enclave attestation ────────────────────────
  const runGate = async () => {
    console.log("[SEED_BACKUP] GATE_START: Requesting biological attestation.");
    setBusy(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await getCachedUser();
      if (!user) throw new Error("Sovereign identity not found.");
      await generateACAHash(user.id, "seed_phrase_backup", ["VAULT_EXPORT", "SELF_CUSTODY"]);
      console.log("[SEED_BACKUP] GATE_END: Attestation accepted.");
      setStep("password");
    } catch (e: any) {
      console.error("[SEED_BACKUP] GATE_FAIL:", e);
      setError(e?.message || "Biometric verification failed.");
    } finally {
      setBusy(false);
    }
  };

  // ── Step 2: encrypt + hand off to the device ───────────────────────
  const strength = scorePassword(password);
  const passwordValid =
    password.length >= MIN_PASSWORD_LENGTH && password === confirmPassword && strength.score >= 2;

  const handleEncryptAndSave = async () => {
    setBusy(true);
    setError(null);
    setStep("saving");
    let mnemonic: string | null = null;
    try {
      mnemonic = await getSeedPhrase();
      if (!mnemonic) throw new Error("Could not read your recovery phrase from this device.");

      const envelope = await encryptSeed(mnemonic, password, walletAddress ?? null);
      const text = serializeBackup(envelope);
      envelopeTextRef.current = text;

      await saveFileToDevice({
        filename: backupFilename(),
        data: text,
        mimeType: "application/json",
      });

      setStep("verify");
    } catch (e: any) {
      console.error("[SEED_BACKUP] SAVE_FAIL:", e);
      setError(e?.message || "Backup failed.");
      setStep("password");
    } finally {
      mnemonic = null;
      setBusy(false);
    }
  };

  // ── Step 3: prove the file opens, then flag the profile ────────────
  const handleVerify = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!envelopeTextRef.current) throw new Error("Backup payload is no longer in memory. Please start over.");
      await decryptBackup(envelopeTextRef.current, verifyPassword);

      const {
        data: { user },
      } = await getCachedUser();
      if (user) {
        const { error: dbError } = await (supabase.from("profiles") as any)
          .update({ is_seed_backed_up: true, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);
        if (dbError) console.warn("[SEED_BACKUP] FLAG_WARN:", dbError.message);
      }

      envelopeTextRef.current = null;
      setStep("done");
      onBackedUp?.();
      toast({ title: "Backup verified", description: "Your encrypted recovery file is confirmed." });
    } catch (e: any) {
      setError(e?.message || "Incorrect password.");
    } finally {
      setBusy(false);
    }
  };

  // ── Restore ────────────────────────────────────────────────────────
  const handleFilePicked = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setRestoreFileName(file.name);
    setRestoreFileText(await file.text());
  };

  const handleRestore = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!restoreFileText) throw new Error("Choose a backup file first.");
      const mnemonic = await decryptBackup(restoreFileText, verifyPassword);
      setStep("restoring");
      await onRestore?.(mnemonic);
      toast({ title: "Vault restored", description: "Your wallet was imported from the backup file." });
      handleClose();
    } catch (e: any) {
      setError(e?.message || "Restore failed.");
      setStep("restore-form");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {mode === "restore" ? <Upload className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            {mode === "restore" ? "Restore from Backup File" : "Back Up Recovery Phrase"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {mode === "restore"
              ? "Decrypt an .idiabk file to recover your vault on this device."
              : "Your phrase is encrypted on this device with a password only you know."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <span className="text-xs text-destructive">{error}</span>
          </div>
        )}

        {/* GATE */}
        {step === "gate" && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-secondary/40 p-3 text-xs text-muted-foreground">
              Verify it's you before your recovery phrase leaves the secure vault.
            </div>
            <Button className="w-full" onClick={runGate} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Fingerprint className="w-4 h-4 mr-2" />}
              Verify Identity
            </Button>
          </div>
        )}

        {/* PASSWORD */}
        {step === "password" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bk-pw" className="text-xs">
                Backup password
              </Label>
              <Input
                id="bk-pw"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              />
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="h-1 w-full rounded bg-muted overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        strength.score >= 4 ? "bg-emerald-500" : "bg-primary"
                      }`}
                      style={{ width: `${(strength.score / 4) * 100}%` }}
                    />
                  </div>
                  <p
                    className={`text-[11px] ${
                      strength.score >= 4 ? "text-emerald-600 font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    {strength.label}
                  </p>
                </div>
              )}

            </div>

            <div className="space-y-2">
              <Label htmlFor="bk-pw2" className="text-xs">
                Confirm password
              </Label>
              <Input
                id="bk-pw2"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <p className="text-[11px] text-destructive">Passwords don't match.</p>
              )}
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <span className="text-[11px] text-muted-foreground">
                IDIA never sees this password and cannot reset it. Lose it and the backup file is permanently
                unreadable.
              </span>
            </div>

            <Button className="w-full" onClick={handleEncryptAndSave} disabled={!passwordValid || busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
              Encrypt & Save Backup
            </Button>
          </div>
        )}

        {/* SAVING */}
        {step === "saving" && (
          <div className="py-8 flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Encrypting your recovery phrase…</p>
          </div>
        )}

        {/* VERIFY */}
        {step === "verify" && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-secondary/40 p-3 text-xs text-muted-foreground">
              Backup file saved. Re-enter your password once to confirm the file opens.
            </div>
            <Input
              type="password"
              autoComplete="off"
              value={verifyPassword}
              onChange={(e) => setVerifyPassword(e.target.value)}
              placeholder="Backup password"
            />
            <Button className="w-full" onClick={handleVerify} disabled={!verifyPassword || busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              Confirm Backup
            </Button>
          </div>
        )}

        {/* DONE */}
        {step === "done" && (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto text-primary" />
            <p className="text-sm font-semibold">Recovery phrase backed up</p>
            <p className="text-xs text-muted-foreground">
              Store the file somewhere safe and offline. Anyone with the file <em>and</em> your password controls this
              vault.
            </p>
            <Button className="w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        )}

        {/* RESTORE */}
        {step === "restore-form" && (
          <div className="space-y-4">
            <input
              ref={fileRef}
              type="file"
              accept=".idiabk,application/json,text/plain"
              className="hidden"
              onChange={(e) => handleFilePicked(e.target.files?.[0])}
            />
            <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              {restoreFileName || "Choose backup file"}
            </Button>
            <Input
              type="password"
              autoComplete="off"
              value={verifyPassword}
              onChange={(e) => setVerifyPassword(e.target.value)}
              placeholder="Backup password"
            />
            <Button className="w-full" onClick={handleRestore} disabled={!restoreFileText || !verifyPassword || busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              Decrypt & Restore Vault
            </Button>
          </div>
        )}

        {step === "restoring" && (
          <div className="py-8 flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Restoring your vault…</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SeedBackupModal;
