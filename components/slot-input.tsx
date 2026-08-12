"use client";

import { Flag, List } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { LEGENDA_LENGTH, getCargoConfig } from "@/lib/cargos";
import type { CargoSlug, CandidatoColinha, TipoVoto } from "@/lib/types";

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
  const [legenda, setLegenda] = useState<CandidatoColinha | null>(null);
  const [legendaLoading, setLegendaLoading] = useState(false);
  const [legendaError, setLegendaError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [pickerMode, setPickerMode] = useState<TipoVoto | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const legendaControllerRef = useRef<AbortController | null>(null);
  const requestedPartyRef = useRef<string | null>(null);

  const digitCount = config.maxLength;
  const showsLegenda = config.proporcional;

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      legendaControllerRef.current?.abort();
    };
  }, []);

  async function searchCandidate(nextNumber: string) {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams({ uf, cargo, numero: nextNumber });
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

  /**
   * O partido aparece assim que os dois primeiros dígitos são digitados, do
   * mesmo modo que a urna. Um número inexistente não vira erro barulhento:
   * o eleitor provavelmente está a caminho do número completo do candidato.
   */
  async function searchParty(partyNumber: string) {
    legendaControllerRef.current?.abort();
    const controller = new AbortController();
    legendaControllerRef.current = controller;
    requestedPartyRef.current = partyNumber;
    setLegendaLoading(true);
    setLegendaError(null);
    setLegenda(null);

    try {
      const query = new URLSearchParams({
        uf,
        cargo,
        numero: partyNumber,
        legenda: "true",
      });
      const response = await fetch(`/api/candidatos?${query}`, {
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      } & Partial<CandidatoColinha>;

      if (!response.ok) {
        throw new Error(
          payload.error ?? "Nenhum partido com esse número disputa este cargo.",
        );
      }

      setLegenda(payload as CandidatoColinha);
    } catch (requestError) {
      if (requestError instanceof Error && requestError.name === "AbortError") {
        return;
      }

      setLegenda(null);
      setLegendaError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível consultar este partido.",
      );
    } finally {
      if (!controller.signal.aborted) {
        setLegendaLoading(false);
      }
    }
  }

  function clearParty() {
    legendaControllerRef.current?.abort();
    requestedPartyRef.current = null;
    setLegenda(null);
    setLegendaError(null);
    setLegendaLoading(false);
  }

  function handleChange(value: string) {
    const digitsOnly = value.replace(/\D/g, "").slice(0, digitCount);
    setNumber(digitsOnly);
    setCandidate(null);
    setError(null);

    if (digitsOnly.length === digitCount) {
      void searchCandidate(digitsOnly);
    } else {
      controllerRef.current?.abort();
      setLoading(false);
    }

    if (!showsLegenda) {
      return;
    }

    const partyNumber = digitsOnly.slice(0, LEGENDA_LENGTH);

    if (partyNumber.length < LEGENDA_LENGTH) {
      clearParty();
      return;
    }

    if (partyNumber !== requestedPartyRef.current) {
      void searchParty(partyNumber);
    }
  }

  function clearSlot() {
    controllerRef.current?.abort();
    setNumber("");
    setCandidate(null);
    setError(null);
    setLoading(false);
    clearParty();
  }

  const picker = pickerMode ? (
    <CandidatePicker
      cargo={cargo}
      uf={uf}
      modo={pickerMode}
      onConfirm={(selectedCandidate) => {
        setPickerMode(null);
        onConfirm(selectedCandidate);
      }}
      onClose={() => setPickerMode(null)}
    />
  ) : null;

  if (candidate) {
    return (
      <>
        <CandidateCard
          candidato={candidate}
          uf={uf}
          onConfirm={() => onConfirm(candidate)}
          onClear={clearSlot}
        />
        {picker}
      </>
    );
  }

  const digits = Array.from(
    { length: digitCount },
    (_, index) => number[index] ?? "",
  );
  const activeIndex = Math.min(number.length, digitCount - 1);
  const missingDigits = digitCount - number.length;
  const missingForParty = LEGENDA_LENGTH - number.length;

  function hintText() {
    if (loading) {
      return "Consultando os dados públicos do TSE…";
    }

    if (number.length === digitCount) {
      return legenda
        ? "Esse número não é de um candidato, mas você ainda pode confirmar a legenda abaixo."
        : "";
    }

    if (!showsLegenda) {
      return number.length === 0
        ? `Digite os ${digitCount} dígitos para buscar automaticamente.`
        : `Faltam ${missingDigits} dígito${missingDigits === 1 ? "" : "s"}.`;
    }

    if (number.length === 0) {
      return `Digite ${LEGENDA_LENGTH} dígitos para ver o partido ou ${digitCount} para buscar um candidato.`;
    }

    if (number.length < LEGENDA_LENGTH) {
      return `Falta${missingForParty === 1 ? "" : "m"} ${missingForParty} dígito${
        missingForParty === 1 ? "" : "s"
      } para ver o partido.`;
    }

    return `Faltam ${missingDigits} dígito${
      missingDigits === 1 ? "" : "s"
    } para um candidato, ou confirme a legenda abaixo.`;
  }

  return (
    <div>
      <div className="p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <label
            htmlFor={`numero-${cargo}`}
            className="text-xs font-bold text-ink"
          >
            Número do candidato
          </label>
          <span className="font-mono text-[11px] tracking-widest text-muted">
            {number.length}/{digitCount}
          </span>
        </div>

        <div className="relative mt-2.5">
          <input
            id={`numero-${cargo}`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            pattern={`\\d{${digitCount}}`}
            maxLength={digitCount}
            value={number}
            onChange={(event) => handleChange(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="absolute inset-0 z-10 h-full w-full cursor-text rounded-lg text-transparent caret-transparent opacity-0"
            aria-describedby={`hint-${cargo}`}
          />
          <div className="flex gap-2" aria-hidden="true">
            {digits.map((digit, index) => {
              const isActive = focused && index === activeIndex;
              // Separa visualmente o bloco do partido do resto do número.
              const closesPartyBlock =
                showsLegenda && index === LEGENDA_LENGTH - 1;

              return (
                <span
                  key={index}
                  className={`flex h-15 max-w-16 flex-1 items-center justify-center rounded-lg border-2 bg-white font-mono text-2xl font-bold text-ink transition-colors duration-150 ${
                    isActive ? "border-accent" : "border-screen-line"
                  } ${closesPartyBlock ? "mr-2 sm:mr-3" : ""}`}
                >
                  {digit ||
                    (isActive ? (
                      <span className="digit-caret h-7 w-0.5 bg-accent" />
                    ) : null)}
                </span>
              );
            })}
          </div>
          {showsLegenda ? (
            <p className="mt-2 font-mono text-[10px] tracking-widest text-muted">
              OS {LEGENDA_LENGTH} PRIMEIROS DÍGITOS SÃO O PARTIDO
            </p>
          ) : null}
        </div>

        <p id={`hint-${cargo}`} className="mt-2 text-xs leading-5 text-muted">
          {hintText()}
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-lg border-2 border-coral bg-coral/15 px-3 py-2.5 text-xs font-semibold leading-5 text-coral-ink"
          >
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="mt-4">
            <CandidateSkeleton />
          </div>
        ) : null}

        <div className="mt-4 grid gap-2 border-t border-screen-line pt-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setPickerMode("candidato")}
            className="flex h-12 items-center justify-center gap-2 rounded-lg border-2 border-ink/15 bg-white text-sm font-bold text-ink transition-colors duration-150 hover:border-ink/40"
          >
            <List size={17} aria-hidden="true" />
            Ver candidatos
          </button>
          {showsLegenda ? (
            <button
              type="button"
              onClick={() => setPickerMode("legenda")}
              className="flex h-12 items-center justify-center gap-2 rounded-lg border-2 border-ink/15 bg-white text-sm font-bold text-ink transition-colors duration-150 hover:border-ink/40"
            >
              <Flag size={16} aria-hidden="true" />
              Ver partidos
            </button>
          ) : null}
        </div>
      </div>

      {legendaLoading ? (
        <div className="border-t-2 border-screen-line p-4 sm:p-5">
          <CandidateSkeleton legenda />
        </div>
      ) : legendaError && number.length === LEGENDA_LENGTH ? (
        <p className="border-t-2 border-screen-line px-4 py-4 text-xs leading-5 text-muted sm:px-5">
          {legendaError}
        </p>
      ) : legenda ? (
        <div className="border-t-2 border-screen-line">
          <CandidateCard
            candidato={legenda}
            uf={uf}
            onConfirm={() => onConfirm(legenda)}
            onClear={clearSlot}
          />
        </div>
      ) : null}

      {picker}
    </div>
  );
}
