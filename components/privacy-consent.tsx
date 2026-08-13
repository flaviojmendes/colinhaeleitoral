"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  deferLgpdConsent,
  grantLgpdConsent,
  hasDeferredLgpdConsent,
  hasStoredColinha,
  hasValidLgpdConsent,
} from "@/lib/lgpd";
import { useCandidatosStore } from "@/store/candidatos-store";

const HIDDEN_PATHS = new Set(["/privacidade", "/termos"]);

export function PrivacyConsent() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hasSavedList, setHasSavedList] = useState(false);

  useEffect(() => {
    if (HIDDEN_PATHS.has(pathname)) {
      setOpen(false);
      return;
    }

    if (hasValidLgpdConsent() || hasDeferredLgpdConsent()) {
      setOpen(false);
      return;
    }

    setHasSavedList(hasStoredColinha());
    setOpen(true);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  function handleAccept() {
    grantLgpdConsent();
    void useCandidatosStore.persist.rehydrate();
    setOpen(false);
  }

  function handleDefer() {
    deferLgpdConsent();
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-console-deep/80 p-0 sm:items-center sm:p-5">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lgpd-consent-title"
        aria-describedby="lgpd-consent-description"
        className="w-full max-w-lg rounded-t-2xl border border-console-edge bg-console p-2.5 sm:rounded-2xl"
      >
        <div className="rounded-xl bg-screen px-5 py-5">
          <h2
            id="lgpd-consent-title"
            className="text-xl font-black tracking-tight text-ink"
          >
            Sua lista fica neste celular
          </h2>
          <div
            id="lgpd-consent-description"
            className="mt-3 space-y-3 text-base leading-6 text-muted"
          >
            {hasSavedList ? (
              <p>
                Encontramos uma lista já salva neste aparelho. Para continuar
                usando, precisamos do seu ok.
              </p>
            ) : (
              <p>
                Se você montar uma lista de votos, ela fica só neste celular.
                Não criamos conta e não enviamos seus votos para a internet.
              </p>
            )}
            <p>
              Os dados dos candidatos vêm de fontes públicas. Compartilhar
              envia só o link daquele candidato, não a sua lista inteira.
            </p>
          </div>

          <div className="mt-6 grid gap-2">
            <button
              type="button"
              onClick={handleAccept}
              className="flex h-14 items-center justify-center rounded-xl bg-accent px-5 text-base font-bold text-white transition-colors duration-150 hover:bg-accent-deep"
            >
              Pode guardar neste celular
            </button>
            <button
              type="button"
              onClick={handleDefer}
              className="flex h-14 items-center justify-center rounded-xl border-2 border-ink/15 bg-white px-5 text-base font-bold text-ink transition-colors duration-150 hover:border-ink/40"
            >
              Agora não
            </button>
          </div>

          <p className="mt-4 text-center text-sm leading-6 text-muted">
            Ao continuar, você concorda com a{" "}
            <Link href="/privacidade" className="font-bold text-ink underline">
              Política de Privacidade
            </Link>{" "}
            e os{" "}
            <Link href="/termos" className="font-bold text-ink underline">
              Termos de uso
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
