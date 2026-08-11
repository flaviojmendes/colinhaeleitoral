"use client";

import {
  ArrowLeft,
  ChevronRight,
  LoaderCircle,
  Search,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { getCargoConfig } from "@/lib/cargos";
import type {
  CandidateListItem,
  CargoSlug,
  CandidatoColinha,
} from "@/lib/types";

import { CandidateCard } from "./candidate-card";

interface CandidatePickerProps {
  cargo: CargoSlug;
  uf: string;
  onConfirm: (candidate: CandidatoColinha) => void;
  onClose: () => void;
}

const PAGE_SIZE = 60;

export function CandidatePicker({
  cargo,
  uf,
  onConfirm,
  onClose,
}: CandidatePickerProps) {
  const config = getCargoConfig(cargo, uf);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previewControllerRef = useRef<AbortController | null>(null);
  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewCandidate, setPreviewCandidate] =
    useState<CandidatoColinha | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCandidates() {
      try {
        const query = new URLSearchParams({
          uf,
          cargo,
          lista: "true",
        });
        const response = await fetch(`/api/candidatos?${query}`, {
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => ({}))) as {
          candidatos?: CandidateListItem[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(
            payload.error ?? "Não foi possível carregar os candidatos.",
          );
        }

        setCandidates(payload.candidatos ?? []);
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name === "AbortError") {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Não foi possível carregar os candidatos.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadCandidates();
    dialogRef.current?.focus();

    return () => controller.abort();
  }, [cargo, uf]);

  useEffect(() => {
    return () => previewControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const filteredCandidates = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");

    if (!normalizedSearch) {
      return candidates;
    }

    return candidates.filter((candidate) =>
      [candidate.numero, candidate.nomeUrna, candidate.partido].some((value) =>
        value.toLocaleLowerCase("pt-BR").includes(normalizedSearch),
      ),
    );
  }, [candidates, search]);

  const visibleCandidates = filteredCandidates.slice(0, visibleCount);

  function handleSearch(value: string) {
    setSearch(value);
    setVisibleCount(PAGE_SIZE);
  }

  async function handlePreview(candidate: CandidateListItem) {
    previewControllerRef.current?.abort();
    const controller = new AbortController();
    previewControllerRef.current = controller;
    setPreviewCandidate(null);
    setPreviewError(null);
    setPreviewLoading(true);

    try {
      const query = new URLSearchParams({
        uf,
        cargo,
        numero: candidate.numero,
      });
      const response = await fetch(`/api/candidatos?${query}`, {
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      } & Partial<CandidatoColinha>;

      if (!response.ok) {
        throw new Error(
          payload.error ?? "Não foi possível carregar os detalhes.",
        );
      }

      setPreviewCandidate(payload as CandidatoColinha);
    } catch (requestError) {
      if (requestError instanceof Error && requestError.name === "AbortError") {
        return;
      }

      setPreviewError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível carregar os detalhes.",
      );
    } finally {
      if (!controller.signal.aborted) {
        setPreviewLoading(false);
      }
    }
  }

  function returnToList() {
    previewControllerRef.current?.abort();
    setPreviewCandidate(null);
    setPreviewError(null);
    setPreviewLoading(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-0 sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="candidate-picker-title"
        tabIndex={-1}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white text-ink shadow-2xl outline-none sm:max-h-[84vh] sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-5 sm:px-7">
          <div>
            <div className="flex items-center gap-2 text-accent">
              <Users size={18} aria-hidden="true" />
              <span className="text-[10px] font-black uppercase tracking-[0.18em]">
                Escolha pela lista
              </span>
            </div>
            <h2
              id="candidate-picker-title"
              className="mt-2 text-2xl font-black tracking-tighter"
            >
              {previewCandidate ? "Detalhes do candidato" : config.label}
            </h2>
            <p className="mt-1 text-xs text-muted">
              {previewLoading
                ? "Carregando os dados financeiros…"
                : previewCandidate
                  ? "Patrimônio declarado e gastos de campanha"
                  : loading
                    ? "Carregando candidatos do TSE…"
                    : `${filteredCandidates.length} candidato${
                        filteredCandidates.length === 1 ? "" : "s"
                      } encontrado${filteredCandidates.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar lista de candidatos"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line text-muted transition-colors hover:border-ink hover:text-ink"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </div>

        {!previewCandidate && !previewLoading && !previewError ? (
          <div className="border-b border-line bg-paper/60 px-5 py-4 sm:px-7">
            <label htmlFor="candidate-list-search" className="sr-only">
              Buscar candidato por nome, número ou partido
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                size={18}
                aria-hidden="true"
              />
              <input
                id="candidate-list-search"
                type="search"
                value={search}
                onChange={(event) => handleSearch(event.target.value)}
                placeholder="Buscar por nome, número ou partido"
                className="h-12 w-full rounded-xl border border-line bg-white px-11 pr-11 text-sm font-medium text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => handleSearch("")}
                  aria-label="Limpar busca"
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-paper-deep hover:text-ink"
                >
                  <X size={15} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5">
          {previewLoading ? (
            <div className="flex min-h-48 items-center justify-center gap-3 text-sm font-semibold text-muted">
              <LoaderCircle className="animate-spin" size={20} aria-hidden="true" />
              Carregando patrimônio e gastos…
            </div>
          ) : previewError ? (
            <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center">
              <p className="text-sm font-semibold leading-6 text-red-800">
                {previewError}
              </p>
              <button
                type="button"
                onClick={returnToList}
                className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl border border-line px-4 text-sm font-bold text-accent hover:border-accent"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Voltar à lista
              </button>
            </div>
          ) : previewCandidate ? (
            <div className="px-1 pb-2">
              <button
                type="button"
                onClick={returnToList}
                className="mb-1 inline-flex h-10 items-center gap-2 rounded-lg px-2 text-xs font-bold text-muted hover:bg-paper hover:text-ink"
              >
                <ArrowLeft size={15} aria-hidden="true" />
                Voltar à lista
              </button>
              <p className="px-2 text-xs leading-5 text-muted">
                Confira os dados financeiros antes de confirmar este candidato.
              </p>
              <CandidateCard
                candidato={previewCandidate}
                uf={uf}
                onConfirm={() => {
                  onConfirm(previewCandidate);
                  onClose();
                }}
                onClear={returnToList}
                clearLabel="Voltar à lista"
              />
            </div>
          ) : loading ? (
            <div className="flex min-h-48 items-center justify-center gap-3 text-sm font-semibold text-muted">
              <LoaderCircle className="animate-spin" size={20} aria-hidden="true" />
              Consultando candidatos…
            </div>
          ) : error ? (
            <div className="flex min-h-48 items-center justify-center px-5 text-center text-sm font-medium leading-6 text-red-800">
              {error}
            </div>
          ) : visibleCandidates.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center">
              <Search className="text-muted/50" size={28} aria-hidden="true" />
              <p className="mt-3 text-sm font-bold text-ink">
                Nenhum candidato encontrado
              </p>
              <p className="mt-1 text-xs text-muted">
                Tente outro nome, número ou partido.
              </p>
            </div>
          ) : (
            <>
              <ul
                aria-label={`Candidatos para ${config.label}`}
                className="divide-y divide-line/70"
              >
                {visibleCandidates.map((candidate) => (
                  <li key={`${candidate.id}-${candidate.numero}`}>
                    <button
                      type="button"
                      onClick={() => void handlePreview(candidate)}
                      className="flex min-h-17 w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-paper focus:bg-paper sm:px-4"
                    >
                      <span className="flex h-11 min-w-14.5 items-center justify-center rounded-lg bg-accent/10 px-2 font-mono text-sm font-black tracking-wider text-accent">
                        {candidate.numero}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-extrabold text-ink">
                          {candidate.nomeUrna}
                        </span>
                        <span className="mt-1 block truncate text-xs font-medium text-muted">
                          {candidate.partido}
                          {candidate.situacao ? ` · ${candidate.situacao}` : ""}
                        </span>
                      </span>
                      <ChevronRight
                        className="shrink-0 text-muted"
                        size={18}
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                ))}
              </ul>

              {visibleCount < filteredCandidates.length ? (
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  className="mx-auto mt-3 flex h-11 items-center justify-center rounded-xl border border-line px-5 text-xs font-bold text-accent hover:border-accent hover:bg-accent/5"
                >
                  Mostrar mais candidatos
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
