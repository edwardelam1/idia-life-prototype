import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseSourceWakeRefreshOptions {
  onRefreshComplete?: () => void;
  // TEMP: testing throttle removed — restore to 5 minutes (5 * 60 * 1000) after device testing.
  cooldownMs?: number;
}

/**
 * Refreshes every connected data source when the app wakes.
 *
 * Entry points: component mount, web visibilitychange, the iOS shell's
 * `app:foreground` event, and the Android Capacitor `appStateChange` listener.
 * A per-user 5-minute cooldown in localStorage prevents hammering the
 * providers when the app is switched in and out quickly.
 */
export function useSourceWakeRefresh({
  onRefreshComplete,
  // TEMP: testing throttle removed — 10 seconds instead of 5 minutes.
  cooldownMs = 10 * 1000,
}: UseSourceWakeRefreshOptions = {}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isExecutingRef = useRef(false);

  // Keep the latest callback without re-arming the listeners on every render.
  const onCompleteRef = useRef(onRefreshComplete);
  useEffect(() => { onCompleteRef.current = onRefreshComplete; }, [onRefreshComplete]);

  const executeRefresh = useCallback(async (triggerReason: string, force: boolean = false) => {
    console.log(`[WAKE_REFRESH_LOG][START] Refresh evaluation triggered by: ${triggerReason}. Force: ${force}`);

    if (isExecutingRef.current) {
      console.warn('[WAKE_REFRESH_LOG][SKIP] Refresh already in progress. Terminating request.');
      return;
    }

    try {
      console.log('[WAKE_REFRESH_LOG][TRACE] Validating user authentication session...');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error(`[WAKE_REFRESH_LOG][ERROR] Session retrieval error: ${sessionError.message}`);
        return;
      }

      const session = sessionData?.session;
      if (!session?.user?.id) {
        console.warn('[WAKE_REFRESH_LOG][SKIP] No active user session detected. Aborting refresh.');
        return;
      }

      const userId = session.user.id;
      const storageKey = `idia_last_source_refresh_${userId}`;
      const now = Date.now();
      const lastRefreshStr = localStorage.getItem(storageKey);
      const lastRefresh = lastRefreshStr ? parseInt(lastRefreshStr, 10) : 0;

      if (!force && now - lastRefresh < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - (now - lastRefresh)) / 1000);
        console.log(`[WAKE_REFRESH_LOG][SKIP] Cooldown active. Next refresh allowed in ${remainingSeconds}s.`);
        return;
      }

      isExecutingRef.current = true;
      setIsRefreshing(true);
      console.log('[WAKE_REFRESH_LOG][TRACE] Cooldown passed. Invoking data-source-refresh function...');

      const { data, error } = await supabase.functions.invoke('data-source-refresh', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        // Always pull fresh data regardless of the 6-hour server freshness window
        body: { respect_freshness: false },
      });

      if (error) {
        console.error(`[WAKE_REFRESH_LOG][ERROR] Function invocation failed: ${error.message}`);
      } else {
        console.log('[WAKE_REFRESH_LOG][TRACE] Edge Function executed successfully. Payload:', data);
        localStorage.setItem(storageKey, now.toString());
      }

      if (onCompleteRef.current) {
        console.log('[WAKE_REFRESH_LOG][TRACE] Executing onRefreshComplete callback...');
        onCompleteRef.current();
      }
    } catch (err: any) {
      console.error(`[WAKE_REFRESH_LOG][FATAL] Unexpected error in executeRefresh: ${err?.message || err}`);
    } finally {
      isExecutingRef.current = false;
      setIsRefreshing(false);
      console.log('[WAKE_REFRESH_LOG][END] Refresh execution finished.');
    }
  }, [cooldownMs]);

  useEffect(() => {
    console.log('[WAKE_REFRESH_LOG][MOUNT] Initializing wake refresh observers.');

    // 1. Initial mount execution
    executeRefresh('ComponentMount', false);

    // 2. Web standard Visibility API
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        executeRefresh('DOM.visibilitychange', false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 3. iOS custom event (dispatched from the native shell)
    const handleIosForeground = (event: Event) => {
      console.log('[WAKE_REFRESH_LOG][TRACE] Intercepted app:foreground from iOS shell.', (event as CustomEvent).detail);
      executeRefresh('iOS.NativeBridge', false);
    };
    window.addEventListener('app:foreground', handleIosForeground);

    // 4. Android Capacitor App plugin (dynamically loaded if present)
    let capacitorListenerHandle: any = null;
    const setupCapacitor = async () => {
      if ((window as any).Capacitor?.isPluginAvailable?.('App')) {
        try {
          console.log('[WAKE_REFRESH_LOG][TRACE] Attaching Android Capacitor App State listener.');
          const { App } = await import('@capacitor/app');
          capacitorListenerHandle = await App.addListener('appStateChange', (state) => {
            if (state.isActive) {
              executeRefresh('Android.Capacitor.AppStateChange', false);
            }
          });
        } catch (capError) {
          console.error('[WAKE_REFRESH_LOG][WARN] Failed to attach Capacitor listener:', capError);
        }
      }
    };
    setupCapacitor();

    return () => {
      console.log('[WAKE_REFRESH_LOG][CLEANUP] Removing wake refresh observers.');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('app:foreground', handleIosForeground);
      if (capacitorListenerHandle && typeof capacitorListenerHandle.remove === 'function') {
        capacitorListenerHandle.remove();
      }
    };
  }, [executeRefresh]);

  const triggerManualRefresh = useCallback(() => {
    console.log('[WAKE_REFRESH_LOG][ACTION] Manual force refresh requested by user.');
    return executeRefresh('ManualTrigger', true);
  }, [executeRefresh]);

  return { isRefreshing, triggerManualRefresh };
}
