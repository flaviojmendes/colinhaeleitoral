"use client";

import Image from "next/image";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Flag,
  RotateCcw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useState } from "react";

import { getCargoConfig } from "@/lib/cargos";
import { formatBRL } from "@/lib/format";
import type { CandidatoColinha } from "@/lib/types";

import { CandidateNews } from "./candidate-news";
import { JudicialRecords } from "./judicial-records";

interface CandidateCardProps {
  candidato: CandidatoColinha;
  uf: string;
  confirmed?: boolean;
  onConfirm?: () => void;
  onClear: () => void;
  clearLabel?: string;
  onRefresh?: () => Promise<void>;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function isApproved(status?: string) {
  return Boolean(status && /deferid|apto|concorrendo/i.test(status));
}

export function CandidateCard({
  candidato,
  uf,
  confirmed = false,
  onConfirm,
  onClear,
  clearLabel = "Corrigir",
  onRefresh,
}: CandidateCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const cargoLabel = getCargoConfig(candidato.cargo, uf).label;
  const isLegenda = candidato.tipoVoto === "legenda";
  const needsRefresh = isLegenda
    ? candidato.gastosPartido === undefined
    : candidato.patrimonioDetalhes === undefined ||
      candidato.gastosDetalhes === undefined ||
      candidato.gastosPartido === undefined ||
      candidato.certidoes === undefined ||
      candidato.certidoes.some(
        (certidao) => !certidao.grupo || !certidao.descricao,
      );

  async function handleDetailsToggle() {
    const nextVisible = !showDetails;
    setShowDetails(nextVisible);

    if (!nextVisible || !needsRefresh || !onRefresh) {
      return;
    }

    setRefreshing(true);
    setRefreshError(null);
    try {
      await onRefresh();
    } catch (error) {
      setRefreshError(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar os detalhes.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  if (isLegenda) {
    return (
      <div>
        <div className="p-4 sm:p-5">
          <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-muted">
            <Flag size={13} aria-hidden="true" />
            VOTO DE LEGENDA
          </p>

          <dl className="mt-3">
            <div>
              <dt className="font-mono text-[10px] tracking-widest text-muted">
                NÚMERO DO PARTIDO
              </dt>
              <dd className="mt-1 font-mono text-3xl font-bold leading-none tracking-widest text-ink sm:text-4xl">
                {candidato.numero}
              </dd>
            </div>
            <div className="mt-3.5">
              <dt className="font-mono text-[10px] tracking-widest text-muted">
                PARTIDO
              </dt>
              <dd className="mt-0.5 text-lg font-bold tracking-tight text-ink">
                {candidato.partido}
              </dd>
              {candidato.nomeUrna !== candidato.partido ? (
                <dd className="mt-0.5 text-sm text-muted">
                  {candidato.nomeUrna}
                </dd>
              ) : null}
            </div>
            <div className="mt-2.5">
              <dt className="font-mono text-[10px] tracking-widest text-muted">
                CARGO
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-muted">
                {cargoLabel}
                {candidato.candidatosNoPartido
                  ? ` · ${candidato.candidatosNoPartido} candidato${
                      candidato.candidatosNoPartido === 1 ? "" : "s"
                    } na UF`
                  : ""}
              </dd>
            </div>
          </dl>

          <p className="mt-3.5 text-xs leading-5 text-muted">
            O voto vai para o partido, que o usa para eleger seus candidatos
            mais votados. Você não escolhe uma pessoa específica.
          </p>
        </div>

        <div className="grid grid-cols-2 border-t border-screen-line bg-white">
          <div className="min-w-0 px-4 py-3 sm:px-5">
            <p className="font-mono text-[10px] tracking-widest text-muted">
              GASTOS CONTRATADOS
            </p>
            <p className="mt-1 truncate text-sm font-bold text-ink">
              {formatBRL(candidato.gastosPartido?.totalContratado)}
            </p>
          </div>
          <div className="min-w-0 border-l border-screen-line px-4 py-3 sm:px-5">
            <p className="font-mono text-[10px] tracking-widest text-muted">
              GASTOS PAGOS
            </p>
            <p className="mt-1 truncate text-sm font-bold text-ink">
              {formatBRL(candidato.gastosPartido?.totalPago)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleDetailsToggle()}
          aria-expanded={showDetails}
          disabled={refreshing}
          className="flex min-h-12 w-full items-center justify-between gap-3 border-t border-screen-line px-4 py-3 text-left text-xs font-bold text-ink transition-colors duration-150 hover:bg-white sm:px-5"
        >
          {showDetails
            ? "Ocultar contas do partido"
            : "Ver contas do partido"}
          <ChevronDown
            className={`shrink-0 text-muted transition-transform duration-150 ${
              showDetails ? "rotate-180" : ""
            }`}
            size={17}
            aria-hidden="true"
          />
        </button>

        {showDetails ? (
          refreshing ? (
            <p className="border-t border-screen-line px-4 py-5 text-center text-xs font-semibold text-muted sm:px-5">
              Atualizando as contas do partido no TSE…
            </p>
          ) : refreshError ? (
            <p className="border-t border-screen-line bg-coral/15 px-4 py-5 text-center text-xs font-semibold leading-5 text-coral-ink sm:px-5">
              {refreshError}
            </p>
          ) : (
            <div className="bg-white">
              <PartyExpenses candidato={candidato} />
            </div>
          )
        ) : null}

        <ActionRow
          confirmed={confirmed}
          clearLabel={clearLabel}
          confirmLabel="Confirmar legenda"
          note="Confirmar apenas adiciona esta legenda à sua lista impressa."
          onClear={onClear}
          onConfirm={onConfirm}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 p-4 sm:p-5">
        <dl className="min-w-0 flex-1">
          <div>
            <dt className="font-mono text-[10px] tracking-widest text-muted">
              NÚMERO
            </dt>
            <dd className="mt-1 font-mono text-3xl font-bold leading-none tracking-widest text-ink sm:text-4xl">
              {candidato.numero}
            </dd>
          </div>
          <div className="mt-3.5">
            <dt className="font-mono text-[10px] tracking-widest text-muted">
              NOME
            </dt>
            <dd className="mt-0.5 truncate text-lg font-bold tracking-tight text-ink">
              {candidato.nomeUrna}
            </dd>
          </div>
          <div className="mt-2.5">
            <dt className="font-mono text-[10px] tracking-widest text-muted">
              PARTIDO
            </dt>
            <dd className="mt-0.5 truncate text-sm font-semibold text-ink">
              {candidato.partido}
            </dd>
          </div>
          <div className="mt-2.5">
            <dt className="font-mono text-[10px] tracking-widest text-muted">
              CARGO
            </dt>
            <dd className="mt-0.5 truncate text-sm font-medium text-muted">
              {cargoLabel}
            </dd>
          </div>
        </dl>

        <div className="relative flex h-32 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border-2 border-screen-line bg-white text-2xl font-bold text-muted">
          {candidato.fotoUrl && !imageFailed ? (
            <Image
              key={candidato.fotoUrl}
              src={candidato.fotoUrl}
              alt={`Foto de ${candidato.nomeUrna}`}
              fill
              sizes="96px"
              className="object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <>
              <UserRound
                className="absolute text-line"
                size={64}
                strokeWidth={1}
                aria-hidden="true"
              />
              <span className="relative">{initials(candidato.nomeUrna)}</span>
            </>
          )}
        </div>
      </div>

      {candidato.situacao && !isApproved(candidato.situacao) ? (
        <p className="flex items-start gap-2 border-t border-screen-line bg-coral/15 px-4 py-3 text-xs leading-5 text-coral-ink sm:px-5">
          <AlertTriangle className="mt-0.5 shrink-0" size={15} aria-hidden="true" />
          <span>
            Situação no TSE: <strong>{candidato.situacao}</strong>
          </span>
        </p>
      ) : null}

      <div className="grid grid-cols-2 border-t border-screen-line bg-white">
        <div className="min-w-0 px-4 py-3 sm:px-5">
          <p className="font-mono text-[10px] tracking-widest text-muted">
            PATRIMÔNIO
          </p>
          <p className="mt-1 truncate text-sm font-bold text-ink">
            {formatBRL(candidato.patrimonioDeclarado)}
          </p>
        </div>
        <div className="min-w-0 border-l border-screen-line px-4 py-3 sm:px-5">
          <p className="font-mono text-[10px] tracking-widest text-muted">
            GASTOS
          </p>
          <p className="mt-1 truncate text-sm font-bold text-ink">
            {formatBRL(candidato.totalGastos)}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void handleDetailsToggle()}
        aria-expanded={showDetails}
        disabled={refreshing}
        className="flex min-h-12 w-full items-center justify-between gap-3 border-t border-screen-line px-4 py-3 text-left text-xs font-bold text-ink transition-colors duration-150 hover:bg-white sm:px-5"
      >
        {showDetails ? "Ocultar detalhes financeiros" : "Ver detalhes financeiros"}
        <ChevronDown
          className={`shrink-0 text-muted transition-transform duration-150 ${
            showDetails ? "rotate-180" : ""
          }`}
          size={17}
          aria-hidden="true"
        />
      </button>

      {showDetails ? (
        refreshing ? (
          <p className="border-t border-screen-line px-4 py-5 text-center text-xs font-semibold text-muted sm:px-5">
            Atualizando patrimônio e gastos no TSE…
          </p>
        ) : refreshError ? (
          <p className="border-t border-screen-line bg-coral/15 px-4 py-5 text-center text-xs font-semibold leading-5 text-coral-ink sm:px-5">
            {refreshError}
          </p>
        ) : (
          <FinancialDetails candidato={candidato} />
        )
      ) : null}

      <CandidateNews nome={candidato.nomeUrna} />

      <JudicialRecords
        nome={candidato.nomeCompleto ?? candidato.nomeUrna}
        uf={uf}
        certidoes={candidato.certidoes}
        needsRefresh={needsRefresh}
        onRefresh={onRefresh}
      />

      <ActionRow
        confirmed={confirmed}
        clearLabel={clearLabel}
        confirmLabel="Confirmar candidato"
        note="Confirmar apenas adiciona o candidato à sua lista impressa."
        onClear={onClear}
        onConfirm={onConfirm}
      />
    </div>
  );
}

function ActionRow({
  confirmed,
  clearLabel,
  confirmLabel,
  note,
  onClear,
  onConfirm,
}: {
  confirmed: boolean;
  clearLabel: string;
  confirmLabel: string;
  note: string;
  onClear: () => void;
  onConfirm?: () => void;
}) {
  return (
    <div className="border-t border-screen-line bg-screen-deep p-3 sm:p-4">
      {confirmed ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-xs font-bold text-accent-deep">
            <ShieldCheck size={17} aria-hidden="true" />
            Salvo na sua colinha
          </p>
          <button
            type="button"
            onClick={onClear}
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-coral px-4 text-sm font-bold text-coral-ink transition-colors duration-150 hover:bg-coral-deep"
          >
            <RotateCcw size={16} aria-hidden="true" />
            {clearLabel}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <button
              type="button"
              onClick={onClear}
              className="flex h-13 items-center justify-center gap-2 rounded-lg bg-coral px-4 text-sm font-bold text-coral-ink transition-colors duration-150 hover:bg-coral-deep"
            >
              <RotateCcw size={16} aria-hidden="true" />
              {clearLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex h-13 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-accent-deep"
            >
              <Check size={18} strokeWidth={3} aria-hidden="true" />
              {confirmLabel}
            </button>
          </div>
          <p className="mt-2.5 text-center text-[11px] leading-4 text-muted">
            {note}
          </p>
        </>
      )}
    </div>
  );
}

function FinancialDetails({ candidato }: { candidato: CandidatoColinha }) {
  const assets = candidato.patrimonioDetalhes ?? [];
  const expenses = candidato.gastosDetalhes ?? [];
  const hasExpenseTotals =
    candidato.totalGastosPagos !== undefined ||
    candidato.limiteGastos !== undefined;

  return (
    <div className="bg-white">
      <section className="border-t border-screen-line px-4 py-4 sm:px-5">
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="text-xs font-bold text-ink">Patrimônio declarado</h4>
          <span className="font-mono text-[10px] tracking-widest text-muted">
            {assets.length} {assets.length === 1 ? "ITEM" : "ITENS"}
          </span>
        </div>
        {assets.length > 0 ? (
          <ul className="mt-3 divide-y divide-screen-line">
            {assets.map((asset, index) => (
              <li
                key={`${asset.descricao}-${index}`}
                className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
              >
                <span className="min-w-0">
                  <span className="block text-xs leading-5 text-ink">
                    {asset.descricao}
                  </span>
                  {asset.tipo ? (
                    <span className="mt-0.5 block text-[11px] leading-4 text-muted">
                      {asset.tipo}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-right font-mono text-xs font-bold text-ink">
                  {formatBRL(asset.valor)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs leading-5 text-muted">
            O TSE não publicou os bens detalhados deste candidato.
          </p>
        )}
      </section>

      <section className="border-t border-screen-line px-4 py-4 sm:px-5">
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="text-xs font-bold text-ink">Gastos de campanha</h4>
          <span className="font-mono text-[10px] tracking-widest text-muted">
            {expenses.length}{" "}
            {expenses.length === 1 ? "CATEGORIA" : "CATEGORIAS"}
          </span>
        </div>
        {hasExpenseTotals ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <DetailTotal label="Contratado" value={candidato.totalGastos} />
            <DetailTotal label="Pago" value={candidato.totalGastosPagos} />
            {candidato.limiteGastos !== undefined ? (
              <div className="col-span-2">
                <DetailTotal
                  label="Limite de gastos"
                  value={candidato.limiteGastos}
                />
              </div>
            ) : null}
          </div>
        ) : null}
        {expenses.length > 0 ? (
          <ul className="mt-3 divide-y divide-screen-line">
            {expenses.map((expense, index) => (
              <li
                key={`${expense.categoria}-${index}`}
                className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
              >
                <span className="min-w-0">
                  <span className="block text-xs leading-5 text-ink">
                    {expense.categoria}
                  </span>
                  {expense.quantidade !== null ? (
                    <span className="mt-0.5 block text-[11px] text-muted">
                      {expense.quantidade}{" "}
                      {expense.quantidade === 1 ? "despesa" : "despesas"}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-right font-mono text-xs font-bold text-ink">
                  {formatBRL(expense.valor)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs leading-5 text-muted">
            O TSE não publicou despesas detalhadas deste candidato.
          </p>
        )}
      </section>

      <PartyExpenses candidato={candidato} />
    </div>
  );
}

function PartyExpenses({ candidato }: { candidato: CandidatoColinha }) {
  const gastos = candidato.gastosPartido;

  if (!gastos) {
    return null;
  }

  return (
    <section className="border-t border-screen-line px-4 py-4 sm:px-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold text-ink">Gastos do partido</h4>
          <p className="mt-0.5 text-[11px] text-muted">{gastos.partido}</p>
        </div>
        <span
          className={`shrink-0 rounded-md px-2 py-1 font-mono text-[10px] tracking-widest ${
            gastos.disponivel
              ? "bg-accent text-white"
              : "bg-screen-deep text-muted"
          }`}
        >
          {gastos.disponivel ? "PUBLICADO" : "NÃO PUBLICADO"}
        </span>
      </div>

      {gastos.disponivel ? (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <DetailTotal label="Contratado" value={gastos.totalContratado} />
            <DetailTotal label="Pago" value={gastos.totalPago} />
            <div className="col-span-2">
              <DetailTotal
                label="Limite de gastos"
                value={gastos.limiteGastos}
              />
            </div>
          </div>
          {gastos.detalhes.length > 0 ? (
            <ul className="mt-3 divide-y divide-screen-line">
              {gastos.detalhes.map((expense, index) => (
                <li
                  key={`${expense.categoria}-${index}`}
                  className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="min-w-0 text-xs leading-5 text-ink">
                    {expense.categoria}
                  </span>
                  <span className="shrink-0 text-right font-mono text-xs font-bold text-ink">
                    {formatBRL(expense.valor)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs leading-5 text-muted">
              O TSE não publicou categorias detalhadas para este partido.
            </p>
          )}
        </>
      ) : (
        <p className="mt-2 text-xs leading-5 text-muted">
          A prestação de contas partidária ainda não foi publicada para esta
          eleição, UF ou diretório.
        </p>
      )}
    </section>
  );
}

function DetailTotal({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  return (
    <div className="rounded-md bg-screen px-3 py-2">
      <p className="font-mono text-[10px] tracking-widest text-muted">
        {label.toLocaleUpperCase("pt-BR")}
      </p>
      <p className="mt-1 font-mono text-xs font-bold text-ink">
        {formatBRL(value)}
      </p>
    </div>
  );
}
