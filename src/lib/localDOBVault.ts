// Local DOB Vault — device-only storage of the user's date of birth.
// Per Zero-PII rule, DOB never touches Supabase. Kept on-device so the native
// Swift failsafe can re-validate age at every health sync.
const KEY = "idia_dob_v1";

export const localDOBVault = {
  save(iso: string) {
    try { localStorage.setItem(KEY, iso); } catch (e) { console.warn("[DOB_VAULT] save failed", e); }
  },
  read(): string | null {
    try { return localStorage.getItem(KEY); } catch { return null; }
  },
  clear() {
    try { localStorage.removeItem(KEY); } catch {}
  },
};
