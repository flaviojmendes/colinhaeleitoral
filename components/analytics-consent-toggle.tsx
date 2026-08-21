"use client";

import { useEffect, useState } from "react";

import {
  hasAnalyticsConsent,
  hasAnalyticsDecision,
  setAnalyticsConsent,
} from "@/lib/lgpd";

export function AnalyticsConsentToggle() {
  const [granted, setGranted] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setGranted(hasAnalyticsConsent());
    setReady(true);
  }, []);

  if (!ready) {
    return null;
  }

  const decided = hasAnalyticsDecision();

  function handleToggle(next: boolean) {
    setAnalyticsConsent(next);
    setGranted(next);
  }

  return (
    <div className="mt-4 rounded-xl border border-line bg-white px-4 py-4">
      <p className="font-bold text-ink">Google Analytics</p>
      <p className="mt-1 text-sm leading-6 text-muted">
        {granted
          ? "As estatísticas de uso estão ativas neste aparelho. Você pode desligar a qualquer momento."
          : decided
            ? "As estatísticas de uso estão desligadas. Nenhum cookie do Google Analytics é gravado."
            : "Ainda não houve uma escolha neste aparelho. O padrão é não medir."}
      </p>
      <button
        type="button"
        onClick={() => handleToggle(!granted)}
        className={`mt-3 flex h-12 w-full items-center justify-center rounded-xl px-5 text-sm font-bold transition-colors duration-150 sm:w-auto ${
          granted
            ? "border-2 border-ink/15 bg-white text-ink hover:border-ink/40"
            : "bg-accent text-white hover:bg-accent-deep"
        }`}
      >
        {granted ? "Desligar estatísticas" : "Ligar estatísticas"}
      </button>
    </div>
  );
}
