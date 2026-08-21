export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "G-MQD59KEVFS";

export const ANALYTICS_CONSENT_EVENT = "colinha-analytics-consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function isAnalyticsRuntimeEnabled() {
  return process.env.NODE_ENV === "production" && Boolean(GA_MEASUREMENT_ID);
}

export function notifyAnalyticsConsentChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(ANALYTICS_CONSENT_EVENT));
}

export function disableGoogleAnalytics() {
  if (typeof window === "undefined") {
    return;
  }

  window.gtag?.("consent", "update", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });

  clearGaCookies();
}

export function clearGaCookies() {
  if (typeof document === "undefined") {
    return;
  }

  const names = document.cookie
    .split(";")
    .map((part) => part.trim().split("=")[0])
    .filter((name) => name === "_ga" || name === "_gid" || name.startsWith("_ga_"));

  for (const name of names) {
    deleteCookie(name);
  }
}

function deleteCookie(name: string) {
  const hostname = window.location.hostname;
  const expires = "Thu, 01 Jan 1970 00:00:00 GMT";

  document.cookie = `${name}=; expires=${expires}; path=/`;
  document.cookie = `${name}=; expires=${expires}; path=/; domain=${hostname}`;

  if (hostname.includes(".")) {
    document.cookie = `${name}=; expires=${expires}; path=/; domain=.${hostname}`;
  }
}
