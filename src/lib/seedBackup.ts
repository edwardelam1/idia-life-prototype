/**
 * Encrypted recovery-phrase backup.
 *
 * WebCrypto only — no dependencies, nothing leaves the device.
 * PBKDF2-SHA256 (310k iterations) → AES-GCM-256.
 *
 * File envelope (JSON, base64 binary fields):
 *   { v, kdf, iter, salt, iv, ct, address, createdAt }
 *
 * The plaintext mnemonic and the password are never persisted, logged,
 * or transmitted. Only a boolean "backed up" flag ever touches the DB.
 */

const KDF = "PBKDF2-SHA256";
const ITERATIONS = 310_000;

export interface SeedBackupEnvelope {
  v: 1;
  kdf: typeof KDF;
  iter: number;
  salt: string;
  iv: string;
  ct: string;
  address: string | null;
  createdAt: string;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Encrypt a mnemonic into a portable, password-protected envelope. */
export async function encryptSeed(
  mnemonic: string,
  password: string,
  address: string | null,
): Promise<SeedBackupEnvelope> {
  console.log("[SEED_BACKUP] START: Deriving key material for encryption.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ITERATIONS);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as unknown as BufferSource },
      key,
      enc.encode(mnemonic.trim()),
    ),
  );
  console.log("[SEED_BACKUP] SUCCESS: Recovery phrase sealed with AES-GCM-256.");
  return {
    v: 1,
    kdf: KDF,
    iter: ITERATIONS,
    salt: toB64(salt),
    iv: toB64(iv),
    ct: toB64(ct),
    address,
    createdAt: new Date().toISOString(),
  };
}

export function serializeBackup(envelope: SeedBackupEnvelope): string {
  return JSON.stringify(envelope, null, 2);
}

/** Decrypt a backup file. Throws a clean, user-readable Error on failure. */
export async function decryptBackup(fileText: string, password: string): Promise<string> {
  let envelope: SeedBackupEnvelope;
  try {
    envelope = JSON.parse(fileText);
  } catch {
    throw new Error("This file isn't a valid IDIA backup.");
  }

  if (!envelope || envelope.v !== 1 || !envelope.ct || !envelope.iv || !envelope.salt) {
    throw new Error("This file isn't a valid IDIA backup.");
  }

  try {
    const key = await deriveKey(password, fromB64(envelope.salt), envelope.iter || ITERATIONS);
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(envelope.iv) as unknown as BufferSource },
      key,
      fromB64(envelope.ct) as unknown as BufferSource,
    );
    const mnemonic = dec.decode(pt).trim();
    if (!mnemonic) throw new Error("empty");
    return mnemonic;
  } catch {
    throw new Error("Incorrect password.");
  }
}

/** Rough password strength score 0–4 with a label. */
export function scorePassword(password: string): { score: number; label: string } {
  let score = 0;
  if (password.length >= 10) score++;
  if (password.length >= 16) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  const labels = ["Too weak", "Weak", "Fair", "Strong", "Very strong"];
  return { score, label: labels[score] };
}

export const MIN_PASSWORD_LENGTH = 10;

export function backupFilename(): string {
  const d = new Date().toISOString().slice(0, 10);
  return `idia-vault-backup-${d}.idiabk`;
}
