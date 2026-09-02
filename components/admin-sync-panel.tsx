"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { mapPool, sleep, withRetry } from "@/lib/async-pool";
import {
  CARGOS_2026,
  UF_OPTIONS,
  getCargoConfig,
  getElectionUf,
} from "@/lib/cargos";
import {
  TSE_BASE_URL,
  TSE_ELECTION_ID,
  TSE_PAGE_URL,
  assembleLegenda,
  applyCandidateExpenses,
  candidateFromListItem,
  fetchCandidateAccounts,
  fetchPartyDirectory,
  fetchPartyExpenses,
  hydrateCandidate,
  listCandidates,
  listCandidatesChunked,
  makeCandidateCacheKey,
  makeCandidateListCacheKey,
  makePartyCacheKey,
  makePartyListCacheKey,
  partiesFromCandidates,
  partyNumberFromCandidateNumber,
  partyNumbersFromDirectory,
  type TseFetch,
} from "@/lib/tse";
import { createPonteFetch, isPonteWindow } from "@/lib/tse-ponte";
import { ponteBookmarklet } from "@/lib/tse-ponte-script";
import type {
  CandidateListItem,
  CandidatoColinha,
  CargoSlug,
  GastosPartido,
} from "@/lib/types";

const UNIQUE_CARGOS = CARGOS_2026.filter((cargo, index, items) => {
  return items.findIndex((item) => item.tseCode === cargo.tseCode) === index;
});

const SECRET_STORAGE_KEY = "colinha-admin-secret";

type SyncMode = "completo" | "gastos";

interface AdminSyncPanelProps {
  configured: boolean;
  ponte: boolean;
}

interface LogEntry {
  id: number;
  text: string;
}

function bookmarkletFor(origin: string): string {
  return ponteBookmarklet(origin);
}

function planJobs(ufs: string[], cargos: CargoSlug[]) {
  const seen = new Set<string>();
  const jobs: Array<{ uf: string; cargo: CargoSlug }> = [];

  for (const uf of ufs) {
    for (const cargo of cargos) {
      const electionUf = getElectionUf(cargo, uf);
      const code = getCargoConfig(cargo, uf).tseCode;
      const key = `${electionUf}:${code}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      jobs.push({ uf, cargo });
    }
  }

  return jobs;
}

function createIngestBuffer(secret: string) {
  const pending: Array<{ key: string; value: unknown }> = [];
  let chain = Promise.resolve();

  function flushChunk() {
    if (pending.length === 0) {
      return;
    }

    const batch = pending.splice(0, 40);
    chain = chain.then(() => ingest(secret, batch));
  }

  return {
    enqueue(items: Array<{ key: string; value: unknown }>) {
      pending.push(...items);
      while (pending.length >= 40) {
        flushChunk();
      }
    },
    async flush() {
      while (pending.length > 0) {
        flushChunk();
      }
      await chain;
    },
  };
}

async function ingest(
  secret: string,
  items: Array<{ key: string; value: unknown }>,
) {
  for (let index = 0; index < items.length; index += 40) {
    const chunk = items.slice(index, index + 40);
    const response = await fetch("/api/admin/ingest", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ items: chunk }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(body?.error ?? `Falha ao gravar cache (${response.status})`);
    }
  }
}

async function readCachedRecords<T>(
  secret: string,
  keys: string[],
): Promise<Map<string, T>> {
  const records = new Map<string, T>();

  for (let index = 0; index < keys.length; index += 40) {
    const chunk = keys.slice(index, index + 40);
    const response = await fetch("/api/admin/get", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ keys: chunk }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(body?.error ?? `Falha ao ler cache (${response.status})`);
    }

    const payload = (await response.json()) as { records: Record<string, T> };
    Object.entries(payload.records ?? {}).forEach(([key, value]) => {
      records.set(key, value);
    });
  }

  return records;
}

export function AdminSyncPanel({ configured, ponte }: AdminSyncPanelProps) {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [selectedUfs, setSelectedUfs] = useState<string[]>(["SP"]);
  const [selectedCargos, setSelectedCargos] = useState<CargoSlug[]>(
    UNIQUE_CARGOS.map((cargo) => cargo.slug),
  );
  const [includeFichas, setIncludeFichas] = useState(true);
  const [skipCached, setSkipCached] = useState(true);
  const [syncMode, setSyncMode] = useState<SyncMode>("completo");
  const [delayMs, setDelayMs] = useState(80);
  const [concurrency, setConcurrency] = useState(6);
  const [limit, setLimit] = useState("");
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState("Pronto para sincronizar neste celular.");
  const logId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const ponteActive = ponte || isPonteWindow();
  const bookmarklet = useMemo(
    () => (origin ? bookmarkletFor(origin) : ""),
    [origin],
  );

  useEffect(() => {
    const stored = sessionStorage.getItem(SECRET_STORAGE_KEY);
    if (stored) {
      setSecret(stored);
      setUnlocked(true);
    }
  }, []);

  function log(text: string) {
    logId.current += 1;
    setLogs((current) => [...current.slice(-80), { id: logId.current, text }]);
    setStatus(text);
  }

  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    setAuthError(null);

    try {
      const response = await fetch("/api/admin/exists", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${secret.trim()}`,
        },
        body: JSON.stringify({ keys: [] }),
      });

      if (!response.ok) {
        setAuthError("Senha inválida.");
        return;
      }

      sessionStorage.setItem(SECRET_STORAGE_KEY, secret.trim());
      setUnlocked(true);
    } catch {
      setAuthError("Não foi possível validar a senha.");
    }
  }

  function toggleUf(uf: string) {
    setSelectedUfs((current) =>
      current.includes(uf)
        ? current.filter((item) => item !== uf)
        : [...current, uf],
    );
  }

  function toggleCargo(cargo: CargoSlug) {
    setSelectedCargos((current) =>
      current.includes(cargo)
        ? current.filter((item) => item !== cargo)
        : [...current, cargo],
    );
  }

  async function copyBookmarklet() {
    await navigator.clipboard.writeText(bookmarklet);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function probeAccess(tseFetch: TseFetch): Promise<"ok" | "cors" | "denied"> {
    try {
      const response = await tseFetch(
        `${TSE_BASE_URL}/prestador/campanha/partidos/${TSE_ELECTION_ID}`,
      );
      const text = await response.text();
      if (response.status === 403 || text.includes("Access Denied")) {
        return "denied";
      }
      return response.ok ? "ok" : "denied";
    } catch {
      return "cors";
    }
  }

  async function startSync() {
    if (running) {
      abortRef.current?.abort();
      return;
    }

    if (selectedUfs.length === 0 || selectedCargos.length === 0) {
      log("Escolha ao menos uma UF e um cargo.");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setLogs([]);

    const tseFetch: TseFetch = ponteActive ? createPonteFetch() : fetch;
    const token = secret.trim();
    const maxFichas = Number.parseInt(limit, 10);
    const cap = Number.isFinite(maxFichas) && maxFichas > 0 ? maxFichas : null;
    const expensesOnly = syncMode === "gastos";
    const parallel = Math.max(1, concurrency);
    const cache = createIngestBuffer(token);

    try {
      log(
        ponteActive
          ? "Ponte ativa: este celular consulta o TSE e a Vercel só grava o cache."
          : "Testando se este celular consegue ler o TSE…",
      );

      const access = await probeAccess(tseFetch);
      if (access === "denied") {
        throw new Error(
          "O TSE ainda bloqueou este IP. Troque para dados móveis e tente de novo.",
        );
      }
      if (access === "cors") {
        throw new Error("cors");
      }

      const jobs = planJobs(selectedUfs, selectedCargos);
      const directory = await fetchPartyDirectory(controller.signal, tseFetch);
      log(
        `Diretório de partidos: ${directory.length} siglas. ${parallel} pedidos em paralelo, ${delayMs}ms entre cada um.`,
      );
      if (expensesOnly) {
        log("Modo diário: só atualiza prestação de contas (gastos).");
      }

      for (const job of jobs) {
        if (controller.signal.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }

        const config = getCargoConfig(job.cargo, job.uf);
        const partyNumbers = partyNumbersFromDirectory(directory);
        const listKey = makeCandidateListCacheKey(job.uf, job.cargo);
        let candidatos: CandidateListItem[] | undefined;

        if (expensesOnly) {
          const cachedList = await readCachedRecords<CandidateListItem[]>(
            token,
            [listKey],
          );
          candidatos = cachedList.get(listKey) ?? undefined;
          if (candidatos) {
            log(
              `${job.uf} · ${config.label}: lista em cache, ${candidatos.length} candidatos.`,
            );
          }
        }

        if (!candidatos) {
          const chunkByParty = config.proporcional && partyNumbers.length > 0;
          log(
            chunkByParty
              ? `${job.uf} · ${config.label}: baixando lista em ${partyNumbers.length} partidos…`
              : `${job.uf} · ${config.label}: baixando lista…`,
          );
          candidatos = chunkByParty
            ? await listCandidatesChunked(
                job,
                controller.signal,
                tseFetch,
                partyNumbers,
                delayMs,
                (done, total, found) => {
                  if (done === total || done % 5 === 0) {
                    log(
                      `${job.uf} · ${config.label}: partidos ${done}/${total}, ${found} candidatos.`,
                    );
                  }
                },
                parallel,
              )
            : await listCandidates(job, controller.signal, tseFetch);
          cache.enqueue([{ key: listKey, value: candidatos }]);
          await cache.flush();
          log(
            `${job.uf} · ${config.label}: ${candidatos.length} candidatos na lista.`,
          );
        }

        const partyExpenses = new Map<string, GastosPartido>();
        const electionUf = getElectionUf(job.cargo, job.uf);
        const partidos = partiesFromCandidates(candidatos, directory);

        if (config.proporcional) {
          cache.enqueue([
            {
              key: makePartyListCacheKey(job.uf, job.cargo),
              value: partidos,
            },
          ]);
        }

        if (partidos.length > 0 && (config.proporcional || expensesOnly || includeFichas)) {
          let publicados = 0;
          await mapPool(partidos, parallel, async (partido) => {
            const gastos = await withRetry(
              () =>
                fetchPartyExpenses(
                  electionUf,
                  partido.numero,
                  partido.sigla,
                  controller.signal,
                  tseFetch,
                  directory,
                ),
              3,
              400,
              controller.signal,
            );
            if (gastos.disponivel) {
              publicados += 1;
            }
            partyExpenses.set(partido.numero, gastos);
            if (config.proporcional) {
              cache.enqueue([
                {
                  key: makePartyCacheKey(job.uf, job.cargo, partido.numero),
                  value: assembleLegenda({
                    uf: job.uf,
                    cargo: job.cargo,
                    partyNumber: partido.numero,
                    nome: partido.nome,
                    sigla: partido.sigla,
                    candidatosNoPartido: partido.totalCandidatos,
                    gastosPartido: gastos,
                  }),
                },
              ]);
            }
            if (delayMs > 0) {
              await sleep(delayMs, controller.signal);
            }
          });
          await cache.flush();

          if (config.proporcional) {
            log(
              `${job.uf} · ${config.label}: gastos de partido ${publicados}/${partidos.length} publicados.`,
            );
          }
        }

        if (!expensesOnly && !includeFichas) {
          continue;
        }

        const slice = cap ? candidatos.slice(0, cap) : candidatos;
        const fichaKeys = slice.map((candidato) =>
          makeCandidateCacheKey(job.uf, job.cargo, candidato.numero),
        );
        const cachedFichas = await readCachedRecords<CandidatoColinha>(
          token,
          fichaKeys,
        );

        let done = 0;
        let gastosAtualizados = 0;
        await mapPool(slice, parallel, async (candidato) => {
          const cacheKey = makeCandidateCacheKey(
            job.uf,
            job.cargo,
            candidato.numero,
          );
          const cached = cachedFichas.get(cacheKey);
          const gastos = partyExpenses.get(
            partyNumberFromCandidateNumber(candidato.numero),
          );
          const shouldHydrate = !expensesOnly && (!skipCached || !cached);

          try {
            if (shouldHydrate) {
              const ficha = await withRetry(
                () =>
                  hydrateCandidate(
                    {
                      uf: job.uf,
                      cargo: job.cargo,
                      numero: candidato.numero,
                      candidateId: candidato.id,
                      partido: candidato.partido,
                      nomeUrna: candidato.nomeUrna,
                      fotoUrl: candidato.fotoUrl,
                      situacao: candidato.situacao,
                    },
                    controller.signal,
                    tseFetch,
                    gastos,
                  ),
                3,
                400,
                controller.signal,
              );
              cache.enqueue([{ key: cacheKey, value: ficha }]);
            } else {
              const accounts = await withRetry(
                () =>
                  fetchCandidateAccounts(
                    {
                      uf: job.uf,
                      cargo: job.cargo,
                      numero: candidato.numero,
                      candidateId: candidato.id,
                    },
                    controller.signal,
                    tseFetch,
                  ),
                3,
                400,
                controller.signal,
              );
              const partyGastos =
                gastos ??
                (await fetchPartyExpenses(
                  electionUf,
                  partyNumberFromCandidateNumber(candidato.numero),
                  candidato.partido,
                  controller.signal,
                  tseFetch,
                  directory,
                ));
              const base = cached ?? candidateFromListItem(candidato, partyGastos);
              cache.enqueue([
                {
                  key: cacheKey,
                  value: applyCandidateExpenses(base, accounts, partyGastos),
                },
              ]);
              gastosAtualizados += 1;
            }
          } catch (error) {
            if (!cached) {
              cache.enqueue([
                {
                  key: cacheKey,
                  value: candidateFromListItem(candidato, gastos),
                },
              ]);
            }
            log(
              `${candidato.numero} ${candidato.nomeUrna}: ${error instanceof Error ? error.message : "erro"}.`,
            );
          }

          done += 1;
          if (done % 25 === 0 || done === slice.length) {
            log(
              `${job.uf} · ${config.label}: ${expensesOnly ? "gastos" : "fichas"} ${done}/${slice.length}.`,
            );
          }

          if (delayMs > 0) {
            await sleep(delayMs, controller.signal);
          }
        });
        await cache.flush();

        if (gastosAtualizados > 0) {
          log(
            `${job.uf} · ${config.label}: ${gastosAtualizados} prestações de contas atualizadas.`,
          );
        }
      }

      await cache.flush();
      log("Sincronização concluída. Pode fechar esta página.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        log("Sincronização interrompida.");
      } else if (error instanceof Error && error.message === "cors") {
        log(
          "O navegador bloqueou a leitura direta do TSE (CORS). Use o modo ponte abaixo.",
        );
      } else {
        log(error instanceof Error ? error.message : "Falha na sincronização.");
      }
    } finally {
      try {
        await cache.flush();
      } catch {
        // o lote final já foi tentado; o log acima descreve a falha
      }
      setRunning(false);
      abortRef.current = null;
    }
  }

  if (!configured) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-console-ink">
          Sincronizar cache do TSE
        </h1>
        <p className="mt-3 text-console-muted">
          Defina a variável <code className="font-mono">ADMIN_SYNC_SECRET</code>{" "}
          na Vercel para habilitar esta página.
        </p>
      </main>
    );
  }

  if (!unlocked) {
    return (
      <main className="mx-auto max-w-md px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-console-ink">
          Sincronizar cache do TSE
        </h1>
        <p className="mt-3 text-sm text-console-muted">
          Abra esta página no celular, com dados móveis. O aparelho consulta o
          TSE e a Vercel só guarda o resultado.
        </p>
        <form onSubmit={unlock} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-bold text-console-ink">Senha admin</span>
            <input
              type="password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-console-edge bg-console px-3 text-console-ink"
              autoComplete="current-password"
              required
            />
          </label>
          {authError ? (
            <p className="text-sm text-coral">{authError}</p>
          ) : null}
          <button
            type="submit"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-accent px-4 font-bold text-white"
          >
            Entrar
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-bold text-console-ink">
        Sincronizar cache do TSE
      </h1>
      <p className="mt-2 text-sm text-console-muted">
        {ponteActive
          ? "Ponte ligada: as consultas saem deste celular, pelo site do TSE."
          : "Use esta página no celular. Se o navegador bloquear o TSE, ative o modo ponte."}
      </p>

      <section className="mt-6 rounded-2xl border border-console-edge bg-console p-4">
        <h2 className="font-bold text-console-ink">UFs</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {UF_OPTIONS.map((uf) => {
            const active = selectedUfs.includes(uf.value);
            return (
              <button
                key={uf.value}
                type="button"
                onClick={() => toggleUf(uf.value)}
                className={`h-11 rounded-xl px-3 text-sm font-bold ${
                  active
                    ? "bg-accent text-white"
                    : "bg-console-deep text-console-muted"
                }`}
              >
                {uf.value}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-console-edge bg-console p-4">
        <h2 className="font-bold text-console-ink">Cargos</h2>
        <div className="mt-3 grid gap-2">
          {UNIQUE_CARGOS.map((cargo) => (
            <label key={cargo.slug} className="flex min-h-12 items-center gap-3">
              <input
                type="checkbox"
                checked={selectedCargos.includes(cargo.slug)}
                onChange={() => toggleCargo(cargo.slug)}
                className="size-5 accent-accent"
              />
              <span className="text-console-ink">{cargo.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="mt-4 space-y-3 rounded-2xl border border-console-edge bg-console p-4">
        <h2 className="font-bold text-console-ink">O que sincronizar</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setSyncMode("completo")}
            className={`min-h-12 rounded-xl px-3 text-sm font-bold ${
              syncMode === "completo"
                ? "bg-accent text-white"
                : "bg-console-deep text-console-muted"
            }`}
          >
            Completa
          </button>
          <button
            type="button"
            onClick={() => setSyncMode("gastos")}
            className={`min-h-12 rounded-xl px-3 text-sm font-bold ${
              syncMode === "gastos"
                ? "bg-accent text-white"
                : "bg-console-deep text-console-muted"
            }`}
          >
            Só gastos (diário)
          </button>
        </div>
        <p className="text-sm text-console-muted">
          {syncMode === "gastos"
            ? "Reconsulta a prestação de contas do TSE e substitui os gastos no cache. Use todo dia; listas e bens ficam como estão."
            : "Baixa listas e fichas. Gastos de quem já está no cache também são atualizados."}
        </p>
        {syncMode === "completo" ? (
          <>
            <label className="flex min-h-12 items-center gap-3">
              <input
                type="checkbox"
                checked={includeFichas}
                onChange={(event) => setIncludeFichas(event.target.checked)}
                className="size-5 accent-accent"
              />
              <span className="text-console-ink">
                Baixar fichas completas (bens, gastos e certidões)
              </span>
            </label>
            <label className="flex min-h-12 items-center gap-3">
              <input
                type="checkbox"
                checked={skipCached}
                onChange={(event) => setSkipCached(event.target.checked)}
                className="size-5 accent-accent"
              />
              <span className="text-console-ink">
                Pular bens e certidões já no cache (gastos sempre atualizam)
              </span>
            </label>
          </>
        ) : null}
        <label className="block">
          <span className="text-sm text-console-muted">
            Pedidos em paralelo
          </span>
          <input
            type="number"
            min={1}
            max={12}
            step={1}
            value={concurrency}
            onChange={(event) =>
              setConcurrency(Math.max(1, Number(event.target.value) || 1))
            }
            className="mt-2 h-12 w-full rounded-xl border border-console-edge bg-console-deep px-3 text-console-ink"
          />
        </label>
        <label className="block">
          <span className="text-sm text-console-muted">
            Intervalo entre pedidos (ms)
          </span>
          <input
            type="number"
            min={0}
            step={50}
            value={delayMs}
            onChange={(event) => setDelayMs(Number(event.target.value) || 0)}
            className="mt-2 h-12 w-full rounded-xl border border-console-edge bg-console-deep px-3 text-console-ink"
          />
        </label>
        <p className="text-sm text-console-muted">
          Se o TSE começar a responder 403, baixe o paralelo para 3 e suba o
          intervalo para 150ms.
        </p>
        <label className="block">
          <span className="text-sm text-console-muted">
            Limite de fichas por cargo (vazio = todas)
          </span>
          <input
            type="number"
            min={1}
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            placeholder="Ex.: 20 para um teste"
            className="mt-2 h-12 w-full rounded-xl border border-console-edge bg-console-deep px-3 text-console-ink"
          />
        </label>
      </section>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={startSync}
          className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-accent px-4 font-bold text-white"
        >
          {running
            ? "Parar"
            : syncMode === "gastos"
              ? "Atualizar gastos neste celular"
              : "Sincronizar neste celular"}
        </button>
        <a
          href={TSE_PAGE_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-12 items-center justify-center rounded-xl border border-console-edge px-4 font-bold text-console-ink"
        >
          Abrir site do TSE
        </a>
      </div>

      <p className="mt-4 text-sm text-console-muted" aria-live="polite">
        {status}
      </p>

      {!ponteActive ? (
        <section className="mt-6 rounded-2xl border border-coral/40 bg-console p-4">
          <h2 className="font-bold text-console-ink">Modo ponte</h2>
          <p className="mt-2 text-sm text-console-muted">
            No Chrome do Android o atalho javascript não abre. Use a página de
            instalação no Firefox ou no Kiwi.
          </p>
          <a
            href="/admin/ponte"
            className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-xl bg-coral-deep px-4 font-bold text-coral-ink"
          >
            Ativar ponte neste tablet
          </a>
          <button
            type="button"
            onClick={copyBookmarklet}
            className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-xl border border-console-edge px-4 font-bold text-console-ink"
          >
            {copied ? "Atalho copiado" : "Copiar atalho (Firefox / iPhone)"}
          </button>
        </section>
      ) : null}

      {logs.length > 0 ? (
        <ol className="mt-6 space-y-2 rounded-2xl border border-console-edge bg-console-deep p-4 font-mono text-xs text-console-muted">
          {logs.map((entry) => (
            <li key={entry.id}>{entry.text}</li>
          ))}
        </ol>
      ) : null}
    </main>
  );
}
