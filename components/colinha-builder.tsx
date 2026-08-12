"use client";

import { CircleHelp, ExternalLink, Info, Printer, RotateCcw } from "lucide-react";
import Image from "next/image";
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
    toast.success(
      candidate.tipoVoto === "legenda"
        ? `Legenda ${candidate.partido} foi adicionada à sua colinha.`
        : `${candidate.nomeUrna} foi adicionado à sua colinha.`,
    );
  }

  async function refreshCandidate(candidate: CandidatoColinha) {
    const query = new URLSearchParams({
      uf,
      cargo: candidate.cargo,
      numero: candidate.numero,
    });
    if (candidate.tipoVoto === "legenda") {
      query.set("legenda", "true");
    }

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
              "border-console-edge! bg-console! text-console-ink! shadow-lg!",
            title: "text-sm! font-semibold!",
            description: "text-xs! text-console-muted!",
          },
        }}
      />

      <div className="min-h-screen bg-console-deep">
        <header className="no-print sticky top-0 z-20 border-b border-console-edge bg-console-deep/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-lg"
              aria-label="Início"
            >
              <Image
                src="/icon.svg"
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 rounded-md"
                aria-hidden="true"
              />
              <span>
                <span className="block text-sm font-bold tracking-tight text-console-ink">
                  Colinha Eleitoral
                </span>
                <span className="block font-mono text-[10px] tracking-widest text-console-muted">
                  ELEIÇÕES 2026
                </span>
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-2 text-xs font-medium text-console-muted md:flex">
                <CircleHelp size={15} aria-hidden="true" />
                Prepare antes de ir votar
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="flex h-10 items-center gap-2 rounded-lg border border-console-edge px-3 text-xs font-bold text-console-ink transition-colors duration-150 hover:bg-console"
              >
                <RotateCcw size={15} aria-hidden="true" />
                <span className="hidden sm:inline">Recomeçar</span>
              </button>
            </div>
          </div>
        </header>

        <main className="no-print" aria-busy={!hydrated}>
          <section className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 sm:pt-12">
            <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start lg:gap-8">
              <div className="pt-1">
                <p className="font-mono text-[11px] tracking-widest text-coral">
                  ELEIÇÕES GERAIS · 2026
                </p>
                <h1 className="mt-3 max-w-lg text-4xl font-black leading-[1.05] tracking-tight text-console-ink sm:text-5xl">
                  Ensaie seu voto antes da urna.
                </h1>
                <p className="mt-4 max-w-md text-sm leading-6 text-console-muted sm:text-base">
                  Digite o número, confira os dados públicos do TSE na mesma
                  ordem da votação e leve tudo impresso para a cabine.
                </p>
              </div>

              <div className="rounded-2xl border border-console-edge bg-console p-2.5">
                <div className="screen-surface rounded-xl p-4">
                  <UfSelect value={uf} onChange={handleUfChange} />

                  <div className="mt-4 border-t border-screen-line pt-4">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="font-mono text-[10px] tracking-widest text-muted">
                          CARGOS PREENCHIDOS
                        </p>
                        <p className="mt-1 font-mono text-3xl font-bold leading-none text-ink">
                          {confirmedCount}
                          <span className="text-lg text-muted">
                            /{CARGOS_2026.length}
                          </span>
                        </p>
                      </div>
                      <p className="max-w-32 text-right text-[11px] leading-4 text-muted">
                        {confirmedCount > 0
                          ? "Você já pode imprimir e completar depois."
                          : "Comece pelo primeiro cargo abaixo."}
                      </p>
                    </div>

                    <div
                      className="mt-3 h-2 overflow-hidden rounded-full bg-screen-deep"
                      role="progressbar"
                      aria-valuenow={confirmedCount}
                      aria-valuemin={0}
                      aria-valuemax={CARGOS_2026.length}
                      aria-label="Cargos preenchidos"
                    >
                      <div
                        className="h-full bg-accent transition-[width] duration-200"
                        style={{
                          width: `${
                            (confirmedCount / CARGOS_2026.length) * 100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => router.push("/colinha")}
                  disabled={confirmedCount === 0}
                  className="mt-2.5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-ink transition-colors duration-150 hover:bg-screen disabled:cursor-not-allowed disabled:bg-console-edge disabled:text-console-muted"
                >
                  <Printer size={17} aria-hidden="true" />
                  Gerar colinha para impressão
                </button>
              </div>
            </div>
          </section>

          <section id="cargos" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
            <div className="mb-5 flex items-end justify-between gap-4">
              <h2 className="text-lg font-bold tracking-tight text-console-ink">
                Sequência de votação
              </h2>
              <p className="font-mono text-[10px] tracking-widest text-console-muted">
                {CARGOS_2026.length} CARGOS
              </p>
            </div>

            <div className="space-y-4">
              {CARGOS_2026.map((cargo, index) => {
                const candidate = slots[cargo.slug];
                const cargoLabel =
                  cargo.slug === "deputado-estadual" && uf === "DF"
                    ? "Deputado Distrital"
                    : cargo.label;

                return (
                  <article
                    key={cargo.slug}
                    className="rounded-2xl border border-console-edge bg-console p-2.5 sm:p-3"
                  >
                    <div className="flex items-center justify-between gap-3 px-1.5 pb-2.5">
                      <span className="font-mono text-[10px] tracking-widest text-console-muted">
                        PASSO {String(index + 1).padStart(2, "0")} DE{" "}
                        {CARGOS_2026.length}
                      </span>
                      <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            candidate ? "bg-accent-bright" : "bg-console-muted"
                          }`}
                          aria-hidden="true"
                        />
                        <span
                          className={
                            candidate
                              ? "text-accent-bright"
                              : "text-console-muted"
                          }
                        >
                          {candidate ? "CONFIRMADO" : "AGUARDANDO"}
                        </span>
                      </span>
                    </div>

                    <div className="screen-surface overflow-hidden rounded-xl">
                      <header className="border-b border-screen-line px-4 py-3 sm:px-5">
                        <p className="font-mono text-[10px] tracking-widest text-muted">
                          SEU VOTO PARA
                        </p>
                        <h3 className="mt-1 text-xl font-black tracking-tight text-ink sm:text-2xl">
                          {cargoLabel}
                        </h3>
                        <p className="mt-1 text-xs text-muted">
                          {candidate?.tipoVoto === "legenda"
                            ? "Voto de legenda no partido"
                            : cargo.proporcional
                              ? `Número de ${cargo.maxLength} dígitos · aceita voto de legenda`
                              : cargo.slug.startsWith("senador")
                                ? `Duas vagas neste ano · número de ${cargo.maxLength} dígitos`
                                : `Número de ${cargo.maxLength} dígitos`}
                        </p>
                      </header>

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

            <div className="mt-6 flex items-start gap-3 rounded-xl border border-console-edge px-4 py-3.5 text-xs leading-5 text-console-muted">
              <Info className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
              <p>
                Aplicativo independente, sem vínculo com o TSE. Os dados são
                públicos e podem mudar até a eleição, então confirme a situação
                do candidato antes de votar.
              </p>
            </div>
          </section>
        </main>

        <footer className="no-print border-t border-console-edge">
          <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 text-xs text-console-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>Colinha Eleitoral · um lembrete no papel para o dia da votação</p>
            <a
              href="https://divulgacandcontas.tse.jus.br/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-bold text-console-ink hover:text-white"
            >
              Consultar fonte oficial do TSE
              <ExternalLink size={13} aria-hidden="true" />
            </a>
          </div>
        </footer>
      </div>
    </>
  );
}
