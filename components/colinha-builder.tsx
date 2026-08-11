"use client";

import {
  ArrowRight,
  CircleHelp,
  FileDown,
  Info,
  Landmark,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Toaster, toast } from "sonner";
import { useRouter } from "next/navigation";

import { CARGOS_2026 } from "@/lib/cargos";
import type { CandidatoColinha } from "@/lib/types";
import { useCandidatosStore } from "@/store/candidatos-store";

import { CandidateCard } from "./candidate-card";
import { SlotInput } from "./slot-input";
import { UfSelect } from "./uf-select";

export function ColinhaBuilder() {
  const router = useRouter();
  const uf = useCandidatosStore((state) => state.uf);
  const slots = useCandidatosStore((state) => state.slots);
  const setUf = useCandidatosStore((state) => state.setUf);
  const setCandidate = useCandidatosStore((state) => state.setCandidate);
  const clearCandidate = useCandidatosStore((state) => state.clearCandidate);
  const resetColinha = useCandidatosStore((state) => state.resetColinha);
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

  const confirmedCount = useMemo(
    () => CARGOS_2026.filter((cargo) => Boolean(slots[cargo.slug])).length,
    [slots],
  );

  function handleUfChange(nextUf: string) {
    if (nextUf === uf) {
      return;
    }

    resetColinha();
    setUf(nextUf);
    toast.success("Estado atualizado. Sua colinha foi reiniciada.");
  }

  function handleConfirm(candidate: CandidatoColinha) {
    setCandidate(candidate.cargo, candidate);
    toast.success(`${candidate.nomeUrna} foi adicionado à sua colinha.`);
  }

  async function refreshCandidate(candidate: CandidatoColinha) {
    const query = new URLSearchParams({
      uf,
      cargo: candidate.cargo,
      numero: candidate.numero,
    });
    const response = await fetch(`/api/candidatos?${query}`);
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    } & Partial<CandidatoColinha>;

    if (!response.ok) {
      throw new Error(
        payload.error ?? "Não foi possível atualizar os detalhes.",
      );
    }

    setCandidate(candidate.cargo, payload as CandidatoColinha);
  }

  function handleReset() {
    resetColinha();
    toast.success("Colinha reiniciada.");
  }

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          classNames: {
            toast:
              "border-line! bg-white! text-ink! shadow-[0_12px_36px_rgba(24,36,31,0.14)]!",
            title: "text-sm! font-semibold!",
            description: "text-xs! text-muted!",
          },
        }}
      />

      <div className="min-h-screen bg-paper">
        <header className="no-print border-b border-line/80 bg-paper/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-5 py-4 sm:px-8">
            <Link href="/" className="flex items-center gap-3" aria-label="Início">
              <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-accent text-sm font-black tracking-[-0.08em] text-white">
                CE
              </span>
              <span className="hidden sm:block">
                <span className="block text-sm font-extrabold tracking-[-0.03em] text-ink">
                  Colinha Eleitoral
                </span>
                <span className="block text-[10px] font-bold uppercase tracking-[0.17em] text-muted">
                  Eleições 2026
                </span>
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 text-xs font-semibold text-muted sm:flex">
                <CircleHelp size={16} aria-hidden="true" />
                <span>Feita para o dia da votação</span>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold text-muted transition-colors hover:bg-paper-deep hover:text-ink"
              >
                <RotateCcw size={15} aria-hidden="true" />
                <span className="hidden sm:inline">Recomeçar</span>
              </button>
            </div>
          </div>
        </header>

        <main
          className="paper-grid no-print"
          aria-busy={!hydrated}
        >
          <section className="mx-auto max-w-6xl px-5 pb-10 pt-12 sm:px-8 sm:pb-14 sm:pt-20">
            <div className="grid gap-10 lg:grid-cols-[1fr_340px] lg:items-end lg:gap-16">
              <div>
                <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-coral">
                  <span className="h-2 w-2 rounded-full bg-coral" />
                  Eleições Gerais · 2026
                </p>
                <h1 className="display-serif mt-5 max-w-3xl text-[clamp(2.7rem,8vw,5.8rem)] leading-[0.94] tracking-[-0.06em] text-ink">
                  Monte sua colinha antes do voto.
                </h1>
                <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg">
                  Pesquise pelo número, confira os dados públicos do TSE e
                  leve tudo impresso para a cabine. Sem depender do celular.
                </p>
              </div>

              <div className="rounded-2xl border border-line bg-white/60 p-5 lg:mb-1">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
                  Onde você vota?
                </p>
                <div className="mt-3 rounded-xl border border-line bg-white px-3 py-2">
                  <UfSelect value={uf} onChange={handleUfChange} />
                </div>
                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">
                      Progresso
                    </p>
                    <p className="mt-1 text-2xl font-black tracking-[-0.05em] text-ink">
                      {confirmedCount}
                      <span className="text-base font-semibold text-muted">
                        {" "}
                        / {CARGOS_2026.length}
                      </span>
                    </p>
                  </div>
                  {confirmedCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => router.push("/colinha")}
                      className="flex h-11 items-center gap-2 rounded-xl bg-coral px-4 text-xs font-extrabold text-white transition-transform hover:-translate-y-0.5"
                    >
                      <FileDown size={16} aria-hidden="true" />
                      Gerar Colinha para Impressão
                    </button>
                  ) : (
                    <span className="text-right text-xs font-semibold leading-5 text-muted">
                      Adicione ao menos
                      <br />
                      um candidato
                    </span>
                  )}
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-paper-deep">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-500"
                    style={{
                      width: `${(confirmedCount / CARGOS_2026.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </section>

          <section
            id="cargos"
            className="mx-auto max-w-6xl px-5 pb-20 sm:px-8"
          >
            <div className="mb-6 flex items-end justify-between gap-5 border-b border-line pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">
                  Sua seleção
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] text-ink sm:text-3xl">
                  Ordem de votação
                </h2>
              </div>
              <p className="hidden max-w-[210px] text-right text-xs leading-5 text-muted sm:block">
                A ordem segue exatamente a sequência da urna eletrônica.
              </p>
            </div>

            <div className="divide-y divide-line/80">
              {CARGOS_2026.map((cargo, index) => {
                const candidate = slots[cargo.slug];

                return (
                  <article
                    key={cargo.slug}
                    className="grid gap-4 py-6 sm:grid-cols-[74px_220px_1fr] sm:gap-7 sm:py-8"
                  >
                    <div className="flex items-start gap-3 sm:block">
                      <span className="display-serif text-4xl leading-none text-coral sm:text-5xl">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="pt-1 sm:mt-4 sm:pt-0">
                        <Landmark
                          className="hidden text-muted/50 sm:block"
                          size={18}
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                    <div className="sm:pt-1">
                      <h3 className="text-lg font-extrabold tracking-[-0.035em] text-ink">
                        {cargo.slug === "deputado-estadual" && uf === "DF"
                          ? "Deputado Distrital"
                          : cargo.label}
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        {cargo.slug.startsWith("senador")
                          ? "Duas vagas em disputa este ano."
                          : `Número com ${cargo.maxLength} dígitos.`}
                      </p>
                    </div>
                    <div className="min-w-0">
                      {candidate ? (
                        <CandidateCard
                          candidato={candidate}
                          uf={uf}
                          confirmed
                          onClear={() => clearCandidate(cargo.slug)}
                          onRefresh={() => refreshCandidate(candidate)}
                        />
                      ) : (
                        <SlotInput
                          key={`${uf}-${cargo.slug}`}
                          cargo={cargo.slug}
                          uf={uf}
                          onConfirm={handleConfirm}
                        />
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-accent/15 bg-accent/5 p-4 text-xs leading-5 text-accent-deep">
              <Info className="mt-0.5 shrink-0" size={17} aria-hidden="true" />
              <p>
                Os dados são públicos e podem mudar até a eleição. Confirme
                sempre a situação do candidato no site oficial do TSE.
              </p>
            </div>
          </section>
        </main>

        <footer className="no-print border-t border-line bg-paper-deep/40">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-7 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p className="font-semibold">
              Colinha Eleitoral · Um lembrete no papel, uma escolha consciente.
            </p>
            <a
              href="https://divulgacandcontas.tse.jus.br/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-bold text-accent hover:text-accent-deep"
            >
              Fonte: TSE
              <ArrowRight size={14} aria-hidden="true" />
            </a>
          </div>
        </footer>
      </div>
    </>
  );
}
