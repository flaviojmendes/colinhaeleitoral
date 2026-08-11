"use client";

import { List, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { getCargoConfig } from "@/lib/cargos";
import type { CargoSlug, CandidatoColinha } from "@/lib/types";

import { CandidateCard } from "./candidate-card";
import { CandidatePicker } from "./candidate-picker";
import { CandidateSkeleton } from "./candidate-skeleton";

interface SlotInputProps {
  cargo: CargoSlug;
  uf: string;
  onConfirm: (candidate: CandidatoColinha) => void;
}

export function SlotInput({ cargo, uf, onConfirm }: SlotInputProps) {
  const config = getCargoConfig(cargo, uf);
  const [number, setNumber] = useState("");
  const [candidate, setCandidate] = useState<CandidatoColinha | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  async function searchCandidate(nextNumber: string) {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams({
        uf,
        cargo,
        numero: nextNumber,
      });
      const response = await fetch(`/api/candidatos?${query}`, {
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      } & Partial<CandidatoColinha>;

      if (!response.ok) {
        throw new Error(
          payload.error ??
            "Não foi possível consultar este número. Tente novamente.",
        );
      }

      setCandidate(payload as CandidatoColinha);
    } catch (requestError) {
      if (requestError instanceof Error && requestError.name === "AbortError") {
        return;
      }

      const message =
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível consultar este número.";
      setCandidate(null);
      setError(message);
      toast.error(message);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }

  function handleChange(value: string) {
    const digitsOnly = value.replace(/\D/g, "").slice(0, config.maxLength);
    setNumber(digitsOnly);
    setCandidate(null);
    setError(null);

    if (digitsOnly.length === config.maxLength) {
      void searchCandidate(digitsOnly);
    } else {
      controllerRef.current?.abort();
      setLoading(false);
    }
  }

  function clearSlot() {
    controllerRef.current?.abort();
    setNumber("");
    setCandidate(null);
    setError(null);
    setLoading(false);
  }

  return (
    <div>
      {!candidate ? (
        <>
          <label
            htmlFor={`numero-${cargo}`}
            className="flex items-center justify-between gap-3"
          >
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
              Número do candidato
            </span>
            <span className="text-[11px] font-semibold text-muted">
              {number.length}/{config.maxLength}
            </span>
          </label>
          <div className="relative mt-2">
            <input
              id={`numero-${cargo}`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              pattern={`\\d{${config.maxLength}}`}
              maxLength={config.maxLength}
              placeholder={"0".repeat(config.maxLength)}
              value={number}
              onChange={(event) => handleChange(event.target.value)}
              className="h-14 w-full rounded-xl border border-line bg-white px-4 pr-12 text-xl font-bold tracking-[0.28em] text-ink placeholder:text-line focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10"
              aria-describedby={`hint-${cargo}`}
            />
            <Search
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted"
              size={20}
              aria-hidden="true"
            />
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-accent/25 bg-accent/5 text-sm font-bold text-accent transition-colors hover:border-accent hover:bg-accent/10"
          >
            <List size={17} aria-hidden="true" />
            Escolher pela lista de candidatos
          </button>
          <p id={`hint-${cargo}`} className="mt-2 text-xs text-muted">
            {number.length === 0
              ? `Digite os ${config.maxLength} dígitos para buscar automaticamente.`
              : number.length < config.maxLength
                ? `Faltam ${config.maxLength - number.length} dígito${
                    config.maxLength - number.length === 1 ? "" : "s"
                  }.`
                : "Consultando dados públicos do TSE…"}
          </p>
          {error ? (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-medium leading-5 text-red-800">
              {error}
            </p>
          ) : null}
          {loading ? <CandidateSkeleton /> : null}
        </>
      ) : (
        <CandidateCard
          candidato={candidate}
          uf={uf}
          onConfirm={() => onConfirm(candidate)}
          onClear={clearSlot}
        />
      )}
      {pickerOpen ? (
        <CandidatePicker
          cargo={cargo}
          uf={uf}
          onConfirm={(selectedCandidate) => {
            setPickerOpen(false);
            onConfirm(selectedCandidate);
          }}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
    </div>
  );
}
