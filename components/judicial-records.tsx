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
  needsRefresh?: boolean;
  onRefresh?: () => Promise<void>;
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
    <section className="border-t border-screen-line px-4 py-4 first:border-t-0 sm:px-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold text-ink">{tribunal.nome}</h4>
          <p className="mt-1 text-[11px] text-muted">
            {tribunal.disponivel
              ? `${tribunal.totalEncontrado} processo${
                  tribunal.totalEncontrado === 1 ? "" : "s"
                } encontrado${tribunal.totalEncontrado === 1 ? "" : "s"}`
              : "Consulta indisponível"}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-md px-2 py-1 font-mono text-[10px] tracking-widest ${
            tribunal.disponivel
              ? "bg-accent text-white"
              : "bg-coral text-coral-ink"
          }`}
        >
          {tribunal.disponivel ? "CONSULTADO" : "INDISPONÍVEL"}
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
        <ul className="mt-3 divide-y divide-screen-line">
          {tribunal.processos.map((processo) => (
            <li key={processo.id} className="py-3 first:pt-0 last:pb-0">
              <p className="font-mono text-xs font-bold tracking-wide text-ink">
                {processo.numeroProcesso}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {processo.classe ? (
                  <span className="rounded-md bg-screen px-2 py-1 text-[10px] font-bold text-ink">
                    {processo.classe}
                  </span>
                ) : null}
                {processo.poloCandidato ? (
                  <span className="rounded-md bg-screen px-2 py-1 text-[10px] font-bold text-muted">
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

interface CertificateGroupData {
  key: string;
  label: string;
  documents: CertidaoCandidato[];
}

function groupCertificates(
  certidoes: CertidaoCandidato[],
): CertificateGroupData[] {
  const groups = new Map<string, CertificateGroupData>();

  certidoes.forEach((certidao) => {
    const label = certidao.grupo ?? "Documentos do TSE";
    const key =
      label
        .toLocaleLowerCase("pt-BR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "documentos-tse";
    const group = groups.get(key) ?? {
      key,
      label,
      documents: [],
    };
    group.documents.push(certidao);
    groups.set(key, group);
  });

  return Array.from(groups.values());
}

function CertificateGroup({
  group,
  initiallyOpen,
}: {
  group: CertificateGroupData;
  initiallyOpen: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [showAll, setShowAll] = useState(false);
  const visibleDocuments = showAll
    ? group.documents
    : group.documents.slice(0, 3);

  return (
    <div className="border-t border-screen-line first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={`certificate-group-${group.key}`}
        className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-screen sm:px-5"
      >
        <span className="min-w-0">
          <span className="block text-xs font-bold text-ink">{group.label}</span>
          <span className="mt-1 block text-[11px] text-muted">
            {group.documents.length}{" "}
            {group.documents.length === 1 ? "documento" : "documentos"}
          </span>
        </span>
        <ChevronDown
          className={`shrink-0 text-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
          size={17}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          id={`certificate-group-${group.key}`}
          className="px-4 pb-4 sm:px-5"
        >
          <ul className="space-y-2">
            {visibleDocuments.map((certidao, index) => {
              const genericTitle =
                certidao.nome === "Certidão apresentada ao TSE" ||
                certidao.nome === "Documento sem título detalhado";
              const title = genericTitle
                ? `Documento ${index + 1} do grupo`
                : certidao.nome;
              const description =
                certidao.descricao ??
                "Documento publicado no registro da candidatura.";

              return (
                <li key={certidao.id}>
                  <a
                    href={certidao.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-screen-line bg-screen px-3 py-2.5 text-left transition-colors duration-150 hover:border-accent"
                  >
                    <span className="min-w-0">
                      <span className="block wrap-break-word text-xs font-bold text-accent">
                        {title}
                      </span>
                      <span className="mt-1 block text-[11px] leading-4 text-muted">
                        {description}
                      </span>
                      <span className="mt-1 block truncate font-mono text-[10px] text-muted/80">
                        {certidao.arquivo
                          ? certidao.arquivo
                          : `Arquivo TSE #${certidao.id}`}
                      </span>
                    </span>
                    <ExternalLink
                      className="shrink-0 text-accent"
                      size={14}
                      aria-hidden="true"
                    />
                  </a>
                </li>
              );
            })}
          </ul>

          {group.documents.length > 3 ? (
            <button
              type="button"
              onClick={() => setShowAll((current) => !current)}
              className="mt-3 flex min-h-11 w-full items-center justify-center rounded-lg border-2 border-ink/15 px-3 text-xs font-bold text-ink transition-colors duration-150 hover:border-ink/40"
            >
              {showAll
                ? "Mostrar menos"
                : `Ver mais ${group.documents.length - 3} documentos`}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CertificateExplorer({
  certidoes,
}: {
  certidoes: CertidaoCandidato[];
}) {
  const groups = groupCertificates(certidoes);

  return (
    <section className="border-b border-screen-line">
      <div className="px-4 py-4 sm:px-5">
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="text-xs font-bold text-ink">
            Documentos publicados pelo TSE
          </h4>
          <span className="shrink-0 font-mono text-[10px] tracking-widest text-muted">
            {certidoes.length} ITENS
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-4 text-muted">
          Organizados por categoria para você identificar o conteúdo antes de
          abrir o PDF.
        </p>
      </div>
      {groups.map((group, index) => (
        <CertificateGroup
          key={group.key}
          group={group}
          initiallyOpen={index === 0}
        />
      ))}
    </section>
  );
}

export function JudicialRecords({
  nome,
  uf,
  certidoes = [],
  needsRefresh = false,
  onRefresh,
}: JudicialRecordsProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshingCandidate, setRefreshingCandidate] = useState(false);
  const [result, setResult] = useState<DataJudResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (!nextOpen || result || loading) {
      return;
    }

    setError(null);

    if (needsRefresh && onRefresh) {
      setLoading(true);
      setRefreshingCandidate(true);

      try {
        await onRefresh();
      } catch (refreshRequestError) {
        setError(
          refreshRequestError instanceof Error
            ? refreshRequestError.message
            : "Não foi possível carregar os documentos do TSE.",
        );
        setLoading(false);
        return;
      } finally {
        setRefreshingCandidate(false);
      }
    }

    setLoading(true);

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
    <div className="border-t border-screen-line">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-white sm:px-5"
      >
        <span className="flex min-w-0 items-center gap-2">
          <FileSearch className="shrink-0 text-muted" size={17} aria-hidden="true" />
          <span className="text-xs font-bold text-ink">
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
        <div className="border-t border-screen-line bg-white">
          <div className="flex items-start gap-2 bg-coral/15 px-4 py-3 text-[11px] leading-5 text-coral-ink sm:px-5">
            <ShieldAlert className="mt-0.5 shrink-0" size={15} aria-hidden="true" />
            <p>
              Busca pública por nome nos tribunais da UF. Homônimos podem
              gerar resultados incorretos; isto não é uma certidão nem prova
              de culpa.
            </p>
          </div>

          {certidoes.length > 0 ? (
            <CertificateExplorer certidoes={certidoes} />
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-xs font-semibold text-muted">
              <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />
              {refreshingCandidate
                ? "Carregando documentos do TSE…"
                : "Consultando TJ e TRF…"}
            </div>
          ) : error ? (
            <p
              role="alert"
              className="border-t border-screen-line px-4 py-6 text-center text-xs font-semibold leading-5 text-coral-ink sm:px-5"
            >
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
