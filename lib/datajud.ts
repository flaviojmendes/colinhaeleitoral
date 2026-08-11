import type {
  DataJudResponse,
  DataJudTribunalResult,
  ProcessoJudicial,
} from "@/lib/types";

const DATAJUD_BASE_URL = "https://api-publica.datajud.cnj.jus.br";

interface TribunalTarget {
  alias: string;
  nome: string;
}

interface DataJudParte {
  nome?: string | null;
  polo?: string | { nome?: string | null } | null;
  tipoParte?: string | null;
}

interface DataJudSource {
  numeroProcesso?: string | null;
  tribunal?: string | null;
  classe?: string | { nome?: string | null } | null;
  assuntos?: Array<string | { nome?: string | null }> | null;
  dataAjuizamento?: string | null;
  partes?: DataJudParte[] | null;
}

interface DataJudHit {
  _id?: string;
  _source?: DataJudSource;
}

interface DataJudSearchResponse {
  hits?: {
    total?: number | { value?: number };
    hits?: DataJudHit[];
  };
}

const STATE_TRIBUNALS: Record<string, TribunalTarget> = {
  AC: { alias: "tjac", nome: "Tribunal de Justiça do Acre" },
  AL: { alias: "tjal", nome: "Tribunal de Justiça de Alagoas" },
  AP: { alias: "tjap", nome: "Tribunal de Justiça do Amapá" },
  AM: { alias: "tjam", nome: "Tribunal de Justiça do Amazonas" },
  BA: { alias: "tjba", nome: "Tribunal de Justiça da Bahia" },
  CE: { alias: "tjce", nome: "Tribunal de Justiça do Ceará" },
  DF: { alias: "tjdft", nome: "Tribunal de Justiça do Distrito Federal" },
  ES: { alias: "tjes", nome: "Tribunal de Justiça do Espírito Santo" },
  GO: { alias: "tjgo", nome: "Tribunal de Justiça de Goiás" },
  MA: { alias: "tjma", nome: "Tribunal de Justiça do Maranhão" },
  MT: { alias: "tjmt", nome: "Tribunal de Justiça de Mato Grosso" },
  MS: { alias: "tjms", nome: "Tribunal de Justiça de Mato Grosso do Sul" },
  MG: { alias: "tjmg", nome: "Tribunal de Justiça de Minas Gerais" },
  PA: { alias: "tjpa", nome: "Tribunal de Justiça do Pará" },
  PB: { alias: "tjpb", nome: "Tribunal de Justiça da Paraíba" },
  PR: { alias: "tjpr", nome: "Tribunal de Justiça do Paraná" },
  PE: { alias: "tjpe", nome: "Tribunal de Justiça de Pernambuco" },
  PI: { alias: "tjpi", nome: "Tribunal de Justiça do Piauí" },
  RJ: { alias: "tjrj", nome: "Tribunal de Justiça do Rio de Janeiro" },
  RN: { alias: "tjrn", nome: "Tribunal de Justiça do Rio Grande do Norte" },
  RS: { alias: "tjrs", nome: "Tribunal de Justiça do Rio Grande do Sul" },
  RO: { alias: "tjro", nome: "Tribunal de Justiça de Rondônia" },
  RR: { alias: "tjrr", nome: "Tribunal de Justiça de Roraima" },
  SC: { alias: "tjsc", nome: "Tribunal de Justiça de Santa Catarina" },
  SE: { alias: "tjse", nome: "Tribunal de Justiça de Sergipe" },
  SP: { alias: "tjsp", nome: "Tribunal de Justiça de São Paulo" },
  TO: { alias: "tjto", nome: "Tribunal de Justiça do Tocantins" },
};

const FEDERAL_TRIBUNALS: Record<string, TribunalTarget> = {
  AC: { alias: "trf1", nome: "Tribunal Regional Federal da 1ª Região" },
  AL: { alias: "trf5", nome: "Tribunal Regional Federal da 5ª Região" },
  AP: { alias: "trf1", nome: "Tribunal Regional Federal da 1ª Região" },
  AM: { alias: "trf1", nome: "Tribunal Regional Federal da 1ª Região" },
  BA: { alias: "trf1", nome: "Tribunal Regional Federal da 1ª Região" },
  CE: { alias: "trf5", nome: "Tribunal Regional Federal da 5ª Região" },
  DF: { alias: "trf1", nome: "Tribunal Regional Federal da 1ª Região" },
  ES: { alias: "trf2", nome: "Tribunal Regional Federal da 2ª Região" },
  GO: { alias: "trf1", nome: "Tribunal Regional Federal da 1ª Região" },
  MA: { alias: "trf1", nome: "Tribunal Regional Federal da 1ª Região" },
  MT: { alias: "trf1", nome: "Tribunal Regional Federal da 1ª Região" },
  MS: { alias: "trf3", nome: "Tribunal Regional Federal da 3ª Região" },
  MG: { alias: "trf6", nome: "Tribunal Regional Federal da 6ª Região" },
  PA: { alias: "trf1", nome: "Tribunal Regional Federal da 1ª Região" },
  PB: { alias: "trf5", nome: "Tribunal Regional Federal da 5ª Região" },
  PR: { alias: "trf4", nome: "Tribunal Regional Federal da 4ª Região" },
  PE: { alias: "trf5", nome: "Tribunal Regional Federal da 5ª Região" },
  PI: { alias: "trf1", nome: "Tribunal Regional Federal da 1ª Região" },
  RJ: { alias: "trf2", nome: "Tribunal Regional Federal da 2ª Região" },
  RN: { alias: "trf5", nome: "Tribunal Regional Federal da 5ª Região" },
  RS: { alias: "trf4", nome: "Tribunal Regional Federal da 4ª Região" },
  RO: { alias: "trf1", nome: "Tribunal Regional Federal da 1ª Região" },
  RR: { alias: "trf1", nome: "Tribunal Regional Federal da 1ª Região" },
  SC: { alias: "trf4", nome: "Tribunal Regional Federal da 4ª Região" },
  SE: { alias: "trf5", nome: "Tribunal Regional Federal da 5ª Região" },
  SP: { alias: "trf3", nome: "Tribunal Regional Federal da 3ª Região" },
  TO: { alias: "trf1", nome: "Tribunal Regional Federal da 1ª Região" },
};

export class DataJudNotConfiguredError extends Error {
  constructor() {
    super("A consulta judicial ainda não foi configurada.");
    this.name = "DataJudNotConfiguredError";
  }
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();
}

function className(value: DataJudSource["classe"]): string | null {
  if (typeof value === "string") {
    return value;
  }

  return value?.nome ?? null;
}

function subjectNames(
  subjects: DataJudSource["assuntos"],
): string[] {
  return (subjects ?? []).flatMap((subject) => {
    if (typeof subject === "string") {
      return subject;
    }

    return subject?.nome ? [subject.nome] : [];
  });
}

function partyPolo(party: DataJudParte | undefined): string | null {
  if (!party) {
    return null;
  }

  if (typeof party.polo === "string") {
    return party.polo;
  }

  return party.polo?.nome ?? party.tipoParte ?? null;
}

function toProcess(
  hit: DataJudHit,
  target: TribunalTarget,
  searchedName: string,
): ProcessoJudicial | null {
  const source = hit._source;
  if (!source) {
    return null;
  }

  const normalizedSearch = normalizeName(searchedName);
  const matchedParty = source.partes?.find((party) => {
    const name = normalizeName(party.nome ?? "");
    return (
      name === normalizedSearch ||
      name.includes(normalizedSearch) ||
      normalizedSearch.includes(name)
    );
  });

  if (source.partes && source.partes.length > 0 && !matchedParty) {
    return null;
  }

  return {
    id: `${target.alias}:${source.numeroProcesso ?? hit._id ?? "sem-numero"}`,
    numeroProcesso: source.numeroProcesso ?? hit._id ?? "Número indisponível",
    tribunal: source.tribunal ?? target.nome,
    classe: className(source.classe),
    assuntos: subjectNames(source.assuntos),
    dataAjuizamento: source.dataAjuizamento ?? null,
    poloCandidato: partyPolo(matchedParty),
  };
}

function totalHits(
  total: number | { value?: number } | undefined,
): number {
  if (typeof total === "number") {
    return total;
  }

  return total?.value ?? 0;
}

async function queryTribunal(
  target: TribunalTarget,
  searchedName: string,
  apiKey: string,
  signal: AbortSignal,
): Promise<DataJudTribunalResult> {
  const response = await fetch(
    `${DATAJUD_BASE_URL}/api_publica_${target.alias}/_search`,
    {
      method: "POST",
      headers: {
        Authorization: `APIKey ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        size: 50,
        _source: [
          "numeroProcesso",
          "tribunal",
          "classe",
          "assuntos",
          "dataAjuizamento",
          "partes",
        ],
        query: {
          match: {
            "partes.nome": {
              query: searchedName,
              operator: "and",
            },
          },
        },
      }),
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(`Datajud respondeu ${response.status}.`);
  }

  const payload = (await response.json()) as DataJudSearchResponse;
  const hits = payload.hits?.hits ?? [];
  const processos = hits
    .map((hit) => toProcess(hit, target, searchedName))
    .filter((process): process is ProcessoJudicial => Boolean(process));

  return {
    alias: target.alias,
    nome: target.nome,
    processos,
    totalEncontrado: totalHits(payload.hits?.total),
    disponivel: true,
  };
}

export function tribunalsForUf(uf: string): TribunalTarget[] {
  const normalizedUf = uf.trim().toUpperCase();
  const stateTribunal = STATE_TRIBUNALS[normalizedUf];
  const federalTribunal = FEDERAL_TRIBUNALS[normalizedUf];

  return [stateTribunal, federalTribunal].filter(
    (tribunal, index, tribunals): tribunal is TribunalTarget =>
      Boolean(tribunal) &&
      tribunals.findIndex((item) => item?.alias === tribunal.alias) === index,
  );
}

export async function searchJudicialProcesses(
  uf: string,
  searchedName: string,
  signal: AbortSignal,
): Promise<DataJudResponse> {
  const apiKey = process.env.DATAJUD_API_KEY?.trim();
  if (!apiKey) {
    throw new DataJudNotConfiguredError();
  }

  const tribunals = tribunalsForUf(uf);
  const results = await Promise.all(
    tribunals.map(async (tribunal) => {
      try {
        return await queryTribunal(tribunal, searchedName, apiKey, signal);
      } catch (error) {
        return {
          alias: tribunal.alias,
          nome: tribunal.nome,
          processos: [],
          totalEncontrado: 0,
          disponivel: false,
          erro:
            error instanceof Error
              ? error.message
              : "Tribunal temporariamente indisponível.",
        };
      }
    }),
  );

  return {
    nomeConsultado: searchedName,
    tribunais: results,
  };
}
