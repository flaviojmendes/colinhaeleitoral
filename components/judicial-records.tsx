"use client";

import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileSearch,
  LoaderCircle,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";

import type {
  CertidaoCandidato,
  DataJudResponse,
  DataJudTribunalResult,
} from "@/lib/types";

interface JudicialRecordsProps {
  nome: string;
  uf: string;
  certidoes?: CertidaoCandidato[];
}

function formatDate(value: string | null) {
  if (!value) {
    return "Data não informada";
  }

  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value,
  );
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("pt-BR").format(date);
}

function TribunalResults({ tribunal }: { tribunal: DataJudTribunalResult }) {
  return (
    <section className="border-t border-line p-4 first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-xs font-black uppercase tracking-widest text-ink">
            {tribunal.nome}
          </h4>
          <p className="mt-1 text-[11px] text-muted">
            {tribunal.disponivel
              ? `${tribunal.totalEncontrado} processo${
                  tribunal.totalEncontrado === 1 ? "" : "s"
                } encontrado${tribunal.totalEncontrado === 1 ? "" : "s"}`
              : "Consulta indisponível"}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${
            tribunal.disponivel
              ? "bg-accent/10 text-accent"
              : "bg-amber-50 text-amber-900"
          }`}
        >
          {tribunal.disponivel ? "Consultado" : "Indisponível"}
        </span>
      </div>

      {!tribunal.disponivel ? (
        <p className="mt-3 text-xs leading-5 text-muted">
          {tribunal.erro ?? "O tribunal não respondeu à consulta."}
        </p>
      ) : tribunal.processos.length === 0 ? (
        <p className="mt-3 text-xs leading-5 text-muted">
          Nenhum processo correspondente foi retornado. Isso não substitui uma
          certidão oficial.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line/70">
          {tribunal.processos.map((processo) => (
            <li key={processo.id} className="py-3 first:pt-0 last:pb-0">
              <p className="font-mono text-xs font-bold tracking-wide text-ink">
                {processo.numeroProcesso}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {processo.classe ? (
                  <span className="rounded-md bg-white px-2 py-1 text-[10px] font-bold text-ink">
                    {processo.classe}
                  </span>
                ) : null}
                {processo.poloCandidato ? (
                  <span className="rounded-md bg-white px-2 py-1 text-[10px] font-bold text-muted">
                    Polo: {processo.poloCandidato}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-[11px] font-medium text-muted">
                Ajuizado em {formatDate(processo.dataAjuizamento)}
              </p>
              {processo.assuntos.length > 0 ? (
                <p className="mt-1 text-[11px] leading-4 text-muted">
                  {processo.assuntos.slice(0, 3).join(" · ")}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function JudicialRecords({
  nome,
  uf,
  certidoes = [],
}: JudicialRecordsProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DataJudResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (!nextOpen || result || loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams({ uf, nome });
      const response = await fetch(`/api/processos?${query}`);
      const payload = (await response.json().catch(() => ({}))) as
        | DataJudResponse
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Não foi possível consultar os processos.",
        );
      }

      setResult(payload as DataJudResponse);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível consultar os processos.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-4 mb-4 overflow-hidden rounded-xl border border-line bg-paper">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-paper-deep/50"
      >
        <span className="flex min-w-0 items-center gap-2">
          <FileSearch className="shrink-0 text-accent" size={17} aria-hidden="true" />
          <span className="text-xs font-bold text-accent">
            Consultar processos judiciais
          </span>
        </span>
        {open ? (
          <ChevronUp className="shrink-0 text-muted" size={17} aria-hidden="true" />
        ) : (
          <ChevronDown className="shrink-0 text-muted" size={17} aria-hidden="true" />
        )}
      </button>

      {open ? (
        <div className="border-t border-line">
          <div className="flex items-start gap-2 bg-amber-50 px-4 py-3 text-[11px] leading-5 text-amber-900">
            <ShieldAlert className="mt-0.5 shrink-0" size={15} aria-hidden="true" />
            <p>
              Busca pública por nome nos tribunais da UF. Homônimos podem
              gerar resultados incorretos; isto não é uma certidão nem prova
              de culpa.
            </p>
          </div>

          {certidoes.length > 0 ? (
            <section className="border-b border-line p-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-ink">
                Certidões apresentadas ao TSE
              </h4>
              <ul className="mt-3 space-y-2">
                {certidoes.map((certidao) => (
                  <li key={certidao.id}>
                    <a
                      href={certidao.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-h-10 items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-xs font-bold text-accent hover:bg-accent/5"
                    >
                      {certidao.nome}
                      <ExternalLink
                        className="shrink-0"
                        size={14}
                        aria-hidden="true"
                      />
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] leading-4 text-muted">
                Os documentos são publicados pelo TSE e abrem em uma nova
                aba.
              </p>
            </section>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-xs font-semibold text-muted">
              <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />
              Consultando TJ e TRF…
            </div>
          ) : error ? (
            <p className="px-4 py-6 text-center text-xs font-semibold leading-5 text-red-800">
              {error}
            </p>
          ) : result ? (
            result.tribunais.map((tribunal) => (
              <TribunalResults key={tribunal.alias} tribunal={tribunal} />
            ))
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
