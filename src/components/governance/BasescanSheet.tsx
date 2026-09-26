/**
 * Safely navigates to an external BaseScan link across async execution boundaries.
 * Implements Synchronous Pre-allocation to bypass WKWebView popup blockers on iOS.
 */
export const openBasescan = (addressOrTx: string, type: "address" | "tx" = "address"): void => {
  const baseUrl = "https://basescan.org";
  const targetUrl = `${baseUrl}/${type}/${encodeURIComponent(addressOrTx)}`;

  // Step 1: Open blank window synchronously within user-gesture stack
  let targetWindow: Window | null = null;
  try {
    targetWindow = window.open("about:blank", "_blank", "noopener,noreferrer");
  } catch (windowOpenError) {
    console.error("[openBasescan] ERROR: window.open threw synchronously", { error: windowOpenError });
    return;
  }

  // Step 2: Fallback to DOM injection if pop-up blocked
  if (!targetWindow) {
    console.warn("[openBasescan] WARN: Pop-up blocked by browser policy. Falling back to programmatic anchor.");
    try {
      const anchor = document.createElement("a");
      anchor.href = targetUrl;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch (domError) {
      console.error("[openBasescan] CRITICAL ERROR: Fallback anchor failed", { error: domError });
    }
    return;
  }

  // Step 3: Ensure opener reference is severed to comply with COOP / Cross-Origin constraints
  try {
    targetWindow.opener = null;
  } catch (openerError) {}

  // Step 4: Redirect the pre-opened window
  try {
    targetWindow.location.href = targetUrl;
  } catch (navigationError) {
    console.error("[openBasescan] ERROR: Failed setting location.href on target window", { error: navigationError });
    try {
      targetWindow.close();
    } catch (closeError) {}
  }
};
