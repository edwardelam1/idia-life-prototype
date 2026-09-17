import { useEffect, useState } from 'react';

/**
 * Listens for the custom `health:sync-*` events emitted by the native Swift
 * shell's background HealthKit process and exposes the live bridge state so
 * the Data screen's Apple Health row can react to it.
 */
export function useAppleHealthBridge() {
  const [healthStatus, setHealthStatus] = useState('Idle');

  useEffect(() => {
    console.log("[HEALTH_BRIDGE_LOG][MOUNT] Listening for native Swift events.");

    const handleStart = () => {
      console.log("[HEALTH_BRIDGE_LOG][EVENT] Caught health:sync-start");
      setHealthStatus('Refreshing...');
    };

    const handleComplete = (event: any) => {
      console.log("[HEALTH_BRIDGE_LOG][EVENT] Caught health:sync-complete", event.detail);
      setHealthStatus(event.detail?.status === 'throttled' ? 'Idle (Throttled)' : 'Up to Date');
    };

    const handleError = (event: any) => {
      console.error("[HEALTH_BRIDGE_LOG][EVENT] Caught health:sync-error", event.detail);
      setHealthStatus('Error');
    };

    window.addEventListener('health:sync-start', handleStart);
    window.addEventListener('health:sync-complete', handleComplete);
    window.addEventListener('health:sync-error', handleError);

    return () => {
      window.removeEventListener('health:sync-start', handleStart);
      window.removeEventListener('health:sync-complete', handleComplete);
      window.removeEventListener('health:sync-error', handleError);
    };
  }, []);

  return { healthStatus };
}
