"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  ANALYTICS_CONSENT_EVENT,
  GA_MEASUREMENT_ID,
  disableGoogleAnalytics,
  isAnalyticsRuntimeEnabled,
} from "@/lib/analytics";
import { hasAnalyticsConsent } from "@/lib/lgpd";

export function GoogleAnalytics() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    function syncConsent() {
      const allowed = isAnalyticsRuntimeEnabled() && hasAnalyticsConsent();
      setEnabled((wasEnabled) => {
        if (wasEnabled && !allowed) {
          disableGoogleAnalytics();
          setScriptReady(false);
        }
        return allowed;
      });
    }

    syncConsent();
    window.addEventListener(ANALYTICS_CONSENT_EVENT, syncConsent);
    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_EVENT, syncConsent);
    };
  }, []);

  useEffect(() => {
    if (!enabled || !scriptReady || typeof window.gtag !== "function") {
      return;
    }

    window.gtag("event", "page_view", {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [enabled, scriptReady, pathname]);

  if (!enabled) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script
        id="ga-gtag-init"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      >
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            analytics_storage: 'granted',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied'
          });
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            send_page_view: false,
            anonymize_ip: true,
            allow_google_signals: false,
            allow_ad_personalization_signals: false
          });
        `}
      </Script>
    </>
  );
}
