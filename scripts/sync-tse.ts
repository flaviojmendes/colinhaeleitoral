import { loadEnvConfig } from "@next/env";
import { mapPool, sleep, withRetry } from "@/lib/async-pool";
import { UF_OPTIONS, getCargoConfig, getCargoFromParam, getElectionUf } from "@/lib/cargos";
import { getCuriosidades } from "@/lib/curiosidades";
import { kv } from "@/lib/kv";
import { tseFetch } from "@/lib/tse-fetch";
import {
  TSE_BASE_URL,
  TSE_ELECTION_ID,
  applyCandidateExpenses,
  assembleLegenda,
  fetchCandidateAccounts,
  fetchPartyDirectory,
  fetchPartyExpenses,
  hydrateCandidate,
  listCandidates,
  makeCandidateCacheKey,
  makeCandidateListCacheKey,
  makePartyCacheKey,
  makePartyListCacheKey,
  partiesFromCandidates,
  partyNumberFromCandidateNumber,
} from "@/lib/tse";
import type { CandidatoColinha, CargoSlug, GastosPartido, TSEParty } from "@/lib/types";

const CARGOS_POR_UF: CargoSlug[] = [
  "governador",
  "senador-1",
  "deputado-federal",
  "deputado-estadual",
];

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function argNumber(flag: string, fallback: number) {
  const raw = argValue(flag);
  if (raw === undefined) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function assertTseReachable() {
  const response = await tseFetch(
    `${TSE_BASE_URL}/prestador/campanha/partidos/${TSE_ELECTION_ID}`,
    { cache: "no-store" },
  );

  if (response.ok) {
    return;
  }

  throw new Error(
    `TSE respondeu ${response.status}. O Akamai bloqueia VPN, Zscaler, Vercel e IPs do GitHub Actions. Rode este script no Wi-Fi de casa, sem VPN.`,
  );
}

async function assertKvConfigured() {
  const url = process.env.KV_REST_API_URL?.trim();
  const token = process.env.KV_REST_API_TOKEN?.trim();

  if (url && token) {
    return;
  }

  if (process.env.CI) {
    throw new Error(
      "KV_REST_API_URL e KV_REST_API_TOKEN não chegaram no job. No GitHub eles estão no environment Production; o workflow precisa de environment: Production.",
    );
  }

  throw new Error(
    "Defina KV_REST_API_URL e KV_REST_API_TOKEN no .env.local (as mesmas do projeto na Vercel). Sem isso o cache não chega na produção.",
  );
}

async function syncCargo(
  uf: string,
  cargo: CargoSlug,
  listsOnly: boolean,
  gastosOnly: boolean,
  delayMs: number,
  concurrency: number,
  directory: TSEParty[],
) {
  const signal = new AbortController().signal;
  const config = getCargoConfig(cargo, uf);
  const electionUf = getElectionUf(cargo, uf);

  console.log(`\n→ ${uf} ${cargo} (${concurrency} em paralelo)`);

  const candidatos = await listCandidates({ uf, cargo }, signal);
  await kv.set(makeCandidateListCacheKey(uf, cargo), candidatos);
  console.log(`  lista: ${candidatos.length} candidatos`);

  const partyExpenses = new Map<string, GastosPartido>();
  const partidos = partiesFromCandidates(candidatos, directory);

  if (config.proporcional) {
    await kv.set(makePartyListCacheKey(uf, cargo), partidos);
    console.log(`  partidos: ${partidos.length}`);
  }

  if (!listsOnly && partidos.length > 0) {
    let publicados = 0;

    await mapPool(partidos, concurrency, async (partido) => {
      try {
        const gastos = await withRetry(
          () =>
            fetchPartyExpenses(
              electionUf,
              partido.numero,
              partido.sigla,
              signal,
              tseFetch,
              directory,
            ),
          3,
          400,
          signal,
        );
        partyExpenses.set(partido.numero, gastos);
        if (gastos.disponivel) {
          publicados += 1;
        }

        if (config.proporcional) {
          await kv.set(
            makePartyCacheKey(uf, cargo, partido.numero),
            assembleLegenda({
              uf,
              cargo,
              partyNumber: partido.numero,
              nome: partido.nome,
              sigla: partido.sigla,
              candidatosNoPartido: partido.totalCandidatos,
              gastosPartido: gastos,
            }),
          );
        }
      } catch (error) {
        console.warn(
          `  partido ${partido.numero} falhou:`,
          error instanceof Error ? error.message : error,
        );
      }

      if (delayMs > 0) {
        await sleep(delayMs);
      }
    });

    if (config.proporcional) {
      console.log(`  gastos de partido: ${publicados}/${partidos.length}`);
    }
  }

  if (listsOnly) {
    return;
  }

  let done = 0;

  if (gastosOnly) {
    let atualizados = 0;

    await mapPool(candidatos, concurrency, async (candidato) => {
      try {
        const cacheKey = makeCandidateCacheKey(uf, cargo, candidato.numero);
        const existing = await kv.get<CandidatoColinha>(cacheKey);
        const accounts = await withRetry(
          () =>
            fetchCandidateAccounts(
              {
                uf,
                cargo,
                numero: candidato.numero,
                candidateId: existing?.id ?? candidato.id,
              },
              signal,
              tseFetch,
            ),
          3,
          400,
          signal,
        );
        const base = existing ?? {
          ...candidato,
          tipoVoto: "candidato" as const,
          patrimonioDeclarado: null,
          totalGastos: null,
        };
        await kv.set(
          cacheKey,
          applyCandidateExpenses(
            base,
            accounts,
            partyExpenses.get(partyNumberFromCandidateNumber(candidato.numero)) ??
              existing?.gastosPartido,
          ),
        );
        atualizados += 1;
      } catch (error) {
        console.warn(
          `  ${candidato.numero} gastos falharam:`,
          error instanceof Error ? error.message : error,
        );
      }

      done += 1;
      if (done % 25 === 0 || done === candidatos.length) {
        console.log(`  gastos: ${done}/${candidatos.length}`);
      }

      if (delayMs > 0) {
        await sleep(delayMs);
      }
    });

    console.log(`  prestações atualizadas: ${atualizados}`);
    return;
  }

  await mapPool(candidatos, concurrency, async (candidato) => {
    try {
      const detalhes = await withRetry(
        () =>
          hydrateCandidate(
            {
              uf,
              cargo,
              numero: candidato.numero,
              candidateId: candidato.id,
              partido: candidato.partido,
              nomeUrna: candidato.nomeUrna,
              fotoUrl: candidato.fotoUrl,
              situacao: candidato.situacao,
            },
            signal,
            tseFetch,
            partyExpenses.get(partyNumberFromCandidateNumber(candidato.numero)),
          ),
        3,
        400,
        signal,
      );
      await kv.set(makeCandidateCacheKey(uf, cargo, candidato.numero), detalhes);
    } catch (error) {
      console.warn(
        `  ${candidato.numero} ${candidato.nomeUrna} falhou:`,
        error instanceof Error ? error.message : error,
      );
    }

    done += 1;
    if (done % 25 === 0 || done === candidatos.length) {
      console.log(`  fichas: ${done}/${candidatos.length}`);
    }

    if (delayMs > 0) {
      await sleep(delayMs);
    }
  });
}

async function main() {
  if (!process.env.CI) {
    loadEnvConfig(process.cwd());
  }
  await assertKvConfigured();
  await assertTseReachable();

  const listsOnly = hasFlag("--lists-only");
  const gastosOnly = hasFlag("--gastos");
  const skipCuriosidades = hasFlag("--skip-curiosidades");
  const delayMs = argNumber("--delay", 50);
  const concurrency = Math.max(1, argNumber("--concurrency", 8));
  const ufArg = argValue("--uf")?.trim().toUpperCase();
  const cargoArg = argValue("--cargo")?.trim().toLowerCase();

  const ufs = ufArg
    ? UF_OPTIONS.filter((item) => item.value === ufArg).map((item) => item.value)
    : UF_OPTIONS.map((item) => item.value);

  if (ufs.length === 0) {
    throw new Error(`UF inválida: ${ufArg}`);
  }

  const cargoFilter = cargoArg
    ? getCargoFromParam(cargoArg, ufs[0])
    : null;

  if (cargoArg && !cargoFilter) {
    throw new Error(`Cargo inválido: ${cargoArg}`);
  }

  const directory = await fetchPartyDirectory(new AbortController().signal, tseFetch);
  console.log(
    `Diretório: ${directory.length} partidos. Concurrency ${concurrency}, delay ${delayMs}ms.`,
  );

  if (!cargoFilter || cargoFilter === "presidente") {
    await syncCargo(
      "SP",
      "presidente",
      listsOnly,
      gastosOnly,
      delayMs,
      concurrency,
      directory,
    );
  }

  for (const uf of ufs) {
    const cargos = cargoFilter
      ? cargoFilter === "presidente"
        ? []
        : [cargoFilter]
      : CARGOS_POR_UF;

    for (const cargo of cargos) {
      await syncCargo(
        uf,
        cargo,
        listsOnly,
        gastosOnly,
        delayMs,
        concurrency,
        directory,
      );
    }

    if (!skipCuriosidades && !listsOnly && !gastosOnly && !cargoFilter) {
      console.log(`\n→ curiosidades ${uf}`);
      await getCuriosidades({ uf }, new AbortController().signal);
    }
  }

  console.log("\nCache gravado no Vercel KV. A produção passa a servir esses dados.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
