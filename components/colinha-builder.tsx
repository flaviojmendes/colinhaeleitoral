"use client";

import { Info, Printer, RotateCcw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { CARGOS_2026 } from "@/lib/cargos";
import { grantLgpdConsent, hasValidLgpdConsent } from "@/lib/lgpd";
import type { CandidatoColinha } from "@/lib/types";
import { useCandidatosStore } from "@/store/candidatos-store";

import { CandidateCard } from "./candidate-card";
import { ConfirmDialog } from "./confirm-dialog";
import { SiteFooter } from "./site-footer";
import { SlotInput } from "./slot-input";
import { UfSelect } from "./uf-select";

type PendingAction =
  | { type: "reset" }
  | { type: "uf"; nextUf: string }
  | null;

export function ColinhaBuilder() {
  const router = useRouter();
  const uf = useCandidatosStore((state) => state.uf);
  const slots = useCandidatosStore((state) => state.slots);
  const setUf = useCandidatosStore((state) => state.setUf);
  const setCandidate = useCandidatosStore((state) => state.setCandidate);
  const clearCandidate = useCandidatosStore((state) => state.clearCandidate);
  const resetColinha = useCandidatosStore((state) => state.resetColinha);
  const [hydrated, setHydrated] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

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

  function applyUfChange(nextUf: string) {
    resetColinha();
    setUf(nextUf);
    toast.success("Estado atualizado. Comece de novo pelos cargos abaixo.");
  }

  function handleUfChange(nextUf: string) {
    if (nextUf === uf) {
      return;
    }

    if (confirmedCount > 0) {
      setPendingAction({ type: "uf", nextUf });
      return;
    }

    applyUfChange(nextUf);
  }

  function handleConfirm(candidate: CandidatoColinha) {
    if (!hasValidLgpdConsent()) {
      grantLgpdConsent();
    }

    setCandidate(candidate.cargo, candidate);
    toast.success(
      candidate.tipoVoto === "legenda"
        ? `Partido ${candidate.partido} salvo na sua lista.`
        : `${candidate.nomeUrna} salvo na sua lista.`,
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

  function handleResetRequest() {
    if (confirmedCount === 0) {
      toast.success("Sua lista já está vazia.");
      return;
    }

    setPendingAction({ type: "reset" });
  }

  function handlePendingConfirm() {
    if (!pendingAction) {
      return;
    }

    if (pendingAction.type === "reset") {
      resetColinha();
      toast.success("Lista apagada. Você pode começar de novo.");
    } else {
      applyUfChange(pendingAction.nextUf);
    }

    setPendingAction(null);
  }

  const remaining = CARGOS_2026.length - confirmedCount;
  const printLabel =
    confirmedCount === 0
      ? "Escolha ao menos 1 candidato"
      : remaining === 0
        ? "Imprimir minha lista"
        : `Imprimir lista (${confirmedCount} de ${CARGOS_2026.length})`;

  return (
    <>
      <ConfirmDialog
        open={pendingAction !== null}
        title={
          pendingAction?.type === "uf"
            ? "Trocar de estado?"
            : "Apagar toda a lista?"
        }
        description={
          pendingAction?.type === "uf"
            ? "Se você mudar o estado, os candidatos já escolhidos serão apagados."
            : "Isso remove todos os candidatos que você já escolheu."
        }
        confirmLabel={
          pendingAction?.type === "uf" ? "Trocar estado" : "Apagar lista"
        }
        onConfirm={handlePendingConfirm}
        onCancel={() => setPendingAction(null)}
      />

      <div className="min-h-screen bg-console-deep pb-28">
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
                width={40}
                height={40}
                className="h-10 w-10 rounded-md"
                aria-hidden="true"
              />
              <span>
                <span className="block text-base font-bold tracking-tight text-console-ink">
                  Colinha Eleitoral
                </span>
                <span className="block text-sm text-console-muted">
                  Eleições 2026
                </span>
              </span>
            </Link>

            <button
              type="button"
              onClick={handleResetRequest}
              className="flex h-12 items-center gap-2 rounded-xl border border-console-edge px-4 text-sm font-bold text-console-ink transition-colors duration-150 hover:bg-console"
            >
              <RotateCcw size={16} aria-hidden="true" />
              Recomeçar
            </button>
          </div>
        </header>

        <main className="no-print" aria-busy={!hydrated}>
          <section className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 sm:pt-10">
            <div className="max-w-xl">
              <p className="text-sm font-semibold text-coral">
                Eleições Gerais · 2026
              </p>
              <h1 className="mt-3 text-4xl font-black leading-[1.08] tracking-tight text-console-ink sm:text-5xl">
                Monte sua lista de votos
              </h1>
              <p className="mt-4 text-base leading-7 text-console-muted sm:text-lg">
                Escolha os candidatos, confira os dados públicos e imprima um
                papelzinho para levar no dia da eleição.
              </p>
            </div>

            <ol className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Escolha o estado",
                  text: "Onde fica sua seção eleitoral.",
                },
                {
                  step: "2",
                  title: "Escolha os candidatos",
                  text: "Pelo nome ou pelo número da urna.",
                },
                {
                  step: "3",
                  title: "Imprima a lista",
                  text: "Leve o papel. Celular não entra na cabine.",
                },
              ].map((item) => (
                <li
                  key={item.step}
                  className="rounded-2xl border border-console-edge bg-console px-4 py-4"
                >
                  <p className="text-sm font-bold text-coral">
                    Passo {item.step}
                  </p>
                  <p className="mt-1 text-base font-bold text-console-ink">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-console-muted">
                    {item.text}
                  </p>
                </li>
              ))}
            </ol>

            <div className="mt-8 rounded-2xl border border-console-edge bg-console p-3">
              <div className="screen-surface rounded-xl p-5">
                <UfSelect value={uf} onChange={handleUfChange} />

                <div className="mt-5 border-t border-screen-line pt-5">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-ink">
                        Progresso da sua lista
                      </p>
                      <p className="mt-2 font-mono text-4xl font-bold leading-none text-ink">
                        {confirmedCount}
                        <span className="text-xl text-muted">
                          /{CARGOS_2026.length}
                        </span>
                      </p>
                    </div>
                    <p className="max-w-40 text-right text-sm leading-5 text-muted">
                      {confirmedCount === 0
                        ? "Comece pelo primeiro cargo abaixo."
                        : remaining === 0
                          ? "Lista completa. Já pode imprimir."
                          : `Faltam ${remaining}. Você já pode imprimir o que tiver.`}
                    </p>
                  </div>

                  <div
                    className="mt-4 h-3 overflow-hidden rounded-full bg-screen-deep"
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
                className="mt-3 hidden h-14 w-full items-center justify-center gap-2 rounded-xl bg-white text-base font-bold text-ink transition-colors duration-150 hover:bg-screen disabled:cursor-not-allowed disabled:bg-console-edge disabled:text-console-muted sm:flex"
              >
                <Printer size={18} aria-hidden="true" />
                {printLabel}
              </button>
            </div>
          </section>

          <section id="cargos" className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
            <div className="mb-5">
              <h2 className="text-2xl font-bold tracking-tight text-console-ink">
                Cargos da votação
              </h2>
              <p className="mt-2 text-base leading-6 text-console-muted">
                Na urna, a ordem é esta. Você pode preencher só o que quiser.
              </p>
            </div>

            <div className="space-y-5">
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
                    <div className="flex items-center justify-between gap-3 px-2 pb-3">
                      <span className="text-sm font-semibold text-console-muted">
                        {index + 1} de {CARGOS_2026.length}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-bold ${
                          candidate
                            ? "bg-accent text-white"
                            : "bg-console-edge text-console-muted"
                        }`}
                      >
                        {candidate ? "Escolhido" : "Em aberto"}
                      </span>
                    </div>

                    <div className="screen-surface overflow-hidden rounded-xl">
                      <header className="border-b border-screen-line px-4 py-4 sm:px-5">
                        <p className="text-sm font-semibold text-muted">
                          Seu voto para
                        </p>
                        <h3 className="mt-1 text-2xl font-black tracking-tight text-ink sm:text-3xl">
                          {cargoLabel}
                        </h3>
                        <p className="mt-2 text-sm leading-5 text-muted">
                          {candidate?.tipoVoto === "legenda"
                            ? "Você escolheu votar no partido (voto de legenda)."
                            : cargo.proporcional
                              ? "Pode escolher uma pessoa ou só o partido."
                              : cargo.slug.startsWith("senador")
                                ? "Há duas vagas de senador neste ano."
                                : "Escolha uma pessoa para este cargo."}
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

            <div className="mt-6 flex items-start gap-3 rounded-xl border border-console-edge px-4 py-4 text-sm leading-6 text-console-muted">
              <Info className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
              <p>
                Este aplicativo é independente e não tem vínculo com o TSE. Os
                dados são públicos e podem mudar até a eleição. Confirme a
                situação do candidato antes de votar.
              </p>
            </div>
          </section>
        </main>

        <SiteFooter />

        <div className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-console-edge bg-console-deep/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
          <button
            type="button"
            onClick={() => router.push("/colinha")}
            disabled={confirmedCount === 0}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-white text-base font-bold text-ink transition-colors duration-150 hover:bg-screen disabled:cursor-not-allowed disabled:bg-console-edge disabled:text-console-muted"
          >
            <Printer size={18} aria-hidden="true" />
            {printLabel}
          </button>
        </div>
      </div>
    </>
  );
}
