import { COLINHA_STORAGE_KEY } from "@/lib/legal";

export const LGPD_CONSENT_KEY = "colinha-lgpd-consent";
export const LGPD_CONSENT_VERSION = 1;
export const LGPD_DEFER_KEY = "colinha-lgpd-consent-later";

export interface LgpdConsent {
  version: number;
  acceptedAt: string;
}

function canUseStorage() {
  return typeof window !== "undefined";
}

export function readLgpdConsent(): LgpdConsent | null {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(LGPD_CONSENT_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<LgpdConsent>;
    if (
      parsed.version !== LGPD_CONSENT_VERSION ||
      typeof parsed.acceptedAt !== "string"
    ) {
      return null;
    }

    return {
      version: parsed.version,
      acceptedAt: parsed.acceptedAt,
    };
  } catch {
    return null;
  }
}

export function hasValidLgpdConsent() {
  return readLgpdConsent() !== null;
}

export function grantLgpdConsent() {
  if (!canUseStorage()) {
    return;
  }

  const consent: LgpdConsent = {
    version: LGPD_CONSENT_VERSION,
    acceptedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(LGPD_CONSENT_KEY, JSON.stringify(consent));
  window.sessionStorage.removeItem(LGPD_DEFER_KEY);
}

export function revokeLgpdConsent() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(LGPD_CONSENT_KEY);
  window.localStorage.removeItem(COLINHA_STORAGE_KEY);
  window.sessionStorage.removeItem(LGPD_DEFER_KEY);
}

export function deferLgpdConsent() {
  if (!canUseStorage()) {
    return;
  }

  window.sessionStorage.setItem(LGPD_DEFER_KEY, "1");
}

export function hasDeferredLgpdConsent() {
  if (!canUseStorage()) {
    return false;
  }

  return window.sessionStorage.getItem(LGPD_DEFER_KEY) === "1";
}

export function hasStoredColinha() {
  if (!canUseStorage()) {
    return false;
  }

  return window.localStorage.getItem(COLINHA_STORAGE_KEY) !== null;
}
