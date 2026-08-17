"use client";

import {
  Check,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Info,
  LoaderCircle,
  Plus,
  RotateCcw,
  Search,
  Share2,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

import { UF_OPTIONS } from "@/lib/cargos";
import { CURIOSIDADES_CATEGORIAS } from "@/lib/curiosidades-ui";
import { formatCompactBRL } from "@/lib/format";
import { grantLgpdConsent, hasValidLgpdConsent } from "@/lib/lgpd";
import type {
  CandidatoColinha,
  CargoSlug,
  CuriosidadeCategoria,
  CuriosidadeItem,
  CuriosidadesResponse,
} from "@/lib/types";
import { useCandidatosStore } from "@/store/candidatos-store";

const AVATAR_FALLBACK = (nome: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    nome,
  )}&background=252a28&color=dce9dc&bold=true`;

async function fetchCuriosidades(url: string): Promise<CuriosidadesResponse> {
  const response = await fetch(url);
  const payload = (await response.json().catch(() => null)) as
    | CuriosidadesResponse
    | { error?: string }
    | null;

  if (!response.ok || !payload || !("itens" in payload)) {
    throw new Error(
      (payload && "error" in payload ? payload.error : null) ??
        "Não foi possível carregar os rankings.",
    );
  }

  return payload;
}

function formatUpdatedAt(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function senadorSlot(
  item: CuriosidadeItem,
  slots: Record<CargoSlug, CandidatoColinha | null>,
): CargoSlug {
  if (item.cargo !== "senador-1" && item.cargo !== "senador-2") {
    return item.cargo;
  }

  if (slots["senador-1"]?.numero === item.numero) {
    return "senador-1";
  }

  if (slots["senador-2"]?.numero === item.numero) {
    return "senador-2";
  }

  return slots["senador-1"] ? "senador-2" : "senador-1";
}

export function CuriosidadesExplorer() {
  const userUf = useCandidatosStore((state) => state.uf);
  const setUfInStore = useCandidatosStore((state) => state.setUf);
  const setCandidateInStore = useCandidatosStore((state) => state.setCandidate);
  const slots = useCandidatosStore((state) => state.slots);

  const [categoria, setCategoria] = useState<CuriosidadeCategoria | "todas">(
    "mais-ricos",
  );
  const [ufFilter, setUfFilter] = useState(userUf || "SP");
  const [cargoFilter, setCargoFilter] = useState("todos");
  const [busca, setBusca] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setBuscaDebounced(busca), 250);
    return () => window.clearTimeout(timer);
  }, [busca]);

  const query = new URLSearchParams({
    uf: ufFilter,
    categoria,
    cargo: cargoFilter,
  });
  if (buscaDebounced) {
    query.set("busca", buscaDebounced);
  }

  const { data, error, isLoading } = useSWR<CuriosidadesResponse>(
    `/api/curiosidades?${query}`,
    fetchCuriosidades,
    { revalidateOnFocus: false },
  );

  function handleAddCandidate(item: CuriosidadeItem) {
    if (!hasValidLgpdConsent()) {
      grantLgpdConsent();
    }

    if (item.cargo !== "presidente" && item.uf !== "BR" && item.uf !== userUf) {
      setUfInStore(item.uf);
      toast.info(`Estado da sua colinha alterado para ${item.uf}.`);
    }

    const cargo = senadorSlot(item, slots);
    const candidatoColinha: CandidatoColinha = {
      id: item.id,
      numero: item.numero,
      nomeUrna: item.nomeUrna,
      nomeCompleto: item.nomeCompleto ?? item.nomeUrna,
      partido: item.partido,
      cargo,
      tipoVoto: "candidato",
      fotoUrl: item.fotoUrl,
      patrimonioDeclarado: item.patrimonioDeclarado ?? null,
      totalGastos: null,
      patrimonioDetalhes: item.bemNotavel
        ? [
            {
              descricao: item.bemNotavel.descricao,
              tipo: item.bemNotavel.tipo ?? null,
              valor: item.bemNotavel.valor,
            },
          ]
        : [],
    };

    setCandidateInStore(cargo, candidatoColinha);
    toast.success(`${item.nomeUrna} foi adicionado à sua colinha.`);
  }

  function handleShareCuriosity(item: CuriosidadeItem) {
    const text = `${item.nomeUrna} (${item.partido}): ${item.destaquePrincipal} — ${item.subtituloDestaque}. Dados do TSE no Colinha Eleitoral.`;
    const url = `${window.location.origin}/curiosidades`;

    if (navigator.share) {
      void navigator.share({
        title: `Curiosidades 2026 · ${item.nomeUrna}`,
        text,
        url,
      });
      return;
    }

    void navigator.clipboard.writeText(`${text} ${url}`);
    toast.success("Texto copiado para colar onde quiser.");
  }

  const activeCategoryInfo = CURIOSIDADES_CATEGORIAS.find(
    (category) => category.id === categoria,
  );
  const updatedLabel = formatUpdatedAt(data?.atualizadoEm ?? null);
  const stats = data?.estatisticas ?? [];
  const itens = data?.itens ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-coral/30 bg-coral/10 px-3 py-1 text-xs font-bold text-coral">
          <Sparkles size={14} aria-hidden="true" />
          Dados oficiais do TSE · atualizados a cada hora
        </div>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-console-ink sm:text-5xl">
          Rankings da disputa
        </h1>
        <p className="mt-3 text-base leading-7 text-console-muted sm:text-lg">
          Patrimônio, idade, histórico de urna e ocupação de presidente,
          governador e senador. O TSE só publica esses detalhes na ficha de
          cada candidato — por isso o recorte não inclui deputados.
        </p>
      </header>

      <section
        aria-label="Números deste recorte"
        className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {(isLoading && stats.length === 0
          ? ["a", "b", "c", "d"]
          : stats.slice(0, 4)
        ).map((stat) =>
          typeof stat === "string" ? (
            <div
              key={stat}
              className="screen-surface h-28 rounded-2xl border border-screen-line"
            >
              <div className="skeleton-shimmer m-4 h-3 w-24 rounded" />
              <div className="skeleton-shimmer mx-4 h-6 w-20 rounded" />
            </div>
          ) : (
            <div
              key={stat.id}
              className="screen-surface rounded-2xl border border-screen-line p-4"
            >
              <div className="text-xs font-bold uppercase tracking-wider text-muted">
                {stat.titulo}
              </div>
              <div className="mt-2 text-xl font-black text-ink sm:text-2xl">
                {stat.valor}
              </div>
              <div className="mt-1 line-clamp-1 text-xs text-muted">
                {stat.descricao}
              </div>
            </div>
          ),
        )}
      </section>

      <section className="mt-10" aria-label="Categorias">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-console-ink">
            O que você quer ver
          </h2>
          {categoria !== "todas" ? (
            <button
              type="button"
              onClick={() => setCategoria("todas")}
              className="text-xs font-semibold text-coral hover:underline"
            >
              Ver destaques
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-2 sm:flex-wrap">
          <button
            type="button"
            onClick={() => setCategoria("todas")}
            className={`flex h-12 shrink-0 items-center rounded-xl border px-3.5 text-sm font-bold transition-colors ${
              categoria === "todas"
                ? "border-coral bg-coral text-white"
                : "border-console-edge bg-console text-console-ink hover:border-console-muted"
            }`}
          >
            Destaques
          </button>

          {CURIOSIDADES_CATEGORIAS.map((category) => {
            const isSelected = categoria === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoria(category.id)}
                className={`flex h-12 shrink-0 items-center rounded-xl border px-3.5 text-sm font-bold transition-colors ${
                  isSelected
                    ? "border-coral bg-coral text-white"
                    : "border-console-edge bg-console text-console-ink hover:border-console-muted"
                }`}
              >
                {category.shortLabel}
              </button>
            );
          })}
        </div>

        {activeCategoryInfo ? (
          <p className="mt-2 text-sm text-console-muted">
            {activeCategoryInfo.descricao}
          </p>
        ) : null}
      </section>

      <section className="mt-6 rounded-2xl border border-console-edge bg-console p-3 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-12">
          <div className="relative sm:col-span-6">
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-console-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar nome, partido ou ocupação"
              className="h-12 w-full rounded-xl border border-console-edge bg-console-deep pl-10 pr-4 text-sm text-console-ink placeholder-console-muted"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={ufFilter}
              onChange={(event) => setUfFilter(event.target.value)}
              aria-label="Estado"
              className="h-12 w-full rounded-xl border border-console-edge bg-console-deep px-3 text-sm font-semibold text-console-ink"
            >
              {UF_OPTIONS.map((uf) => (
                <option key={uf.value} value={uf.value}>
                  {uf.value} · {uf.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={cargoFilter}
              onChange={(event) => setCargoFilter(event.target.value)}
              aria-label="Cargo"
              className="h-12 w-full rounded-xl border border-console-edge bg-console-deep px-3 text-sm font-semibold text-console-ink"
            >
              <option value="todos">Presidente, governador e senador</option>
              <option value="presidente">Presidente</option>
              <option value="governador">Governador</option>
              <option value="senador">Senador</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-console-edge/60 pt-3 text-xs text-console-muted">
          <span>
            {data
              ? `${data.totalCandidatos} candidatos neste recorte${
                  updatedLabel ? ` · consulta de ${updatedLabel}` : ""
                }`
              : "Consultando o TSE…"}
          </span>
          {busca || cargoFilter !== "todos" ? (
            <button
              type="button"
              onClick={() => {
                setBusca("");
                setCargoFilter("todos");
              }}
              className="flex items-center gap-1 font-semibold text-coral hover:underline"
            >
              <RotateCcw size={12} aria-hidden="true" />
              Limpar busca e cargo
            </button>
          ) : null}
        </div>
      </section>

      <section className="mt-8 space-y-4" aria-label="Ranking">
        {error ? (
          <div className="rounded-2xl border border-console-edge bg-console p-10 text-center">
            <HelpCircle
              className="mx-auto text-console-muted"
              size={40}
              aria-hidden="true"
            />
            <h3 className="mt-3 text-lg font-bold text-console-ink">
              O TSE não respondeu a tempo
            </h3>
            <p className="mt-1 text-sm text-console-muted">
              A primeira carga busca a ficha de cada candidato. Tente de novo em
              alguns segundos.
            </p>
          </div>
        ) : null}

        {isLoading && itens.length === 0 && !error ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-console-edge bg-console py-16 text-sm text-console-muted">
            <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />
            Buscando fichas no TSE para montar o ranking…
          </div>
        ) : null}

        {!isLoading && !error && itens.length === 0 ? (
          <div className="rounded-2xl border border-console-edge bg-console p-10 text-center">
            <h3 className="text-lg font-bold text-console-ink">
              Ninguém neste recorte
            </h3>
            <p className="mt-1 text-sm text-console-muted">
              Troque o estado, o cargo ou o tipo de ranking.
            </p>
          </div>
        ) : null}

        {itens.map((item) => {
          const slot = senadorSlot(item, slots);
          const isConfirmedInColinha = slots[slot]?.numero === item.numero;
          const isTop1 = item.posicao === 1;
          const isTop2 = item.posicao === 2;
          const isTop3 = item.posicao === 3;
          const shareUf = item.uf === "BR" ? ufFilter : item.uf;

          return (
            <article
              key={`${item.id}-${item.categoria}-${item.posicao}`}
              className="overflow-hidden rounded-2xl border border-console-edge bg-console"
            >
              <div className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3.5">
                    {item.posicao !== undefined ? (
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-base font-black ${
                          isTop1
                            ? "border border-amber-400/40 bg-amber-400/20 text-amber-300"
                            : isTop2
                              ? "border border-slate-300/40 bg-slate-300/20 text-slate-100"
                              : isTop3
                                ? "border border-orange-500/40 bg-orange-500/20 text-orange-200"
                                : "border border-console-edge bg-console-deep text-console-muted"
                        }`}
                        aria-label={`Posição ${item.posicao}`}
                      >
                        {isTop1
                          ? "1º"
                          : isTop2
                            ? "2º"
                            : isTop3
                              ? "3º"
                              : `#${item.posicao}`}
                      </div>
                    ) : null}

                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-console-edge bg-console-deep">
                      <Image
                        src={item.fotoUrl ?? AVATAR_FALLBACK(item.nomeUrna)}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-black text-console-ink">
                          {item.nomeUrna}
                        </h3>
                        {item.badge ? (
                          <span className="rounded-md border border-coral/30 bg-coral/10 px-2 py-0.5 text-xs font-bold text-coral">
                            {item.badge}
                          </span>
                        ) : null}
                      </div>

                      {item.nomeCompleto &&
                      item.nomeCompleto !== item.nomeUrna ? (
                        <p className="text-xs text-console-muted">
                          {item.nomeCompleto}
                        </p>
                      ) : null}

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-console-muted">
                        <span className="rounded bg-console-deep px-1.5 py-0.5 font-mono text-console-ink">
                          {item.numero}
                        </span>
                        <span>{item.partido}</span>
                        <span>{item.cargoLabel}</span>
                        {item.uf !== "BR" ? (
                          <span className="font-bold text-console-ink">
                            {item.uf}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-console-edge bg-console-deep px-4 py-2.5 sm:text-right">
                    <p className="font-mono text-2xl font-black text-coral sm:text-3xl">
                      {item.destaquePrincipal}
                    </p>
                    <p className="text-xs font-bold text-console-muted">
                      {item.subtituloDestaque}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-console-edge/70 bg-console-deep/60 p-3 text-sm leading-relaxed text-console-ink">
                  <Info
                    size={16}
                    className="mt-0.5 shrink-0 text-coral"
                    aria-hidden="true"
                  />
                  <p>{item.curiosidadeTexto}</p>
                </div>

                {item.bemNotavel ? (
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg px-1 py-2 text-xs text-console-muted">
                    <span>
                      Bem de maior valor: {item.bemNotavel.descricao}
                    </span>
                    <span className="font-mono font-bold text-console-ink">
                      {formatCompactBRL(item.bemNotavel.valor)}
                    </span>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-console-edge/60 pt-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/c/${shareUf}/${item.cargo}/${item.numero}`}
                      className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-console-edge px-3 text-xs font-bold text-console-ink hover:bg-console-deep"
                    >
                      Ver ficha completa
                      <ExternalLink size={13} aria-hidden="true" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleShareCuriosity(item)}
                      className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-console-edge px-3 text-xs font-bold text-console-muted hover:bg-console-deep hover:text-console-ink"
                    >
                      <Share2 size={13} aria-hidden="true" />
                      Compartilhar
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddCandidate(item)}
                    disabled={isConfirmedInColinha}
                    className={`inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-xs font-bold ${
                      isConfirmedInColinha
                        ? "bg-accent/20 text-accent-bright"
                        : "bg-white text-ink hover:bg-screen"
                    }`}
                  >
                    {isConfirmedInColinha ? (
                      <>
                        <Check size={14} aria-hidden="true" />
                        Na sua colinha
                      </>
                    ) : (
                      <>
                        <Plus size={14} aria-hidden="true" />
                        Adicionar à colinha
                      </>
                    )}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="mt-12 rounded-2xl border border-coral/30 bg-coral/5 p-6 text-center sm:p-8">
        <h2 className="text-2xl font-black text-console-ink">
          Monte a lista para o dia da votação
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-console-muted">
          Escolha os seis cargos da sua seção, confira a ficha pública e
          imprima o papel para levar na cabine.
        </p>
        <div className="mt-5 flex justify-center">
          <Link
            href="/"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-base font-bold text-ink hover:bg-screen"
          >
            Ir para a colinha
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
