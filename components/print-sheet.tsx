"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { CARGOS_2026 } from "@/lib/cargos";
import { useCandidatosStore } from "@/store/candidatos-store";

export function PrintSheet() {
  const uf = useCandidatosStore((state) => state.uf);
  const slots = useCandidatosStore((state) => state.slots);
  const [hydrated, setHydrated] = useState(() =>
    useCandidatosStore.persist.hasHydrated(),
  );

  useEffect(() => {
    if (hydrated) {
      return;
    }

    const unsubscribe = useCandidatosStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    void useCandidatosStore.persist.rehydrate();

    return unsubscribe;
  }, [hydrated]);

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
      <main className="flex min-h-screen items-center justify-center bg-paper px-5">
        <p className="text-sm font-semibold text-muted">Preparando sua colinha…</p>
      </main>
    );
  }

  return (
    <main className="print-sheet min-h-screen bg-paper text-ink print:bg-white print:text-black">
      <div className="no-print mx-auto flex max-w-2xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold text-muted hover:bg-paper-deep hover:text-ink"
        >
          <ArrowLeft size={17} aria-hidden="true" />
          Voltar e editar
        </Link>
        {confirmed.length > 0 ? (
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-white hover:bg-accent-deep"
          >
            <Printer size={16} aria-hidden="true" />
            Imprimir novamente
          </button>
        ) : null}
      </div>

      <div className="mx-auto max-w-2xl px-5 pb-12 pt-6 sm:px-8 sm:pt-12 print:max-w-none print:px-0 print:pb-0 print:pt-0">
        {confirmed.length > 0 ? (
          <>
            <header className="border-b-2 border-ink pb-5 print:border-black">
              <p className="text-[10px] font-black uppercase tracking-[0.22em]">
                Eleições Gerais · 2026
              </p>
              <h1 className="display-serif mt-2 text-4xl font-bold tracking-[-0.05em] sm:text-5xl print:text-4xl">
                Minha colinha de votação
              </h1>
              <p className="mt-3 text-sm font-semibold">
                {uf} · 4 de outubro de 2026
              </p>
            </header>

            <section className="mt-7">
              <div className="mb-3 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em]">
                <span>Cargo</span>
                <span>Número · Nome</span>
              </div>
              <div className="divide-y-2 divide-ink border-y-2 border-ink print:divide-black print:border-black">
                {confirmed.map(({ cargo, candidato }) => (
                  <div
                    key={cargo.slug}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-5 py-5 print:py-4"
                  >
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.12em]">
                        {cargo.slug === "deputado-estadual" && uf === "DF"
                          ? "Deputado Distrital"
                          : cargo.label}
                      </p>
                      <p className="mt-1 truncate text-lg font-bold sm:text-xl print:text-lg">
                        {candidato.nomeUrna}
                      </p>
                    </div>
                    <p className="text-right font-mono text-4xl font-black tracking-[0.08em] sm:text-5xl print:text-4xl">
                      {candidato.numero}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <footer className="mt-7 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted print:text-black">
              Leve este papel. Celular não é permitido na cabine de votação.
            </footer>
          </>
        ) : (
          <div className="rounded-2xl border border-line bg-white/70 p-8 text-center">
            <h1 className="display-serif text-3xl font-bold">
              Sua colinha ainda está vazia
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted">
              Volte para a tela principal, pesquise alguns candidatos e
              confirme suas escolhas antes de imprimir.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex h-11 items-center rounded-xl bg-accent px-5 text-sm font-bold text-white"
            >
              Escolher candidatos
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
