import { IDIAHealth } from '@/plugins/health';
import { getCachedUser } from "@/lib/authUser";
import type { HealthDataResult } from '@/plugins/health';
import { supabase } from '@/integrations/supabase/client';
import { isNative, getPlatform } from './platform';

export interface HealthSyncResult { success: boolean; data?: HealthDataResult; error?: string; synced: boolean; }
export interface HealthServiceStatus { available: boolean; permissionsGranted: boolean; platform: string; apiName: string; }

class HealthService {
  async getStatus(): Promise<HealthServiceStatus> {
    try {
      const a = await IDIAHealth.checkAvailability();
      let g = false;
      if (a.available) { g = (await IDIAHealth.checkPermissions()).granted; }
      return { available: a.available, permissionsGranted: g, platform: a.platform, apiName: a.apiName };
    } catch { return { available: false, permissionsGranted: false, platform: getPlatform(), apiName: 'error' }; }
  }

  async requestPermissions(): Promise<boolean> {
    try { return (await IDIAHealth.requestPermissions()).granted; } catch { return false; }
  }

  async fetchAndSync(startDate?: Date | string, endDate?: Date | string, autoSync = true, acaHash?: string): Promise<HealthSyncResult> {
    const start = startDate instanceof Date ? startDate.toISOString() : startDate || new Date(Date.now() - 86400000).toISOString();
    const end = endDate instanceof Date ? endDate.toISOString() : endDate || new Date().toISOString();
    try {
      const d = await IDIAHealth.getHealthData({ startDate: start, endDate: end });
      if (d.source === 'web_manual') return { success: true, data: d, synced: false };
      if (autoSync) {
        const s = await this.syncToSupabase(d, acaHash);
        if (!s.ok) return { success: false, data: d, synced: false, error: s.error };
        return { success: true, data: d, synced: true };
      }
      return { success: true, data: d, synced: false };
    } catch (e: any) { return { success: false, error: e.message, synced: false }; }
  }

  async quickSync(acaHash?: string): Promise<HealthSyncResult> {
    const s = new Date(); s.setHours(0,0,0,0);
    return this.fetchAndSync(s, new Date(), true, acaHash);
  }

  async getRecentRecords(limit = 10): Promise<any[]> {
    try {
      const { data: { user } } = await getCachedUser();
      if (!user) return [];
      const { data, error } = await supabase.from('raw_health_data').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit);
      return error ? [] : data || [];
    } catch { return []; }
  }

  /**
   * Reuse the most recent stored consent artifact for this device source so that
   * background/auto syncs do not need a fresh biometric handshake every cycle.
   */
  async resolveStoredAcaHash(userId: string, sourceId: string): Promise<string | null> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('platform_guid')
        .eq('user_id', userId)
        .maybeSingle();
      const platformGuid = (profile as any)?.platform_guid;
      if (!platformGuid) return null;
      const { data } = await supabase
        .from('user_aca_records')
        .select('aca_hash_key')
        .eq('platform_guid', platformGuid)
        .eq('source_id', sourceId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as any)?.aca_hash_key ?? null;
    } catch { return null; }
  }

  /**
   * Canonical ingestion path for BOTH platforms: apple-health-sync.
   * The function's direct-bridge key mapping accepts these flat metric keys
   * regardless of whether the source was HealthKit or Health Connect.
   */
  private async syncToSupabase(healthData: HealthDataResult, acaHash?: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const { data: { user } } = await getCachedUser();
      if (!user) return { ok: false, error: 'Not signed in' };
      const sourceId = healthData.source === 'apple_health' ? 'apple_health' : 'health_connect';
      const hash = acaHash || (await this.resolveStoredAcaHash(user.id, sourceId));
      if (!hash) return { ok: false, error: 'Missing consent artifact (ACA). Re-run the privacy handshake.' };


      const metrics: Record<string, number> = {};
      const put = (k: string, v: any) => { if (typeof v === 'number' && !Number.isNaN(v)) metrics[k] = v; };
      put('steps', healthData.steps);
      put('heartRate', healthData.heartRate);
      put('hrv', (healthData as any).hrv);
      put('calories', healthData.calories);
      put('sleep', healthData.sleepHours);
      put('bloodOxygen', healthData.oxygenSaturation);
      put('respiratoryRate', healthData.respiratoryRate);
      put('bpSystolic', healthData.bloodPressureSystolic);
      put('bpDiastolic', healthData.bloodPressureDiastolic);
      put('bodyTemp', healthData.bodyTemperature);
      put('weight', healthData.weight);
      put('height', healthData.height);

      if (Object.keys(metrics).length === 0) {
        return { ok: false, error: 'No health records were readable for this period. Grant read access in Health Connect and try again.' };
      }

      const { data, error } = await supabase.functions.invoke('apple-health-sync', {
        body: {
          user_id: user.id,
          aca_hash_key: hash,
          source: healthData.source,
          device_type: healthData.device_type,
          recorded_at: healthData.recorded_at,
          healthData: metrics,
        },
      });
      if (error) { console.error('apple-health-sync error:', error); return { ok: false, error: error.message }; }
      if (data && data.success === false) return { ok: false, error: data.error || 'Ingestion rejected' };
      return { ok: true };
    } catch (e: any) { console.error('Sync failed:', e); return { ok: false, error: e.message }; }
  }
}


export const healthService = new HealthService();
