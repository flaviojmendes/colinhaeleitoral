"use client";

import { Flag, Keyboard, List } from "lucide-react";
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
  const [showDigits, setShowDigits] = useState(false);
  const [pickerMode, setPickerMode] = useState<TipoVoto | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const legendaControllerRef = useRef<AbortController | null>(null);
  const requestedPartyRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const digitCount = config.maxLength;
  const showsLegenda = config.proporcional;

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      legendaControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (showDigits) {
      inputRef.current?.focus();
    }
  }, [showDigits]);

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
            "Não encontramos este número. Confira e tente de novo.",
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
      return "Buscando no site do TSE…";
    }

    if (number.length === digitCount) {
      return legenda
        ? "Este número não é de um candidato, mas você ainda pode confirmar o partido abaixo."
        : "";
    }

    if (!showsLegenda) {
      return number.length === 0
        ? `Digite os ${digitCount} números da urna.`
        : `Faltam ${missingDigits} número${missingDigits === 1 ? "" : "s"}.`;
    }

    if (number.length === 0) {
      return `Digite ${LEGENDA_LENGTH} números para ver o partido, ou ${digitCount} para ver o candidato.`;
    }

    if (number.length < LEGENDA_LENGTH) {
      return `Falta${missingForParty === 1 ? "" : "m"} ${missingForParty} número${
        missingForParty === 1 ? "" : "s"
      } para ver o partido.`;
    }

    return `Faltam ${missingDigits} para o candidato, ou confirme o partido abaixo.`;
  }

  return (
    <div>
      <div className="p-4 sm:p-5">
        <p className="text-base font-bold text-ink">Como você quer escolher?</p>
        <p className="mt-1 text-sm leading-5 text-muted">
          A forma mais fácil é procurar pelo nome na lista.
        </p>

        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={() => setPickerMode("candidato")}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-accent text-base font-bold text-white transition-colors duration-150 hover:bg-accent-deep"
          >
            <List size={20} aria-hidden="true" />
            Procurar pelo nome
          </button>

          {showsLegenda ? (
            <button
              type="button"
              onClick={() => setPickerMode("legenda")}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-ink/15 bg-white text-base font-bold text-ink transition-colors duration-150 hover:border-ink/40"
            >
              <Flag size={18} aria-hidden="true" />
              Escolher só o partido
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setShowDigits((current) => !current)}
            aria-expanded={showDigits}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-ink/15 bg-white text-base font-bold text-ink transition-colors duration-150 hover:border-ink/40"
          >
            <Keyboard size={18} aria-hidden="true" />
            {showDigits ? "Esconder o teclado de números" : "Digitar o número"}
          </button>
        </div>

        {showDigits ? (
          <div className="mt-5 border-t border-screen-line pt-5">
            <div className="flex items-baseline justify-between gap-3">
              <label
                htmlFor={`numero-${cargo}`}
                className="text-base font-bold text-ink"
              >
                Número na urna
              </label>
              <span className="text-sm font-semibold text-muted">
                {number.length} de {digitCount}
              </span>
            </div>

            <div className="relative mt-3">
              <input
                ref={inputRef}
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
                  const closesPartyBlock =
                    showsLegenda && index === LEGENDA_LENGTH - 1;

                  return (
                    <span
                      key={index}
                      className={`flex h-16 max-w-16 flex-1 items-center justify-center rounded-xl border-2 bg-white font-mono text-3xl font-bold text-ink transition-colors duration-150 ${
                        isActive ? "border-accent" : "border-screen-line"
                      } ${closesPartyBlock ? "mr-2 sm:mr-3" : ""}`}
                    >
                      {digit ||
                        (isActive ? (
                          <span className="digit-caret h-8 w-0.5 bg-accent" />
                        ) : null)}
                    </span>
                  );
                })}
              </div>
              {showsLegenda ? (
                <p className="mt-3 text-sm leading-5 text-muted">
                  Os 2 primeiros números são do partido.
                </p>
              ) : null}
            </div>

            <p
              id={`hint-${cargo}`}
              className="mt-3 text-sm leading-5 text-muted"
            >
              {hintText()}
            </p>

            {error ? (
              <p
                role="alert"
                className="mt-3 rounded-xl border-2 border-coral bg-coral/15 px-4 py-3 text-sm font-semibold leading-6 text-coral-ink"
              >
                {error}
              </p>
            ) : null}

            {loading ? (
              <div className="mt-4">
                <CandidateSkeleton />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {showDigits && legendaLoading ? (
        <div className="border-t-2 border-screen-line p-4 sm:p-5">
          <CandidateSkeleton legenda />
        </div>
      ) : showDigits && legendaError && number.length === LEGENDA_LENGTH ? (
        <p className="border-t-2 border-screen-line px-4 py-4 text-sm leading-6 text-muted sm:px-5">
          {legendaError}
        </p>
      ) : showDigits && legenda ? (
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
