/**
 * Google Analytics (GA4) — gtag.js bootstrap for the SPA.
 * Measurement ID comes from the Lovable Google Analytics connector.
 */

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

const measurementId = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY as string | undefined;

let initialized = false;

export function gtag(...args: unknown[]) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
}

export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;
  if (!measurementId) {
    console.warn("[analytics] Google Analytics measurement ID not configured — skipping init.");
    return;
  }
  initialized = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  gtag("js", new Date());
  gtag("config", measurementId, { send_page_view: true });
}

export function trackPageView(path: string) {
  if (!initialized) return;
  gtag("event", "page_view", { page_path: path, page_location: window.location.href });
}

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (!initialized) return;
  gtag("event", name, params);
}
