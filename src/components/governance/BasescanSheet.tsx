/**
 * Safely navigates to an external BaseScan link across async execution boundaries.
 * Implements Synchronous Pre-allocation to bypass WKWebView popup blockers on iOS.
 */
export const openBasescan = (addressOrTx: string, type: "address" | "tx" = "address"): void => {
  const baseUrl = "https://basescan.org";
  const targetUrl = `${baseUrl}/${type}/${encodeURIComponent(addressOrTx)}`;

  console.log(`[BASESCAN_ROUTER][BEGIN] Initiating navigation to ${targetUrl}`);

  // Step 1: Open blank window synchronously within user-gesture stack
  let targetWindow: Window | null = null;
  try {
    console.log("[BASESCAN_ROUTER][ACTION] Requesting blank window handle synchronously");
    targetWindow = window.open("about:blank", "_blank", "noopener,noreferrer");
  } catch (windowOpenError) {
    console.error("[BASESCAN_ROUTER][ERROR] window.open threw synchronously", { error: windowOpenError });
    console.log("[BASESCAN_ROUTER][END] Silent stalling occurs: window handle request failed");
    return;
  }

  // Step 2: Fallback to DOM injection if pop-up blocked
  if (!targetWindow) {
    console.warn("[BASESCAN_ROUTER][WARN] Pop-up blocked by browser policy. Falling back to programmatic anchor.");
    try {
      console.log("[BASESCAN_ROUTER][ACTION] Injecting temporary DOM anchor");
      const anchor = document.createElement("a");
      anchor.href = targetUrl;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      console.log("[BASESCAN_ROUTER][END] Fallback anchor navigation completed");
    } catch (domError) {
      console.error("[BASESCAN_ROUTER][ERROR] Fallback anchor failed", { error: domError });
      console.log("[BASESCAN_ROUTER][END] Silent stalling occurs: fallback anchor failed");
    }
    return;
  }

  // Step 3: Ensure opener reference is severed to comply with COOP / Cross-Origin constraints
  try {
    console.log("[BASESCAN_ROUTER][ACTION] Severing opener reference for security");
    targetWindow.opener = null;
  } catch (openerError) {
    console.warn("[BASESCAN_ROUTER][WARN] Could not sever opener reference", { error: openerError });
  }

  // Step 4: Redirect the pre-opened window
  try {
    console.log(`[BASESCAN_ROUTER][ACTION] Setting target window location to ${targetUrl}`);
    targetWindow.location.href = targetUrl;
    console.log("[BASESCAN_ROUTER][END] Navigation completed successfully");
  } catch (navigationError) {
    console.error("[BASESCAN_ROUTER][ERROR] Failed setting location.href on target window", { error: navigationError });
    try {
      console.log("[BASESCAN_ROUTER][ACTION] Closing dead window handle");
      targetWindow.close();
    } catch (closeError) {
      console.error("[BASESCAN_ROUTER][ERROR] Failed to close target window", { error: closeError });
    }
    console.log("[BASESCAN_ROUTER][END] Silent stalling occurs: window location assignment failed");
  }
};
