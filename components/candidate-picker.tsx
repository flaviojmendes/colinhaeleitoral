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
  PartidoListItem,
  TipoVoto,
} from "@/lib/types";

import { CandidateCard } from "./candidate-card";

interface CandidatePickerProps {
  cargo: CargoSlug;
  uf: string;
  modo?: TipoVoto;
  onConfirm: (candidate: CandidatoColinha) => void;
  onClose: () => void;
}

interface PickerItem {
  key: string;
  numero: string;
  titulo: string;
  subtitulo: string;
  busca: string;
}

const PAGE_SIZE = 60;

function toCandidateItem(candidate: CandidateListItem): PickerItem {
  return {
    key: `${candidate.id}-${candidate.numero}`,
    numero: candidate.numero,
    titulo: candidate.nomeUrna,
    subtitulo: candidate.situacao
      ? `${candidate.partido} · ${candidate.situacao}`
      : candidate.partido,
    busca: `${candidate.numero} ${candidate.nomeUrna} ${candidate.partido}`,
  };
}

function toPartyItem(party: PartidoListItem): PickerItem {
  return {
    key: `partido-${party.numero}`,
    numero: party.numero,
    titulo: party.sigla,
    subtitulo: `${party.nome} · ${party.totalCandidatos} candidato${
      party.totalCandidatos === 1 ? "" : "s"
    }`,
    busca: `${party.numero} ${party.sigla} ${party.nome}`,
  };
}

export function CandidatePicker({
  cargo,
  uf,
  modo = "candidato",
  onConfirm,
  onClose,
}: CandidatePickerProps) {
  const config = getCargoConfig(cargo, uf);
  const isLegenda = modo === "legenda";
  const dialogRef = useRef<HTMLDivElement>(null);
  const previewControllerRef = useRef<AbortController | null>(null);
  const [items, setItems] = useState<PickerItem[]>([]);
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

    async function loadItems() {
      try {
        const query = new URLSearchParams({ uf, cargo });
        query.set(isLegenda ? "partidos" : "lista", "true");

        const response = await fetch(`/api/candidatos?${query}`, {
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => ({}))) as {
          candidatos?: CandidateListItem[];
          partidos?: PartidoListItem[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(
            payload.error ??
              (isLegenda
                ? "Não foi possível carregar os partidos."
                : "Não foi possível carregar os candidatos."),
          );
        }

        setItems(
          isLegenda
            ? (payload.partidos ?? []).map(toPartyItem)
            : (payload.candidatos ?? []).map(toCandidateItem),
        );
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name === "AbortError") {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Não foi possível carregar a lista.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadItems();
    dialogRef.current?.focus();

    return () => controller.abort();
  }, [cargo, isLegenda, uf]);

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

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");

    if (!normalizedSearch) {
      return items;
    }

    return items.filter((item) =>
      item.busca.toLocaleLowerCase("pt-BR").includes(normalizedSearch),
    );
  }, [items, search]);

  const visibleItems = filteredItems.slice(0, visibleCount);

  function handleSearch(value: string) {
    setSearch(value);
    setVisibleCount(PAGE_SIZE);
  }

  async function handlePreview(item: PickerItem) {
    previewControllerRef.current?.abort();
    const controller = new AbortController();
    previewControllerRef.current = controller;
    setPreviewCandidate(null);
    setPreviewError(null);
    setPreviewLoading(true);

    try {
      const query = new URLSearchParams({ uf, cargo, numero: item.numero });
      if (isLegenda) {
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

  const countLabel = isLegenda
    ? `${filteredItems.length} partido${filteredItems.length === 1 ? "" : "s"}`
    : `${filteredItems.length} candidato${
        filteredItems.length === 1 ? "" : "s"
      } encontrado${filteredItems.length === 1 ? "" : "s"}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-console-deep/80 p-0 sm:items-center sm:p-5"
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
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-console-edge bg-console p-2 text-ink outline-none sm:max-h-[84vh] sm:rounded-2xl sm:p-2.5"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-screen">
          <div className="flex items-start justify-between gap-4 border-b border-screen-line px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-muted">
                <Users size={14} aria-hidden="true" />
                {isLegenda ? "VOTO DE LEGENDA" : "ESCOLHA PELA LISTA"}
              </p>
              <h2
                id="candidate-picker-title"
                className="mt-1.5 truncate text-xl font-black tracking-tight"
              >
                {previewCandidate
                  ? isLegenda
                    ? "Detalhes do partido"
                    : "Detalhes do candidato"
                  : isLegenda
                    ? `Partidos · ${config.label}`
                    : config.label}
              </h2>
              <p className="mt-1 text-xs text-muted">
                {previewLoading
                  ? "Carregando os dados financeiros…"
                  : previewCandidate
                    ? "Prestação de contas publicada pelo TSE"
                    : loading
                      ? "Carregando dados do TSE…"
                      : countLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={
                isLegenda ? "Fechar lista de partidos" : "Fechar lista de candidatos"
              }
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 border-ink/15 text-muted transition-colors duration-150 hover:border-ink/40 hover:text-ink"
            >
              <X size={19} aria-hidden="true" />
            </button>
          </div>

          {!previewCandidate && !previewLoading && !previewError ? (
            <div className="border-b border-screen-line px-4 py-3 sm:px-5">
              <label htmlFor="candidate-list-search" className="sr-only">
                {isLegenda
                  ? "Buscar partido por nome ou número"
                  : "Buscar candidato por nome, número ou partido"}
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
                  placeholder={
                    isLegenda
                      ? "Buscar por sigla, nome ou número"
                      : "Buscar por nome, número ou partido"
                  }
                  className="h-12 w-full rounded-lg border-2 border-screen-line bg-white px-11 pr-11 text-sm font-medium text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => handleSearch("")}
                    aria-label="Limpar busca"
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:bg-screen hover:text-ink"
                  >
                    <X size={15} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {previewLoading ? (
              <div className="flex min-h-48 items-center justify-center gap-3 text-sm font-semibold text-muted">
                <LoaderCircle className="animate-spin" size={20} aria-hidden="true" />
                Carregando dados financeiros…
              </div>
            ) : previewError ? (
              <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center">
                <p
                  role="alert"
                  className="text-sm font-semibold leading-6 text-coral-ink"
                >
                  {previewError}
                </p>
                <button
                  type="button"
                  onClick={returnToList}
                  className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg border-2 border-ink/15 px-4 text-sm font-bold text-ink transition-colors duration-150 hover:border-ink/40"
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                  Voltar à lista
                </button>
              </div>
            ) : previewCandidate ? (
              <div>
                <div className="border-b border-screen-line px-4 py-3 sm:px-5">
                  <button
                    type="button"
                    onClick={returnToList}
                    className="inline-flex h-10 items-center gap-2 rounded-md pr-2 text-xs font-bold text-muted transition-colors duration-150 hover:text-ink"
                  >
                    <ArrowLeft size={15} aria-hidden="true" />
                    Voltar à lista
                  </button>
                  <p className="text-xs leading-5 text-muted">
                    {isLegenda
                      ? "Confira o partido antes de adicionar à sua colinha."
                      : "Confira os dados antes de confirmar este candidato."}
                  </p>
                </div>
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
                {isLegenda ? "Consultando partidos…" : "Consultando candidatos…"}
              </div>
            ) : error ? (
              <div
                role="alert"
                className="flex min-h-48 items-center justify-center px-5 text-center text-sm font-semibold leading-6 text-coral-ink"
              >
                {error}
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center">
                <Search className="text-line" size={28} aria-hidden="true" />
                <p className="mt-3 text-sm font-bold text-ink">
                  {isLegenda
                    ? "Nenhum partido encontrado"
                    : "Nenhum candidato encontrado"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Tente outro nome ou número.
                </p>
              </div>
            ) : (
              <>
                <ul
                  aria-label={
                    isLegenda
                      ? `Partidos para ${config.label}`
                      : `Candidatos para ${config.label}`
                  }
                  className="divide-y divide-screen-line"
                >
                  {visibleItems.map((item) => (
                    <li key={item.key}>
                      <button
                        type="button"
                        onClick={() => void handlePreview(item)}
                        className="flex min-h-17 w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-white focus:bg-white sm:px-5"
                      >
                        <span className="flex h-11 min-w-14.5 items-center justify-center rounded-md border-2 border-screen-line bg-white px-2 font-mono text-sm font-bold tracking-wider text-ink">
                          {item.numero}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-ink">
                            {item.titulo}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted">
                            {item.subtitulo}
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

                {visibleCount < filteredItems.length ? (
                  <div className="border-t border-screen-line p-4 sm:px-5">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                      className="flex h-11 w-full items-center justify-center rounded-lg border-2 border-ink/15 px-5 text-xs font-bold text-ink transition-colors duration-150 hover:border-ink/40"
                    >
                      Mostrar mais
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
