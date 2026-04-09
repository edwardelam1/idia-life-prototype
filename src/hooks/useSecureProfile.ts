import { useState, useEffect, useCallback } from 'react';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

export interface SecurePII {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

/**
 * Hook to read/write PII from the device Secure Enclave.
 * This data is NEVER stored in or sent to the backend.
 */
export const useSecureProfile = () => {
  const [pii, setPii] = useState<SecurePII | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { value } = await SecureStoragePlugin.get({ key: 'user_pii_profile' });
      if (value) {
        const parsed = JSON.parse(value) as SecurePII;
        setPii(parsed);
      }
    } catch {
      // Key doesn't exist yet — first run
      setPii(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (data: SecurePII) => {
    setSaving(true);
    try {
      await SecureStoragePlugin.set({
        key: 'user_pii_profile',
        value: JSON.stringify(data),
      });
      setPii(data);
    } finally {
      setSaving(false);
    }
  }, []);

  return { pii, loading, saving, save, reload: load };
};
