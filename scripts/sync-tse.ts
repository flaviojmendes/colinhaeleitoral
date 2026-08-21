import { loadEnvConfig } from "@next/env";
import { UF_OPTIONS, getCargoConfig, getCargoFromParam } from "@/lib/cargos";
import { getCuriosidades } from "@/lib/curiosidades";
import { kv } from "@/lib/kv";
import { tseFetch } from "@/lib/tse-fetch";
import {
  TSE_BASE_URL,
  TSE_ELECTION_ID,
  listCandidates,
  listParties,
  lookupCandidate,
  lookupParty,
  makeCandidateCacheKey,
  makeCandidateListCacheKey,
  makePartyCacheKey,
  makePartyListCacheKey,
} from "@/lib/tse";
import type { CargoSlug } from "@/lib/types";

const CARGOS_POR_UF: CargoSlug[] = [
  "governador",
  "senador-1",
  "deputado-federal",
  "deputado-estadual",
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
      "KV_REST_API_URL e KV_REST_API_TOKEN não chegaram no job. No GitHub: Settings → Secrets and variables → Actions → Secrets (aba Secrets). Nomes exatos em maiúsculas. Não use Variables, Codespaces nem Environment secrets.",
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
  delayMs: number,
) {
  const signal = new AbortController().signal;
  const config = getCargoConfig(cargo, uf);

  console.log(`\n→ ${uf} ${cargo}`);

  const candidatos = await listCandidates({ uf, cargo }, signal);
  await kv.set(makeCandidateListCacheKey(uf, cargo), candidatos);
  console.log(`  lista: ${candidatos.length} candidatos`);

  if (config.proporcional) {
    const partidos = await listParties({ uf, cargo }, signal);
    await kv.set(makePartyListCacheKey(uf, cargo), partidos);
    console.log(`  partidos: ${partidos.length}`);

    if (!listsOnly) {
      for (const partido of partidos) {
        try {
          const legenda = await lookupParty(
            { uf, cargo, numero: partido.numero },
            signal,
          );
          await kv.set(makePartyCacheKey(uf, cargo, partido.numero), legenda);
        } catch (error) {
          console.warn(
            `  legenda ${partido.numero} falhou:`,
            error instanceof Error ? error.message : error,
          );
        }

        await sleep(delayMs);
      }
    }
  }

  if (listsOnly) {
    return;
  }

  for (const [index, candidato] of candidatos.entries()) {
    try {
      const detalhes = await lookupCandidate(
        { uf, cargo, numero: candidato.numero },
        signal,
      );
      await kv.set(
        makeCandidateCacheKey(uf, cargo, candidato.numero),
        detalhes,
      );
    } catch (error) {
      console.warn(
        `  ${candidato.numero} ${candidato.nomeUrna} falhou:`,
        error instanceof Error ? error.message : error,
      );
    }

    if ((index + 1) % 25 === 0 || index + 1 === candidatos.length) {
      console.log(`  fichas: ${index + 1}/${candidatos.length}`);
    }

    await sleep(delayMs);
  }
}

async function main() {
  if (!process.env.CI) {
    loadEnvConfig(process.cwd());
  }
  await assertKvConfigured();
  await assertTseReachable();

  const listsOnly = hasFlag("--lists-only");
  const skipCuriosidades = hasFlag("--skip-curiosidades");
  const delayMs = Number(argValue("--delay") ?? "250") || 250;
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

  if (!cargoFilter || cargoFilter === "presidente") {
    await syncCargo("SP", "presidente", listsOnly, delayMs);
  }

  for (const uf of ufs) {
    const cargos = cargoFilter
      ? cargoFilter === "presidente"
        ? []
        : [cargoFilter]
      : CARGOS_POR_UF;

    for (const cargo of cargos) {
      await syncCargo(uf, cargo, listsOnly, delayMs);
    }

    if (!skipCuriosidades && !listsOnly && !cargoFilter) {
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
