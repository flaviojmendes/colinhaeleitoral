import { mapPool } from "@/lib/async-pool";
import {
  formatCandidateNumber,
  getCargoConfig,
  getElectionUf,
  isKnownUf,
} from "@/lib/cargos";
import { formatCompactBRL } from "@/lib/format";
import { kv } from "@/lib/kv";
import { isTseLiveEnabled } from "@/lib/tse-live";
import {
  fetchCandidateDetailsById,
  listCandidates,
} from "@/lib/tse";
import type {
  CargoSlug,
  CuriosidadeCandidato,
  CuriosidadeCategoria,
  CuriosidadeEstatistica,
  CuriosidadeItem,
  CuriosidadesResponse,
  TSEAsset,
  TSECandidateDetails,
} from "@/lib/types";

const SNAPSHOT_TTL_SECONDS = 60 * 60 * 24 * 7;
const SNAPSHOT_FRESH_MS = 60 * 60 * 1000;
const DETAIL_CONCURRENCY = 6;
const ELECTION_DAY = new Date(Date.UTC(2026, 9, 4));
const CARGOS_NO_RECORTE: CargoSlug[] = [
  "presidente",
  "governador",
  "senador-1",
];
const OCUPACOES_COMUNS = new Set([
  "deputado",
  "senador",
  "governador",
  "vereador",
  "empresário",
  "empresario",
  "advogado",
  "outros",
]);

interface CuriosidadesSnapshot {
  uf: string;
  fetchedAt: string;
  candidatos: CuriosidadeCandidato[];
}

function asNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function snapshotCacheKey(uf: string): string {
  return `curiosidades:2026:v2:${uf}`;
}

function ageOnElectionDay(isoDate: string | null | undefined): {
  idade: number | null;
  anoNascimento: number | null;
} {
  if (!isoDate) {
    return { idade: null, anoNascimento: null };
  }

  const birth = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(birth.getTime())) {
    return { idade: null, anoNascimento: null };
  }

  let idade = ELECTION_DAY.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = ELECTION_DAY.getUTCMonth() - birth.getUTCMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && ELECTION_DAY.getUTCDate() < birth.getUTCDate())
  ) {
    idade -= 1;
  }

  return {
    idade: idade >= 0 && idade < 120 ? idade : null,
    anoNascimento: birth.getUTCFullYear(),
  };
}

function previousElectionCount(details: TSECandidateDetails): number {
  const years = new Set<number>();

  for (const election of details.eleicoesAnteriores ?? []) {
    const year = asNumber(election.nrAno);
    if (year !== null && year < 2026) {
      years.add(year);
    }
  }

  return years.size;
}

function patrimonioFromDetails(details: TSECandidateDetails): number | null {
  if (Array.isArray(details.bens) && details.bens.length > 0) {
    return details.bens.reduce(
      (total, bem) => total + (asNumber(bem.valor) ?? 0),
      0,
    );
  }

  return asNumber(details.totalDeBens);
}

function notableAsset(bens: TSEAsset[] | null | undefined) {
  if (!Array.isArray(bens) || bens.length === 0) {
    return undefined;
  }

  let best: { descricao: string; valor: number; tipo?: string | null } | undefined;

  for (const bem of bens) {
    const valor = asNumber(bem.valor);
    if (valor === null || valor <= 0) {
      continue;
    }

    if (!best || valor > best.valor) {
      best = {
        descricao: bem.descricao ?? bem.descricaoDeTipoDeBem ?? "Bem declarado",
        valor,
        tipo: bem.descricaoDeTipoDeBem ?? null,
      };
    }
  }

  return best;
}

function isReelection(details: TSECandidateDetails, cargo: CargoSlug): boolean {
  if (details.st_REELEICAO) {
    return true;
  }

  const occupation = (details.ocupacao ?? "").toLocaleLowerCase("pt-BR");
  if (cargo === "governador") {
    return occupation.includes("governador");
  }
  if (cargo === "senador-1" || cargo === "senador-2") {
    return occupation.includes("senador");
  }
  if (cargo === "presidente") {
    return occupation.includes("presidente");
  }

  return false;
}

function toCandidato(
  details: TSECandidateDetails,
  cargo: CargoSlug,
  uf: string,
): CuriosidadeCandidato | null {
  const config = getCargoConfig(cargo, uf);
  const numero = formatCandidateNumber(
    details.numero ?? "",
    config.maxLength,
  );

  if (!numero || numero === "0".repeat(config.maxLength)) {
    return null;
  }

  const { idade, anoNascimento } = ageOnElectionDay(details.dataDeNascimento);
  const electionUf = getElectionUf(cargo, uf);

  return {
    id: String(details.id),
    nomeUrna: details.nomeUrna ?? "Nome não informado",
    nomeCompleto: details.nomeCompleto ?? undefined,
    numero,
    partido:
      details.partido?.sigla ??
      details.partido?.nome ??
      "Partido não informado",
    cargo,
    cargoLabel: config.label,
    uf: electionUf,
    fotoUrl: details.fotoUrl ?? null,
    patrimonioDeclarado: patrimonioFromDetails(details),
    idade,
    anoNascimento,
    ocupacao: details.ocupacao?.trim() || null,
    grauInstrucao: details.grauInstrucao?.trim() || null,
    eleicoesAnteriores: previousElectionCount(details),
    reeleicao: isReelection(details, cargo),
    bemNotavel: notableAsset(details.bens),
  };
}

async function fetchSnapshot(
  uf: string,
  signal: AbortSignal,
): Promise<CuriosidadesSnapshot> {
  const jobs = CARGOS_NO_RECORTE.map(async (cargo) => {
    const list = await listCandidates({ uf, cargo }, signal);
    const electionUf = getElectionUf(cargo, uf);
    const details = await mapPool(list, DETAIL_CONCURRENCY, (candidate) =>
      fetchCandidateDetailsById(electionUf, candidate.id, signal),
    );

    return details.flatMap((item) => {
      if (!item) {
        return [];
      }

      const mapped = toCandidato(item, cargo, uf);
      return mapped ? [mapped] : [];
    });
  });

  const groups = await Promise.all(jobs);
  const byId = new Map<string, CuriosidadeCandidato>();

  for (const candidate of groups.flat()) {
    byId.set(`${candidate.cargo}:${candidate.id}`, candidate);
  }

  return {
    uf,
    fetchedAt: new Date().toISOString(),
    candidatos: Array.from(byId.values()),
  };
}

async function readSnapshotCache(
  uf: string,
): Promise<CuriosidadesSnapshot | null> {
  try {
    return await kv.get<CuriosidadesSnapshot>(snapshotCacheKey(uf));
  } catch {
    return null;
  }
}

async function writeSnapshotCache(snapshot: CuriosidadesSnapshot) {
  try {
    await kv.set(snapshotCacheKey(snapshot.uf), snapshot, SNAPSHOT_TTL_SECONDS);
  } catch {
    // Falha de cache não deve esconder um recorte válido do TSE.
  }
}

function matchesCargo(candidate: CuriosidadeCandidato, cargo?: string) {
  if (!cargo || cargo === "todos") {
    return true;
  }

  if (cargo === "senador") {
    return candidate.cargo === "senador-1" || candidate.cargo === "senador-2";
  }

  return candidate.cargo === cargo;
}

function matchesBusca(candidate: CuriosidadeCandidato, busca?: string) {
  if (!busca) {
    return true;
  }

  const term = busca.toLocaleLowerCase("pt-BR");
  return [
    candidate.nomeUrna,
    candidate.nomeCompleto,
    candidate.partido,
    candidate.ocupacao,
    candidate.numero,
  ]
    .filter(Boolean)
    .some((value) => value!.toLocaleLowerCase("pt-BR").includes(term));
}

function toItem(
  candidate: CuriosidadeCandidato,
  categoria: CuriosidadeCategoria,
  posicao: number,
  destaquePrincipal: string,
  subtituloDestaque: string,
  curiosidadeTexto: string,
  badge?: string,
): CuriosidadeItem {
  return {
    id: candidate.id,
    posicao,
    nomeUrna: candidate.nomeUrna,
    nomeCompleto: candidate.nomeCompleto,
    numero: candidate.numero,
    partido: candidate.partido,
    cargo: candidate.cargo,
    cargoLabel: candidate.cargoLabel,
    uf: candidate.uf,
    fotoUrl: candidate.fotoUrl,
    destaquePrincipal,
    subtituloDestaque,
    curiosidadeTexto,
    patrimonioDeclarado: candidate.patrimonioDeclarado,
    idade: candidate.idade,
    anoNascimento: candidate.anoNascimento,
    ocupacao: candidate.ocupacao,
    eleicoesDisputadas: candidate.eleicoesAnteriores,
    bemNotavel: candidate.bemNotavel,
    categoria,
    badge,
  };
}

function ocupacaoPeso(ocupacao: string): number {
  return OCUPACOES_COMUNS.has(ocupacao.toLocaleLowerCase("pt-BR")) ? 1 : 0;
}

function rankCategoria(
  pool: CuriosidadeCandidato[],
  categoria: CuriosidadeCategoria,
): CuriosidadeItem[] {
  switch (categoria) {
    case "mais-ricos": {
      return pool
        .filter(
          (candidate) =>
            candidate.patrimonioDeclarado !== null &&
            candidate.patrimonioDeclarado > 0,
        )
        .sort(
          (left, right) =>
            (right.patrimonioDeclarado ?? 0) - (left.patrimonioDeclarado ?? 0),
        )
        .map((candidate, index) =>
          toItem(
            candidate,
            categoria,
            index + 1,
            formatCompactBRL(candidate.patrimonioDeclarado),
            "Patrimônio declarado ao TSE",
            `${candidate.nomeUrna} declarou ${formatCompactBRL(candidate.patrimonioDeclarado)} em bens na ficha desta candidatura.`,
            candidate.patrimonioDeclarado !== null &&
              candidate.patrimonioDeclarado >= 1_000_000_000
              ? "Acima de R$ 1 bi"
              : undefined,
          ),
        );
    }

    case "menos-patrimonio": {
      return pool
        .filter((candidate) => candidate.patrimonioDeclarado !== null)
        .sort(
          (left, right) =>
            (left.patrimonioDeclarado ?? 0) - (right.patrimonioDeclarado ?? 0),
        )
        .map((candidate, index) =>
          toItem(
            candidate,
            categoria,
            index + 1,
            formatCompactBRL(candidate.patrimonioDeclarado),
            candidate.patrimonioDeclarado === 0
              ? "Nenhum bem declarado"
              : "Patrimônio declarado ao TSE",
            candidate.patrimonioDeclarado === 0
              ? `${candidate.nomeUrna} registrou R$ 0,00 na declaração de bens desta candidatura.`
              : `${candidate.nomeUrna} está entre os menores totais de bens deste recorte.`,
            candidate.patrimonioDeclarado === 0 ? "R$ 0,00" : undefined,
          ),
        );
    }

    case "mais-jovens": {
      return pool
        .filter((candidate) => candidate.idade !== null)
        .sort((left, right) => (left.idade ?? 0) - (right.idade ?? 0))
        .map((candidate, index) =>
          toItem(
            candidate,
            categoria,
            index + 1,
            `${candidate.idade} anos`,
            candidate.anoNascimento
              ? `Nascido em ${candidate.anoNascimento}`
              : "Idade no 1º turno",
            `${candidate.nomeUrna} completa ${candidate.idade} anos até o primeiro turno de 2026.`,
          ),
        );
    }

    case "mais-experientes": {
      return pool
        .filter((candidate) => candidate.idade !== null)
        .sort((left, right) => (right.idade ?? 0) - (left.idade ?? 0))
        .map((candidate, index) =>
          toItem(
            candidate,
            categoria,
            index + 1,
            `${candidate.idade} anos`,
            candidate.anoNascimento
              ? `Nascido em ${candidate.anoNascimento}`
              : "Idade no 1º turno",
            `${candidate.nomeUrna} tem ${candidate.idade} anos no primeiro turno de 2026.`,
          ),
        );
    }

    case "recordistas-eleicoes": {
      return pool
        .filter((candidate) => candidate.eleicoesAnteriores > 0)
        .sort(
          (left, right) =>
            right.eleicoesAnteriores - left.eleicoesAnteriores,
        )
        .map((candidate, index) =>
          toItem(
            candidate,
            categoria,
            index + 1,
            candidate.eleicoesAnteriores === 1
              ? "1 eleição anterior"
              : `${candidate.eleicoesAnteriores} eleições anteriores`,
            "Histórico no TSE, além de 2026",
            `${candidate.nomeUrna} já aparece em ${candidate.eleicoesAnteriores} eleição${candidate.eleicoesAnteriores === 1 ? "" : "ões"} anterior${candidate.eleicoesAnteriores === 1 ? "" : "es"} no TSE.`,
            candidate.eleicoesAnteriores >= 8 ? "Veterano" : undefined,
          ),
        );
    }

    case "estreantes": {
      return pool
        .filter((candidate) => candidate.eleicoesAnteriores === 0)
        .sort((left, right) => left.nomeUrna.localeCompare(right.nomeUrna, "pt-BR"))
        .map((candidate, index) =>
          toItem(
            candidate,
            categoria,
            index + 1,
            "Primeira disputa",
            "Sem eleição anterior no TSE",
            `${candidate.nomeUrna} não tem eleição anterior registrada no TSE. 2026 é a primeira aparição nesse histórico.`,
            "Estreante",
          ),
        );
    }

    case "ocupacoes": {
      return [...pool]
        .filter((candidate) => candidate.ocupacao)
        .sort((left, right) => {
          const weight =
            ocupacaoPeso(left.ocupacao ?? "") - ocupacaoPeso(right.ocupacao ?? "");
          if (weight !== 0) {
            return weight;
          }

          return (left.ocupacao ?? "").localeCompare(
            right.ocupacao ?? "",
            "pt-BR",
          );
        })
        .map((candidate, index) =>
          toItem(
            candidate,
            categoria,
            index + 1,
            candidate.ocupacao ?? "Não informada",
            candidate.grauInstrucao
              ? `Escolaridade: ${candidate.grauInstrucao}`
              : "Ocupação na ficha do TSE",
            `${candidate.nomeUrna} declarou a ocupação “${candidate.ocupacao}” nesta candidatura.`,
          ),
        );
    }

    case "reeleicao": {
      return pool
        .filter((candidate) => candidate.reeleicao)
        .sort((left, right) => left.nomeUrna.localeCompare(right.nomeUrna, "pt-BR"))
        .map((candidate, index) =>
          toItem(
            candidate,
            categoria,
            index + 1,
            "Reeleição",
            `Concorre de novo a ${candidate.cargoLabel.toLocaleLowerCase("pt-BR")}`,
            `${candidate.nomeUrna} declara ocupar ${candidate.cargoLabel.toLocaleLowerCase("pt-BR")} hoje e concorre de novo ao mesmo cargo.`,
            "Reeleição",
          ),
        );
    }
  }
}

function rankTodas(pool: CuriosidadeCandidato[]): CuriosidadeItem[] {
  const picks: Array<[CuriosidadeCategoria, CuriosidadeCandidato | undefined, string]> = [
    [
      "mais-ricos",
      [...pool]
        .filter((candidate) => (candidate.patrimonioDeclarado ?? 0) > 0)
        .sort(
          (left, right) =>
            (right.patrimonioDeclarado ?? 0) - (left.patrimonioDeclarado ?? 0),
        )[0],
      "Maior patrimônio",
    ],
    [
      "menos-patrimonio",
      [...pool]
        .filter((candidate) => candidate.patrimonioDeclarado === 0)[0] ??
        [...pool]
          .filter((candidate) => candidate.patrimonioDeclarado !== null)
          .sort(
            (left, right) =>
              (left.patrimonioDeclarado ?? 0) - (right.patrimonioDeclarado ?? 0),
          )[0],
      "Menor patrimônio",
    ],
    [
      "recordistas-eleicoes",
      [...pool]
        .filter((candidate) => candidate.eleicoesAnteriores > 0)
        .sort(
          (left, right) =>
            right.eleicoesAnteriores - left.eleicoesAnteriores,
        )[0],
      "Mais eleições anteriores",
    ],
    [
      "estreantes",
      pool.find((candidate) => candidate.eleicoesAnteriores === 0),
      "Primeira disputa",
    ],
    [
      "mais-jovens",
      [...pool]
        .filter((candidate) => candidate.idade !== null)
        .sort((left, right) => (left.idade ?? 0) - (right.idade ?? 0))[0],
      "Mais jovem",
    ],
    [
      "mais-experientes",
      [...pool]
        .filter((candidate) => candidate.idade !== null)
        .sort((left, right) => (right.idade ?? 0) - (left.idade ?? 0))[0],
      "Mais experiente",
    ],
    ["reeleicao", pool.find((candidate) => candidate.reeleicao), "Reeleição"],
  ];

  const seen = new Set<string>();
  const items: CuriosidadeItem[] = [];

  for (const [categoria, candidate, badge] of picks) {
    if (!candidate || seen.has(candidate.id)) {
      continue;
    }

    seen.add(candidate.id);
    const ranked = rankCategoria([candidate], categoria)[0];
    if (ranked) {
      items.push({
        ...ranked,
        posicao: items.length + 1,
        badge,
      });
    }
  }

  return items;
}

function buildStats(pool: CuriosidadeCandidato[]): CuriosidadeEstatistica[] {
  const withAssets = pool.filter(
    (candidate) => candidate.patrimonioDeclarado !== null,
  );
  const richest = [...withAssets].sort(
    (left, right) =>
      (right.patrimonioDeclarado ?? 0) - (left.patrimonioDeclarado ?? 0),
  )[0];
  const zeroCount = pool.filter(
    (candidate) => candidate.patrimonioDeclarado === 0,
  ).length;
  const youngest = [...pool]
    .filter((candidate) => candidate.idade !== null)
    .sort((left, right) => (left.idade ?? 0) - (right.idade ?? 0))[0];
  const veteran = [...pool].sort(
    (left, right) => right.eleicoesAnteriores - left.eleicoesAnteriores,
  )[0];

  return [
    {
      id: "stat-patrimonio-max",
      titulo: "Maior patrimônio",
      valor: richest
        ? formatCompactBRL(richest.patrimonioDeclarado)
        : "—",
      descricao: richest
        ? `${richest.nomeUrna} · ${richest.partido}`
        : "Ainda sem declaração neste recorte",
      icone: "patrimonio",
    },
    {
      id: "stat-zero-bens",
      titulo: "Declararam R$ 0,00",
      valor: String(zeroCount),
      descricao: "Candidatos com zero bens neste recorte",
      icone: "diversidade",
    },
    {
      id: "stat-recorde-eleicoes",
      titulo: "Mais eleições anteriores",
      valor: veteran ? String(veteran.eleicoesAnteriores) : "—",
      descricao: veteran
        ? `${veteran.nomeUrna} · ${veteran.partido}`
        : "Histórico do TSE",
      icone: "eleicoes",
    },
    {
      id: "stat-mais-jovem",
      titulo: "Mais jovem",
      valor: youngest ? `${youngest.idade} anos` : "—",
      descricao: youngest
        ? `${youngest.nomeUrna} · ${youngest.partido}`
        : "Idade no 1º turno",
      icone: "idade",
    },
  ];
}

const CATEGORIAS = new Set<CuriosidadeCategoria | "todas">([
  "todas",
  "mais-ricos",
  "menos-patrimonio",
  "mais-jovens",
  "mais-experientes",
  "recordistas-eleicoes",
  "estreantes",
  "ocupacoes",
  "reeleicao",
]);

export function parseCuriosidadeCategoria(
  value: string | undefined,
): CuriosidadeCategoria | "todas" {
  if (value && CATEGORIAS.has(value as CuriosidadeCategoria | "todas")) {
    return value as CuriosidadeCategoria | "todas";
  }

  return "todas";
}

export async function getCuriosidades(
  params: {
    uf?: string;
    categoria?: CuriosidadeCategoria | "todas";
    cargo?: string;
    busca?: string;
    limite?: number;
  },
  signal: AbortSignal,
): Promise<CuriosidadesResponse> {
  const uf = params.uf && isKnownUf(params.uf) ? params.uf : "SP";
  const categoria = params.categoria ?? "todas";
  const cached = await readSnapshotCache(uf);
  const cacheIsFresh =
    cached !== null &&
    Date.now() - new Date(cached.fetchedAt).getTime() < SNAPSHOT_FRESH_MS;

  let snapshot = cached;
  let fonte: CuriosidadesResponse["fonte"] = "cache";

  if (!cacheIsFresh && isTseLiveEnabled()) {
    try {
      snapshot = await fetchSnapshot(uf, signal);
      await writeSnapshotCache(snapshot);
      fonte = "tse";
    } catch (error) {
      if (!cached) {
        throw error;
      }
      snapshot = cached;
      fonte = "cache";
    }
  }

  if (!snapshot) {
    throw new Error("Sem dados do TSE para este estado.");
  }

  const pool = snapshot.candidatos.filter(
    (candidate) =>
      matchesCargo(candidate, params.cargo) &&
      matchesBusca(candidate, params.busca),
  );

  let itens =
    categoria === "todas" ? rankTodas(pool) : rankCategoria(pool, categoria);

  if (params.limite && params.limite > 0) {
    itens = itens.slice(0, params.limite);
  }

  return {
    itens,
    estatisticas: buildStats(pool),
    totalItens: itens.length,
    totalCandidatos: pool.length,
    categoria,
    uf,
    cargo: params.cargo,
    atualizadoEm: snapshot.fetchedAt,
    fonte,
  };
}
