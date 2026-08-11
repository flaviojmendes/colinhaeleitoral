"use client";

import Image from "next/image";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  ReceiptText,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { useState } from "react";

import { getCargoConfig } from "@/lib/cargos";
import { formatBRL } from "@/lib/format";
import type { CandidatoColinha } from "@/lib/types";

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
  clearLabel = "Limpar",
  onRefresh,
}: CandidateCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const cargoLabel = getCargoConfig(candidato.cargo, uf).label;
  const needsRefresh =
    candidato.patrimonioDetalhes === undefined ||
    candidato.gastosDetalhes === undefined ||
    candidato.gastosPartido === undefined;

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

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-white/75 shadow-[0_8px_30px_rgba(24,36,31,0.06)]">
      <div className="flex gap-4 p-4">
        <div className="relative flex h-28 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-paper-deep text-2xl font-bold tracking-tight text-accent">
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
                className="absolute opacity-10"
                size={70}
                strokeWidth={1}
                aria-hidden="true"
              />
              <span className="relative">{initials(candidato.nomeUrna)}</span>
            </>
          )}
        </div>

        <div className="min-w-0 flex-1 py-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
              {candidato.numero}
            </span>
            {confirmed ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-accent">
                <Check size={13} strokeWidth={3} aria-hidden="true" />
                Confirmado
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 truncate text-xl font-bold tracking-[-0.03em] text-ink">
            {candidato.nomeUrna}
          </h3>
          <p className="mt-1 truncate text-sm font-medium text-muted">
            {candidato.partido}
          </p>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            {cargoLabel}
          </p>
        </div>
      </div>

      {candidato.situacao && !isApproved(candidato.situacao) ? (
        <div className="mx-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
          <AlertTriangle
            className="mt-0.5 shrink-0"
            size={15}
            aria-hidden="true"
          />
          <span>
            Situação: <strong>{candidato.situacao}</strong>
          </span>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 px-4 py-4">
        <Metric
          icon={<CircleDollarSign size={15} aria-hidden="true" />}
          label="Patrimônio"
          value={formatBRL(candidato.patrimonioDeclarado)}
        />
        <Metric
          icon={<ReceiptText size={15} aria-hidden="true" />}
          label="Gastos"
          value={formatBRL(candidato.totalGastos)}
        />
      </div>

      <button
        type="button"
        onClick={() => void handleDetailsToggle()}
        aria-expanded={showDetails}
        disabled={refreshing}
        className="mx-4 mb-4 flex h-11 w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-xl border border-accent/25 bg-accent/5 text-xs font-bold text-accent transition-colors hover:border-accent hover:bg-accent/10"
      >
        {showDetails ? (
          <ChevronUp size={16} aria-hidden="true" />
        ) : (
          <ChevronDown size={16} aria-hidden="true" />
        )}
        {showDetails ? "Ocultar detalhes financeiros" : "Ver detalhes financeiros"}
      </button>
      {showDetails ? (
        refreshing ? (
          <div className="mx-4 mb-4 rounded-xl border border-line bg-paper px-4 py-5 text-center text-xs font-semibold text-muted">
            Atualizando patrimônio e gastos no TSE…
          </div>
        ) : refreshError ? (
          <div className="mx-4 mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-5 text-center text-xs font-semibold leading-5 text-red-800">
            {refreshError}
          </div>
        ) : (
          <FinancialDetails candidato={candidato} />
        )
      ) : null}

      <div className="flex items-center gap-2 border-t border-line px-4 py-3">
        {confirmed ? (
          <div className="flex min-w-0 flex-1 items-center gap-2 text-xs font-semibold text-accent">
            <ShieldCheck size={17} aria-hidden="true" />
            Salvo na sua colinha
          </div>
        ) : (
          <button
            type="button"
            onClick={onConfirm}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-white transition-colors hover:bg-accent-deep active:scale-[0.99]"
          >
            <Check size={17} strokeWidth={2.5} aria-hidden="true" />
            Confirmar
          </button>
        )}
        <button
          type="button"
          onClick={onClear}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line px-4 text-sm font-bold text-muted transition-colors hover:border-coral hover:text-coral"
        >
          <Trash2 size={16} aria-hidden="true" />
          {clearLabel}
        </button>
      </div>
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
    <div className="mx-4 mb-4 overflow-hidden rounded-xl border border-line bg-paper">
      <section className="p-4">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-xs font-black uppercase tracking-[0.12em] text-ink">
            Patrimônio declarado
          </h4>
          <span className="text-[11px] font-semibold text-muted">
            {assets.length} {assets.length === 1 ? "item" : "itens"}
          </span>
        </div>
        {assets.length > 0 ? (
          <ul className="mt-3 divide-y divide-line/70">
            {assets.map((asset, index) => (
              <li
                key={`${asset.descricao}-${index}`}
                className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <span className="min-w-0">
                  <span className="block text-xs font-bold leading-5 text-ink">
                    {asset.descricao}
                  </span>
                  {asset.tipo ? (
                    <span className="mt-0.5 block text-[11px] leading-4 text-muted">
                      {asset.tipo}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-right text-xs font-bold text-ink">
                  {formatBRL(asset.valor)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs leading-5 text-muted">
            O TSE não publicou os bens detalhados deste candidato.
          </p>
        )}
      </section>

      <section className="border-t border-line p-4">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-xs font-black uppercase tracking-[0.12em] text-ink">
            Gastos de campanha
          </h4>
          <span className="text-[11px] font-semibold text-muted">
            {expenses.length} {expenses.length === 1 ? "categoria" : "categorias"}
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
          <ul className="mt-3 divide-y divide-line/70">
            {expenses.map((expense, index) => (
              <li
                key={`${expense.categoria}-${index}`}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <span className="min-w-0">
                  <span className="block text-xs font-bold leading-5 text-ink">
                    {expense.categoria}
                  </span>
                  {expense.quantidade !== null ? (
                    <span className="mt-0.5 block text-[11px] text-muted">
                      {expense.quantidade}{" "}
                      {expense.quantidade === 1 ? "despesa" : "despesas"}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-right text-xs font-bold text-ink">
                  {formatBRL(expense.valor)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs leading-5 text-muted">
            O TSE não publicou despesas detalhadas deste candidato.
          </p>
        )}
      </section>

      {candidato.gastosPartido ? (
        <section className="border-t border-line p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-xs font-black uppercase tracking-[0.12em] text-ink">
                Gastos do partido
              </h4>
              <p className="mt-1 text-[11px] font-semibold text-muted">
                {candidato.gastosPartido.partido}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${
                candidato.gastosPartido.disponivel
                  ? "bg-accent/10 text-accent"
                  : "bg-paper-deep text-muted"
              }`}
            >
              {candidato.gastosPartido.disponivel
                ? "Publicado"
                : "Não publicado"}
            </span>
          </div>

          {candidato.gastosPartido.disponivel ? (
            <>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <DetailTotal
                  label="Contratado"
                  value={candidato.gastosPartido.totalContratado}
                />
                <DetailTotal
                  label="Pago"
                  value={candidato.gastosPartido.totalPago}
                />
                <div className="col-span-2">
                  <DetailTotal
                    label="Limite de gastos"
                    value={candidato.gastosPartido.limiteGastos}
                  />
                </div>
              </div>
              {candidato.gastosPartido.detalhes.length > 0 ? (
                <ul className="mt-3 divide-y divide-line/70">
                  {candidato.gastosPartido.detalhes.map((expense, index) => (
                    <li
                      key={`${expense.categoria}-${index}`}
                      className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                    >
                      <span className="min-w-0 text-xs font-bold leading-5 text-ink">
                        {expense.categoria}
                      </span>
                      <span className="shrink-0 text-right text-xs font-bold text-ink">
                        {formatBRL(expense.valor)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs leading-5 text-muted">
                  O TSE não publicou categorias detalhadas para este partido.
                </p>
              )}
            </>
          ) : (
            <p className="mt-3 text-xs leading-5 text-muted">
              A prestação de contas partidária ainda não foi publicada para
              esta eleição, UF ou diretório.
            </p>
          )}
        </section>
      ) : null}
    </div>
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
    <div className="rounded-lg bg-white px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
        {label}
      </p>
      <p className="mt-1 text-xs font-black text-ink">{formatBRL(value)}</p>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-paper px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-muted">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">
          {label}
        </span>
      </div>
      <p className="mt-1 truncate text-xs font-bold text-ink">{value}</p>
    </div>
  );
}
