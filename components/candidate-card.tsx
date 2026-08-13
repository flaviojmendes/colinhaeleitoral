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
import { ShareCandidateButton } from "./share-candidate-button";

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
  clearLabel = "Trocar",
  onRefresh,
}: CandidateCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [showMore, setShowMore] = useState(false);
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

  async function handleMoreToggle() {
    const nextVisible = !showMore;
    setShowMore(nextVisible);

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
          <p className="inline-flex items-center gap-2 rounded-full bg-screen-deep px-3 py-1 text-sm font-bold text-muted">
            <Flag size={14} aria-hidden="true" />
            Voto só no partido
          </p>

          <dl className="mt-4">
            <div>
              <dt className="text-sm font-semibold text-muted">Número</dt>
              <dd className="mt-1 font-mono text-4xl font-bold leading-none tracking-widest text-ink sm:text-5xl">
                {candidato.numero}
              </dd>
            </div>
            <div className="mt-4">
              <dt className="text-sm font-semibold text-muted">Partido</dt>
              <dd className="mt-1 text-2xl font-bold tracking-tight text-ink">
                {candidato.partido}
              </dd>
              {candidato.nomeUrna !== candidato.partido ? (
                <dd className="mt-1 text-base text-muted">
                  {candidato.nomeUrna}
                </dd>
              ) : null}
            </div>
            <div className="mt-3">
              <dt className="text-sm font-semibold text-muted">Cargo</dt>
              <dd className="mt-1 text-base font-medium text-ink">
                {cargoLabel}
                {candidato.candidatosNoPartido
                  ? ` · ${candidato.candidatosNoPartido} candidato${
                      candidato.candidatosNoPartido === 1 ? "" : "s"
                    } neste estado`
                  : ""}
              </dd>
            </div>
          </dl>

          <p className="mt-4 text-sm leading-6 text-muted">
            O voto vai para o partido, que elege seus candidatos mais votados.
            Você não escolhe uma pessoa específica.
          </p>
        </div>

        <div className="grid grid-cols-2 border-t border-screen-line bg-white">
          <div className="min-w-0 px-4 py-4 sm:px-5">
            <p className="text-sm font-semibold text-muted">Gastos contratados</p>
            <p className="mt-1 truncate text-base font-bold text-ink">
              {formatBRL(candidato.gastosPartido?.totalContratado)}
            </p>
          </div>
          <div className="min-w-0 border-l border-screen-line px-4 py-4 sm:px-5">
            <p className="text-sm font-semibold text-muted">Gastos pagos</p>
            <p className="mt-1 truncate text-base font-bold text-ink">
              {formatBRL(candidato.gastosPartido?.totalPago)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleMoreToggle()}
          aria-expanded={showMore}
          disabled={refreshing}
          className="flex min-h-14 w-full items-center justify-between gap-3 border-t border-screen-line px-4 py-3 text-left text-base font-bold text-ink transition-colors duration-150 hover:bg-white sm:px-5"
        >
          {showMore ? "Esconder contas do partido" : "Ver contas do partido"}
          <ChevronDown
            className={`shrink-0 text-muted transition-transform duration-150 ${
              showMore ? "rotate-180" : ""
            }`}
            size={20}
            aria-hidden="true"
          />
        </button>

        {showMore ? (
          refreshing ? (
            <p className="border-t border-screen-line px-4 py-5 text-center text-sm font-semibold text-muted sm:px-5">
              Atualizando as contas do partido…
            </p>
          ) : refreshError ? (
            <p className="border-t border-screen-line bg-coral/15 px-4 py-5 text-center text-sm font-semibold leading-6 text-coral-ink sm:px-5">
              {refreshError}
            </p>
          ) : (
            <div className="bg-white">
              <PartyExpenses candidato={candidato} />
            </div>
          )
        ) : null}

        <ActionRow
          candidato={candidato}
          uf={uf}
          confirmed={confirmed}
          clearLabel={clearLabel}
          confirmLabel="Salvar este partido"
          note="Isso só adiciona o partido na sua lista impressa."
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
            <dt className="text-sm font-semibold text-muted">Número</dt>
            <dd className="mt-1 font-mono text-4xl font-bold leading-none tracking-widest text-ink sm:text-5xl">
              {candidato.numero}
            </dd>
          </div>
          <div className="mt-4">
            <dt className="text-sm font-semibold text-muted">Nome</dt>
            <dd className="mt-1 text-2xl font-bold tracking-tight text-ink">
              {candidato.nomeUrna}
            </dd>
          </div>
          <div className="mt-3">
            <dt className="text-sm font-semibold text-muted">Partido</dt>
            <dd className="mt-1 text-base font-semibold text-ink">
              {candidato.partido}
            </dd>
          </div>
          <div className="mt-3">
            <dt className="text-sm font-semibold text-muted">Cargo</dt>
            <dd className="mt-1 text-base font-medium text-muted">
              {cargoLabel}
            </dd>
          </div>
        </dl>

        <div className="relative flex h-36 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-screen-line bg-screen p-1 text-2xl font-bold text-muted">
          {candidato.fotoUrl && !imageFailed ? (
            <Image
              key={candidato.fotoUrl}
              src={candidato.fotoUrl}
              alt={`Foto de ${candidato.nomeUrna}`}
              fill
              sizes="112px"
              className="object-contain"
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
        <p className="flex items-start gap-2 border-t border-screen-line bg-coral/15 px-4 py-4 text-sm leading-6 text-coral-ink sm:px-5">
          <AlertTriangle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
          <span>
            Situação no TSE: <strong>{candidato.situacao}</strong>
          </span>
        </p>
      ) : null}

      <div className="grid grid-cols-2 border-t border-screen-line bg-white">
        <div className="min-w-0 px-4 py-4 sm:px-5">
          <p className="text-sm font-semibold text-muted">Patrimônio</p>
          <p className="mt-1 truncate text-base font-bold text-ink">
            {formatBRL(candidato.patrimonioDeclarado)}
          </p>
        </div>
        <div className="min-w-0 border-l border-screen-line px-4 py-4 sm:px-5">
          <p className="text-sm font-semibold text-muted">Gastos</p>
          <p className="mt-1 truncate text-base font-bold text-ink">
            {formatBRL(candidato.totalGastos)}
          </p>
        </div>
      </div>

      <ActionRow
        candidato={candidato}
        uf={uf}
        confirmed={confirmed}
        clearLabel={clearLabel}
        confirmLabel="Salvar na minha lista"
        note="Isso só adiciona o candidato na sua lista impressa."
        onClear={onClear}
        onConfirm={onConfirm}
      />

      <button
        type="button"
        onClick={() => void handleMoreToggle()}
        aria-expanded={showMore}
        disabled={refreshing}
        className="flex min-h-14 w-full items-center justify-between gap-3 border-t border-screen-line px-4 py-3 text-left text-base font-bold text-ink transition-colors duration-150 hover:bg-white sm:px-5"
      >
        {showMore
          ? "Esconder mais informações"
          : "Ver mais informações (opcional)"}
        <ChevronDown
          className={`shrink-0 text-muted transition-transform duration-150 ${
            showMore ? "rotate-180" : ""
          }`}
          size={20}
          aria-hidden="true"
        />
      </button>

      {showMore ? (
        refreshing ? (
          <p className="border-t border-screen-line px-4 py-5 text-center text-sm font-semibold text-muted sm:px-5">
            Carregando mais dados públicos…
          </p>
        ) : refreshError ? (
          <p className="border-t border-screen-line bg-coral/15 px-4 py-5 text-center text-sm font-semibold leading-6 text-coral-ink sm:px-5">
            {refreshError}
          </p>
        ) : (
          <>
            <FinancialDetails candidato={candidato} />
            <CandidateNews nome={candidato.nomeUrna} />
            <JudicialRecords
              nome={candidato.nomeCompleto ?? candidato.nomeUrna}
              uf={uf}
              certidoes={candidato.certidoes}
              needsRefresh={false}
              onRefresh={onRefresh}
            />
          </>
        )
      ) : null}
    </div>
  );
}

function ActionRow({
  candidato,
  uf,
  confirmed,
  clearLabel,
  confirmLabel,
  note,
  onClear,
  onConfirm,
}: {
  candidato: CandidatoColinha;
  uf: string;
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
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-base font-bold text-accent-deep">
            <ShieldCheck size={20} aria-hidden="true" />
            Salvo na sua lista
          </p>
          <ShareCandidateButton candidato={candidato} uf={uf} variant="primary" />
          <button
            type="button"
            onClick={onClear}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-coral px-5 text-base font-bold text-coral-ink transition-colors duration-150 hover:bg-coral-deep"
          >
            <RotateCcw size={17} aria-hidden="true" />
            {clearLabel}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <button
              type="button"
              onClick={onClear}
              className="flex h-14 items-center justify-center gap-2 rounded-xl bg-coral px-5 text-base font-bold text-coral-ink transition-colors duration-150 hover:bg-coral-deep"
            >
              <RotateCcw size={17} aria-hidden="true" />
              {clearLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex h-14 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-base font-bold text-white transition-colors duration-150 hover:bg-accent-deep"
            >
              <Check size={20} strokeWidth={3} aria-hidden="true" />
              {confirmLabel}
            </button>
          </div>
          <div className="mt-2">
            <ShareCandidateButton candidato={candidato} uf={uf} />
          </div>
          <p className="mt-3 text-center text-sm leading-5 text-muted">
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
      <section className="border-t border-screen-line px-4 py-5 sm:px-5">
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="text-base font-bold text-ink">Patrimônio declarado</h4>
          <span className="text-sm font-semibold text-muted">
            {assets.length} {assets.length === 1 ? "item" : "itens"}
          </span>
        </div>
        {assets.length > 0 ? (
          <ul className="mt-3 divide-y divide-screen-line">
            {assets.map((asset, index) => (
              <li
                key={`${asset.descricao}-${index}`}
                className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <span className="min-w-0">
                  <span className="block text-sm leading-6 text-ink">
                    {asset.descricao}
                  </span>
                  {asset.tipo ? (
                    <span className="mt-0.5 block text-sm leading-5 text-muted">
                      {asset.tipo}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-right font-mono text-sm font-bold text-ink">
                  {formatBRL(asset.valor)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm leading-6 text-muted">
            O TSE não publicou os bens detalhados deste candidato.
          </p>
        )}
      </section>

      <section className="border-t border-screen-line px-4 py-5 sm:px-5">
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="text-base font-bold text-ink">Gastos de campanha</h4>
          <span className="text-sm font-semibold text-muted">
            {expenses.length}{" "}
            {expenses.length === 1 ? "categoria" : "categorias"}
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
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <span className="min-w-0">
                  <span className="block text-sm leading-6 text-ink">
                    {expense.categoria}
                  </span>
                  {expense.quantidade !== null ? (
                    <span className="mt-0.5 block text-sm text-muted">
                      {expense.quantidade}{" "}
                      {expense.quantidade === 1 ? "despesa" : "despesas"}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-right font-mono text-sm font-bold text-ink">
                  {formatBRL(expense.valor)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm leading-6 text-muted">
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
    <section className="border-t border-screen-line px-4 py-5 sm:px-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-bold text-ink">Gastos do partido</h4>
          <p className="mt-1 text-sm text-muted">{gastos.partido}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${
            gastos.disponivel
              ? "bg-accent text-white"
              : "bg-screen-deep text-muted"
          }`}
        >
          {gastos.disponivel ? "Publicado" : "Ainda não publicado"}
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
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <span className="min-w-0 text-sm leading-6 text-ink">
                    {expense.categoria}
                  </span>
                  <span className="shrink-0 text-right font-mono text-sm font-bold text-ink">
                    {formatBRL(expense.valor)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm leading-6 text-muted">
              O TSE não publicou categorias detalhadas para este partido.
            </p>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm leading-6 text-muted">
          A prestação de contas partidária ainda não foi publicada para esta
          eleição ou estado.
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
    <div className="rounded-lg bg-screen px-3 py-3">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-1 font-mono text-sm font-bold text-ink">
        {formatBRL(value)}
      </p>
    </div>
  );
}
