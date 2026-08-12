"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { CARGOS_2026 } from "@/lib/cargos";
import { useCandidatosStore } from "@/store/candidatos-store";

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

  useEffect(() => {
    if (!hydrated || confirmed.length === 0) {
      return;
    }

    const printTimer = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(printTimer);
  }, [confirmed.length, hydrated]);

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-console-deep px-5">
        <p className="text-sm font-semibold text-console-muted">
          Preparando sua colinha…
        </p>
      </main>
    );
  }

  return (
    <main className="print-sheet min-h-screen bg-console-deep print:bg-white print:text-black">
      <div className="no-print mx-auto flex max-w-2xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="inline-flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-console-muted transition-colors duration-150 hover:text-console-ink"
        >
          <ArrowLeft size={17} aria-hidden="true" />
          Voltar e editar
        </Link>
        {confirmed.length > 0 ? (
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-ink transition-colors duration-150 hover:bg-screen"
          >
            <Printer size={16} aria-hidden="true" />
            Imprimir novamente
          </button>
        ) : null}
      </div>

      <div className="mx-auto mb-10 max-w-2xl rounded-2xl bg-white px-6 pb-10 pt-8 text-ink sm:px-10 print:mb-0 print:max-w-none print:rounded-none print:px-0 print:pb-0 print:pt-0">
        {confirmed.length > 0 ? (
          <>
            <header className="border-b-2 border-ink pb-5 print:border-black">
              <p className="font-mono text-[10px] tracking-widest">
                ELEIÇÕES GERAIS · 2026
              </p>
              <h1 className="mt-2 text-4xl font-black tracking-tight print:text-4xl">
                Minha colinha de votação
              </h1>
              <p className="mt-3 text-sm font-semibold">
                {uf} · 4 de outubro de 2026
              </p>
            </header>

            <section className="mt-7">
              <div className="mb-3 flex items-center justify-between font-mono text-[10px] tracking-widest">
                <span>CARGO E NOME</span>
                <span>NÚMERO</span>
              </div>
              <div className="divide-y-2 divide-ink border-y-2 border-ink print:divide-black print:border-black">
                {confirmed.map(({ cargo, candidato }) => {
                  const isLegenda = candidato.tipoVoto === "legenda";
                  const cargoLabel = (
                    cargo.slug === "deputado-estadual" && uf === "DF"
                      ? "Deputado Distrital"
                      : cargo.label
                  ).toLocaleUpperCase("pt-BR");

                  return (
                  <div
                    key={cargo.slug}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-5 py-5 print:py-4"
                  >
                    <div>
                      <p className="font-mono text-[10px] tracking-widest">
                        {isLegenda
                          ? `${cargoLabel} · VOTO DE LEGENDA`
                          : cargoLabel}
                      </p>
                      <p className="mt-1 truncate text-lg font-bold sm:text-xl print:text-lg">
                        {isLegenda ? candidato.partido : candidato.nomeUrna}
                      </p>
                      {isLegenda && candidato.nomeUrna !== candidato.partido ? (
                        <p className="truncate text-sm">
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

            <footer className="mt-7 font-mono text-[10px] tracking-widest text-muted print:text-black">
              LEVE ESTE PAPEL · CELULAR NÃO É PERMITIDO NA CABINE
            </footer>
          </>
        ) : (
          <div className="py-8 text-center">
            <h1 className="text-2xl font-black tracking-tight">
              Sua colinha ainda está vazia
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted">
              Volte para a tela principal, pesquise alguns candidatos e
              confirme suas escolhas antes de imprimir.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex h-12 items-center rounded-lg bg-accent px-5 text-sm font-bold text-white transition-colors duration-150 hover:bg-accent-deep"
            >
              Escolher candidatos
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
