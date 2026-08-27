# Encrypted Passphrase Backup (Wallet → Security)

Give users a real way to back up their recovery phrase, encrypted with a password they choose, and record completion in the profile flag `is_seed_backed_up` that already exists but is never set.

## What the user gets

In the wallet page's **Security** tab, under Wallet Management, a new **Back Up Recovery Phrase** action opens a guided sheet:

1. Biometric/enclave gate (same gate already used to reveal the phrase).
2. Choose a backup password (min 10 chars, typed twice, strength meter, explicit warning that IDIA cannot recover it).
3. The phrase is encrypted in-browser and saved as `idia-vault-backup-<date>.idiabk` — via the native download bridge on iOS/Android, browser download on web.
4. Confirmation step: user re-enters the password once against the produced file to prove it opens, then the profile is marked backed up.

The card shows a status line: "Backed up" (with date) or "Not backed up" with an amber prompt. A **Restore from Backup File** action is added next to Import Different Wallet: pick the `.idiabk` file, enter the password, decrypt, and hand the mnemonic to the existing import flow.

## Technical details

- New `src/lib/seedBackup.ts`: WebCrypto only, no new deps.
  - Key derivation: PBKDF2-SHA256, 310,000 iterations, 16-byte random salt.
  - Encryption: AES-GCM 256, 12-byte random IV.
  - File format: JSON envelope `{ v: 1, kdf: "PBKDF2-SHA256", iter, salt, iv, ct, address, createdAt }`, all binary base64. No plaintext phrase, no password, nothing recoverable without the password.
  - `encryptSeed(mnemonic, password, address)` / `decryptBackup(fileText, password)` (wrong password surfaces as a clean "Incorrect password" error, not a crypto exception).
- New `src/components/wallet/SeedBackupModal.tsx`: the multi-step sheet above, styled with existing Card/Button/Input tokens (no hardcoded colors).
- `src/components/enhanced/EnhancedWalletDashboard.tsx`: add the two buttons plus status line in the Wallet Management card of the `security` tab.
- Download path reuses `src/utils/nativeDownload.ts` (native handler first, Blob fallback).
- Phrase access reuses `useWallet().getSeedPhrase()`; the plaintext mnemonic stays in memory only for the duration of the encrypt call and is cleared from state on close.
- Profile flag: on successful verify step, update `profiles.is_seed_backed_up = true` for `auth.uid()` (existing column, existing RLS — no migration). `useEnhancedProfile` already exposes the field, so the "Seed Backup: Completed" line in profile settings starts reflecting reality.
- Nothing about the backup is uploaded: only the boolean flag touches the database, never the phrase or the ciphertext.
