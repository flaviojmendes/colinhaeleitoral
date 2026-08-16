"use client";

import { ArrowLeft, Printer, Smartphone } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { CARGOS_2026 } from "@/lib/cargos";
import { useCandidatosStore } from "@/store/candidatos-store";

import { ShareColinhaButton } from "./share-colinha-button";

export function PrintSheet() {
  const uf = useCandidatosStore((state) => state.uf);
  const slots = useCandidatosStore((state) => state.slots);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persist = useCandidatosStore.persist;
    if (!persist) {
      return;
    }

    if (persist.hasHydrated()) {
      const timer = window.setTimeout(() => setHydrated(true), 0);
      return () => window.clearTimeout(timer);
    }

    const unsubscribe = persist.onFinishHydration(() => {
      setHydrated(true);
    });
    void persist.rehydrate();

    return unsubscribe;
  }, []);

  const confirmed = useMemo(
    () =>
      CARGOS_2026.map((cargo) => ({
        cargo,
        candidato: slots[cargo.slug],
      })).filter(
        (
          item,
        ): item is typeof item & {
          candidato: NonNullable<(typeof item)["candidato"]>;
        } => Boolean(item.candidato),
      ),
    [slots],
  );

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-console-deep px-5">
        <p className="text-base font-semibold text-console-muted">
          Preparando sua lista…
        </p>
      </main>
    );
  }

  return (
    <main className="print-sheet min-h-screen bg-console-deep print:bg-white print:text-black">
      <div className="no-print mx-auto max-w-2xl px-5 py-4 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex h-12 items-center gap-2 rounded-xl px-3 text-base font-bold text-console-muted transition-colors duration-150 hover:text-console-ink"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Voltar
          </Link>
          {confirmed.length > 0 ? (
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-base font-bold text-ink transition-colors duration-150 hover:bg-screen"
            >
              <Printer size={18} aria-hidden="true" />
              Imprimir
            </button>
          ) : null}
        </div>

        {confirmed.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-console-edge bg-console px-4 py-4 text-console-ink">
            <p className="flex items-start gap-3 text-base leading-6">
              <Smartphone
                className="mt-0.5 shrink-0 text-coral"
                size={20}
                aria-hidden="true"
              />
              <span>
                Envie a foto no WhatsApp, Instagram ou TikTok, ou toque em
                Imprimir. Celular não entra na cabine: no dia, leve papel.
              </span>
            </p>
          </div>
        ) : null}
      </div>

      <div className="mx-auto mb-10 max-w-2xl rounded-2xl bg-white px-6 pb-10 pt-8 text-ink sm:px-10 print:mb-0 print:max-w-none print:rounded-none print:px-0 print:pb-0 print:pt-0">
        {confirmed.length > 0 ? (
          <>
            <header className="border-b-2 border-ink pb-5 print:border-black">
              <p className="text-sm font-semibold">Eleições Gerais · 2026</p>
              <h1 className="mt-2 text-4xl font-black tracking-tight print:text-4xl">
                Minha lista de votos
              </h1>
              <p className="mt-3 text-base font-semibold">
                {uf} · 4 de outubro de 2026
              </p>
            </header>

            <section className="mt-7">
              <div className="mb-3 flex items-center justify-between text-sm font-semibold">
                <span>Cargo e nome</span>
                <span>Número</span>
              </div>
              <div className="divide-y-2 divide-ink border-y-2 border-ink print:divide-black print:border-black">
                {confirmed.map(({ cargo, candidato }) => {
                  const isLegenda = candidato.tipoVoto === "legenda";
                  const cargoLabel =
                    cargo.slug === "deputado-estadual" && uf === "DF"
                      ? "Deputado Distrital"
                      : cargo.label;

                  return (
                    <div
                      key={cargo.slug}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-5 py-5 print:py-4"
                    >
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wide">
                          {isLegenda
                            ? `${cargoLabel} · voto de legenda`
                            : cargoLabel}
                        </p>
                        <p className="mt-1 truncate text-xl font-bold sm:text-2xl print:text-xl">
                          {isLegenda ? candidato.partido : candidato.nomeUrna}
                        </p>
                        {isLegenda &&
                        candidato.nomeUrna !== candidato.partido ? (
                          <p className="truncate text-base">
                            {candidato.nomeUrna}
                          </p>
                        ) : null}
                      </div>
                      <p className="text-right font-mono text-4xl font-black tracking-[0.08em] sm:text-5xl print:text-4xl">
                        {candidato.numero}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            <footer className="mt-7 text-sm font-semibold text-muted print:text-black">
              Leve este papel. Celular não é permitido na cabine.
            </footer>

            <div className="no-print mt-8 grid gap-2">
              <ShareColinhaButton uf={uf} slots={slots} />
              <button
                type="button"
                onClick={() => window.print()}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-ink/15 bg-white text-base font-bold text-ink transition-colors duration-150 hover:border-ink/40"
              >
                <Printer size={18} aria-hidden="true" />
                Imprimir minha lista
              </button>
            </div>
          </>
        ) : (
          <div className="py-8 text-center">
            <h1 className="text-3xl font-black tracking-tight">
              Sua lista ainda está vazia
            </h1>
            <p className="mx-auto mt-4 max-w-sm text-base leading-7 text-muted">
              Volte para a tela principal, escolha alguns candidatos e salve
              antes de imprimir.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex h-14 items-center rounded-xl bg-accent px-6 text-base font-bold text-white transition-colors duration-150 hover:bg-accent-deep"
            >
              Escolher candidatos
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
