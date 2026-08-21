"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  hasAnalyticsDecision,
  hasValidLgpdConsent,
  setAnalyticsConsent,
} from "@/lib/lgpd";

const HIDDEN_PATHS = new Set(["/privacidade", "/termos"]);

export function AnalyticsConsentBanner() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (HIDDEN_PATHS.has(pathname)) {
      setOpen(false);
      return;
    }

    if (!hasValidLgpdConsent() || hasAnalyticsDecision()) {
      setOpen(false);
      return;
    }

    setOpen(true);
  }, [pathname]);

  if (!open) {
    return null;
  }

  function handleChoice(granted: boolean) {
    setAnalyticsConsent(granted);
    setOpen(false);
  }

  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-40 p-3 sm:p-5">
      <div
        role="dialog"
        aria-labelledby="analytics-consent-title"
        aria-describedby="analytics-consent-description"
        className="mx-auto w-full max-w-lg rounded-2xl border border-console-edge bg-console p-2.5 shadow-[0_-8px_32px_oklch(0.22_0.008_155/0.35)]"
      >
        <div className="rounded-xl bg-screen px-5 py-4">
          <h2
            id="analytics-consent-title"
            className="text-lg font-black tracking-tight text-ink"
          >
            Estatísticas de uso
          </h2>
          <p
            id="analytics-consent-description"
            className="mt-2 text-sm leading-6 text-muted"
          >
            Podemos usar o Google Analytics para saber quais páginas as pessoas
            abrem? Sem a sua lista de votos e sem anúncios. Detalhes na{" "}
            <Link href="/privacidade" className="font-bold text-ink underline">
              Política de Privacidade
            </Link>
            .
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleChoice(false)}
              className="flex h-12 items-center justify-center rounded-xl border-2 border-ink/15 bg-white px-3 text-sm font-bold text-ink transition-colors duration-150 hover:border-ink/40"
            >
              Não, obrigado
            </button>
            <button
              type="button"
              onClick={() => handleChoice(true)}
              className="flex h-12 items-center justify-center rounded-xl bg-accent px-3 text-sm font-bold text-white transition-colors duration-150 hover:bg-accent-deep"
            >
              Pode medir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
