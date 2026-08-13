"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { getCargoConfig, getUfLabel } from "@/lib/cargos";
import { grantLgpdConsent, hasValidLgpdConsent } from "@/lib/lgpd";
import type { CandidatoColinha, CargoSlug } from "@/lib/types";
import { useCandidatosStore } from "@/store/candidatos-store";

import { CandidateCard } from "./candidate-card";
import { CandidateSkeleton } from "./candidate-skeleton";
import { ConfirmDialog } from "./confirm-dialog";

interface SharedCandidateViewProps {
  uf: string;
  cargo: CargoSlug;
  numero: string;
  legenda: boolean;
}

export function SharedCandidateView({
  uf,
  cargo,
  numero,
  legenda,
}: SharedCandidateViewProps) {
  const router = useRouter();
  const storedUf = useCandidatosStore((state) => state.uf);
  const slots = useCandidatosStore((state) => state.slots);
  const setUf = useCandidatosStore((state) => state.setUf);
  const setCandidate = useCandidatosStore((state) => state.setCandidate);
  const resetColinha = useCandidatosStore((state) => state.resetColinha);
  const [candidate, setLocalCandidate] = useState<CandidatoColinha | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [askUfSwitch, setAskUfSwitch] = useState(false);

  const cargoLabel = getCargoConfig(cargo, uf).label;
  const place = getUfLabel(uf);
  const ufMismatch = cargo !== "presidente" && storedUf !== uf;
  const alreadySaved =
    slots[cargo]?.numero === numero &&
    (legenda
      ? slots[cargo]?.tipoVoto === "legenda"
      : slots[cargo]?.tipoVoto !== "legenda") &&
    !ufMismatch;

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const query = new URLSearchParams({ uf, cargo, numero });
        if (legenda) {
          query.set("legenda", "true");
        }

        const response = await fetch(`/api/candidatos?${query}`, {
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        } & Partial<CandidatoColinha>;

        if (!response.ok) {
          throw new Error(
            payload.error ?? "Não encontramos este candidato.",
          );
        }

        setLocalCandidate(payload as CandidatoColinha);
      } catch (requestError) {
        if (
          requestError instanceof Error &&
          requestError.name === "AbortError"
        ) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Não foi possível abrir este candidato.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [cargo, legenda, numero, uf]);

  function persistCandidate(next: CandidatoColinha) {
    if (!hasValidLgpdConsent()) {
      grantLgpdConsent();
    }

    setCandidate(next.cargo, next);
    toast.success(
      next.tipoVoto === "legenda"
        ? `Partido ${next.partido} salvo na sua lista.`
        : `${next.nomeUrna} salvo na sua lista.`,
    );
    router.push("/");
  }

  function handleSave() {
    if (!candidate) {
      return;
    }

    if (ufMismatch) {
      const hasOtherChoices = Object.values(slots).some(Boolean);
      if (hasOtherChoices) {
        setAskUfSwitch(true);
        return;
      }

      setUf(uf);
    }

    persistCandidate(candidate);
  }

  function handleSwitchAndSave() {
    if (!candidate) {
      return;
    }

    resetColinha();
    setUf(uf);
    persistCandidate(candidate);
    setAskUfSwitch(false);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <ConfirmDialog
        open={askUfSwitch}
        title={`Trocar para ${place}?`}
        description="Este candidato é de outro estado. Se você salvar, a lista atual será apagada e o estado muda."
        confirmLabel="Trocar e salvar"
        onConfirm={handleSwitchAndSave}
        onCancel={() => setAskUfSwitch(false)}
      />

      <p className="text-sm font-semibold text-coral">Alguém enviou este link</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-console-ink sm:text-4xl">
        {legenda ? `Partido para ${cargoLabel}` : cargoLabel}
      </h1>
      <p className="mt-2 text-base leading-6 text-console-muted">
        {cargo === "presidente" ? "Eleição em todo o Brasil." : `Estado: ${place}.`}
      </p>

      <div className="mt-6 rounded-2xl border border-console-edge bg-console p-2.5 sm:p-3">
        <div className="screen-surface overflow-hidden rounded-xl">
          {loading ? (
            <div className="p-4 sm:p-5">
              <CandidateSkeleton legenda={legenda} />
            </div>
          ) : error ? (
            <p
              role="alert"
              className="px-5 py-8 text-center text-base font-semibold leading-7 text-coral-ink"
            >
              {error}
            </p>
          ) : candidate ? (
            <>
              {ufMismatch ? (
                <p className="border-b border-screen-line bg-coral/15 px-4 py-4 text-sm leading-6 text-coral-ink sm:px-5">
                  Este candidato é de {place}. Sua lista está em{" "}
                  {getUfLabel(storedUf)}.
                </p>
              ) : null}
              <CandidateCard
                candidato={candidate}
                uf={uf}
                confirmed={alreadySaved}
                onConfirm={alreadySaved ? undefined : handleSave}
                onClear={() => router.push("/")}
                clearLabel={alreadySaved ? "Ir para a lista" : "Agora não"}
              />
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}
