import {
  LEGENDA_LENGTH,
  formatCandidateNumber,
  getCargoConfig,
  getElectionUf,
  normalizeCandidateNumber,
} from "@/lib/cargos";
import { tseFetch as defaultTseFetch } from "@/lib/tse-fetch";
import type {
  CandidateListItem,
  CandidateLookupParams,
  CertidaoCandidato,
  CandidatoColinha,
  CargoSlug,
  GastoDetalhe,
  GastosPartido,
  PartidoListItem,
  PatrimonioDetalhe,
  TSEAccountsResponse,
  TSEParty,
  TSECandidateDetails,
  TSECandidateListResponse,
} from "@/lib/types";

export const TSE_BASE_URL =
  process.env.TSE_BASE_URL ??
  "https://divulgacandcontas.tse.jus.br/divulga/rest/v1";
export const TSE_ELECTION_ID = "20322002026";
export const TSE_ELECTION_YEAR = "2026";
export const TSE_PAGE_ORIGIN = "https://divulgacandcontas.tse.jus.br";
export const TSE_PAGE_URL = `${TSE_PAGE_ORIGIN}/divulga/`;

export type TseFetch = (
  url: string,
  init?: RequestInit & { next?: { revalidate: number } },
) => Promise<Response>;

export class CandidateNotFoundError extends Error {
  constructor() {
    super("Candidato não encontrado");
    this.name = "CandidateNotFoundError";
  }
}

export class PartyNotFoundError extends Error {
  constructor() {
    super("Partido sem candidatos para este cargo");
    this.name = "PartyNotFoundError";
  }
}

export class PartyVoteNotAllowedError extends Error {
  constructor() {
    super("Este cargo não aceita voto de legenda");
    this.name = "PartyVoteNotAllowedError";
  }
}

function asNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function partyNumberFromCandidateNumber(numero: string): string {
  return numero.length <= 2 ? numero : numero.slice(0, 2);
}

interface CertificateMetadata {
  nome: string;
  grupo: string;
  descricao: string;
  arquivo?: string;
}

function certificateMetadata(fileName: string | null): CertificateMetadata {
  const normalizedName = fileName?.toLocaleLowerCase("pt-BR") ?? "";
  const compactProcessMatch = fileName?.match(/\d{20}/)?.[0];
  const dottedProcessMatch = fileName?.match(
    /\d{4}\.\d\.\d{2}\.\d{4}[a-z0-9]*/i,
  );

  if (compactProcessMatch || dottedProcessMatch) {
    const processNumber = compactProcessMatch
      ? `${compactProcessMatch.slice(0, 7)}-${compactProcessMatch.slice(
          7,
          9,
        )}.${compactProcessMatch.slice(9, 13)}.${compactProcessMatch.slice(
          13,
          14,
        )}.${compactProcessMatch.slice(14, 16)}.${compactProcessMatch.slice(
          16,
        )}`
      : dottedProcessMatch?.[0];
    const justiceCode = compactProcessMatch
      ? compactProcessMatch.slice(13, 14)
      : processNumber?.split(".")[1];
    const justice =
      justiceCode === "4"
        ? "Justiça Federal"
        : justiceCode === "8"
          ? "Justiça Estadual"
          : "órgão judicial";

    return {
      nome: "Documento com referência processual",
      grupo: `Referências processuais, ${justice}`,
      descricao: `Referência: ${processNumber}`,
      arquivo: fileName ?? undefined,
    };
  }

  if (normalizedName.includes("cert_jf")) {
    return {
      nome: "Certidão criminal da Justiça Federal",
      grupo: "Certidões criminais",
      descricao: "Documento apresentado para fins de registro de candidatura",
      arquivo: fileName ?? undefined,
    };
  }
  if (normalizedName.includes("cert_tj_1g")) {
    return {
      nome: "Certidão criminal do Tribunal de Justiça",
      grupo: "Certidões criminais",
      descricao: "Distribuição judicial em primeiro grau",
      arquivo: fileName ?? undefined,
    };
  }
  if (normalizedName.includes("cert_tj_2g")) {
    return {
      nome: "Certidão criminal do Tribunal de Justiça",
      grupo: "Certidões criminais",
      descricao: "Distribuição judicial em segundo grau",
      arquivo: fileName ?? undefined,
    };
  }

  const readableFileName = fileName
    ?.replace(/\.pdf$/i, "")
    .replace(/compressed/gi, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (normalizedName.includes("planodegoverno")) {
    return {
      nome: "Plano de governo",
      grupo: "Plano de governo",
      descricao: "Documento programático anexado à candidatura",
      arquivo: fileName ?? undefined,
    };
  }

  if (
    normalizedName.includes("certid") ||
    normalizedName.includes("cert_")
  ) {
    return {
      nome: "Certidão identificada no arquivo",
      grupo: "Certidões com título",
      descricao: readableFileName
        ? `Descrição do arquivo: ${readableFileName}`
        : "Documento apresentado para fins de registro de candidatura",
      arquivo: fileName ?? undefined,
    };
  }

  if (fileName && normalizedName !== "pdf") {
    return {
      nome: "Documento anexado ao TSE",
      grupo: "Documentos com nome de arquivo",
      descricao: readableFileName
        ? `Descrição do arquivo: ${readableFileName}`
        : `Arquivo original: ${fileName}`,
      arquivo: fileName,
    };
  }

  return {
    nome: "Documento sem título detalhado",
    grupo: "Documentos sem título no metadado",
    descricao:
      "O TSE não informou um título no metadado. Abra o PDF original para consultar o conteúdo.",
  };
}

function certificateFileName(
  file: NonNullable<TSECandidateDetails["arquivos"]>[number],
): string | null {
  const candidates = [file.tipo, file.nome].filter(
    (value): value is string => Boolean(value),
  );

  return (
    candidates.find(
      (value) => value.toLocaleLowerCase("pt-BR") !== "pdf" && /\.pdf$/i.test(value),
    ) ?? null
  );
}

function buildCertificates(
  files: TSECandidateDetails["arquivos"],
): CertidaoCandidato[] {
  const documentBase = TSE_BASE_URL.replace(
    /\/rest\/v1\/?$/,
    "/rest/arquivo/doc",
  );

  return (files ?? []).flatMap((file) => {
    if (!file.idArquivo) {
      return [];
    }

    const fileName = certificateFileName(file);
    const metadata = certificateMetadata(fileName);

    return [
      {
        id: String(file.idArquivo),
        nome: metadata.nome,
        url: `${documentBase}/${file.idArquivo}`,
        tipo: "pdf",
        grupo: metadata.grupo,
        descricao: metadata.descricao,
        arquivo: metadata.arquivo,
      },
    ];
  });
}

function buildExpenseDetails(
  accounts: TSEAccountsResponse | null | undefined,
): GastoDetalhe[] {
  if (!accounts) {
    return [];
  }

  const concentration = (accounts.concentracaoDespesas ?? []).flatMap(
    (expense) => {
      const value = asNumber(expense.valor);
      if (value === null) {
        return [];
      }

      return [
        {
          categoria: expense.dsDRD ?? "Outras despesas",
          quantidade: asNumber(expense.qtdeDespesas),
          valor: value,
        },
      ];
    },
  );

  if (concentration.length > 0) {
    return concentration;
  }

  const despesas = accounts.despesas;
  if (!despesas) {
    return [];
  }

  const categoryValues: Array<
    [string, number | string | null | undefined]
  > = [
    ["Doações de outros candidatos e partidos", despesas.doacoesOutrosCandidatosPartigos],
    ["Fundos partidários", despesas.fundosPartidarios],
    ["Fundo Especial de Financiamento", despesas.fundoEspecial],
    ["Outros recursos", despesas.outrosRecursos],
    ["Despesas financeiras", despesas.financeiras],
    ["Despesas estimáveis", despesas.estimaveis],
  ];

  return categoryValues.flatMap(([categoria, rawValue]) => {
    const value = asNumber(rawValue);
    return value === null || value <= 0
      ? []
      : [{ categoria, quantidade: null, valor: value }];
  });
}

function unavailablePartyExpenses(party: string): GastosPartido {
  return {
    partido: party,
    disponivel: false,
    totalContratado: null,
    totalPago: null,
    limiteGastos: null,
    detalhes: [],
  };
}

/** Diretório oficial de partidos da eleição: traz sigla, nome e código do órgão. */
export async function fetchPartyDirectory(
  signal: AbortSignal,
  tseFetch: TseFetch = defaultTseFetch,
): Promise<TSEParty[]> {
  try {
    return await fetchJson<TSEParty[]>(
      `${TSE_BASE_URL}/prestador/campanha/partidos/${TSE_ELECTION_ID}`,
      {
        signal,
        next: { revalidate: 3600 },
      },
      tseFetch,
    );
  } catch {
    return [];
  }
}

export function findPartyInDirectory(parties: TSEParty[], partyNumber: string) {
  return parties.find(
    (item) => String(item.numero) === String(Number(partyNumber)),
  );
}

export async function fetchPartyExpenses(
  electionUf: string,
  partyNumber: string,
  partyName: string,
  signal: AbortSignal,
  tseFetch: TseFetch = defaultTseFetch,
  directory?: TSEParty[],
): Promise<GastosPartido> {
  try {
    const parties = directory ?? (await fetchPartyDirectory(signal, tseFetch));
    const party = findPartyInDirectory(parties, partyNumber);
    const codigoOrgao = String(party?.sqPrestadorConta ?? partyNumber);
    const accountUrl = `${TSE_BASE_URL}/prestador/consulta/partido/${TSE_ELECTION_ID}/${TSE_ELECTION_YEAR}/${electionUf}/${codigoOrgao}/${partyNumber}`;
    const account = await fetchJson<TSEAccountsResponse>(
      accountUrl,
      {
        signal,
        next: { revalidate: 900 },
      },
      tseFetch,
    );
    const despesas = account.despesas;

    if (!despesas) {
      return unavailablePartyExpenses(partyName);
    }

    return {
      partido: party?.sigla ?? partyName,
      disponivel: true,
      totalContratado: asNumber(despesas.totalDespesasContratadas),
      totalPago: asNumber(despesas.totalDespesasPagas),
      limiteGastos: asNumber(despesas.valorLimiteDeGastos),
      detalhes: buildExpenseDetails(account),
    };
  } catch {
    return unavailablePartyExpenses(partyName);
  }
}

export function applyCandidateExpenses(
  candidate: CandidatoColinha,
  accounts: TSEAccountsResponse | null | undefined,
  gastosPartido?: GastosPartido,
): CandidatoColinha {
  return {
    ...candidate,
    totalGastos: asNumber(accounts?.despesas?.totalDespesasContratadas),
    totalGastosPagos: asNumber(accounts?.despesas?.totalDespesasPagas),
    limiteGastos: asNumber(accounts?.despesas?.valorLimiteDeGastos),
    gastosDetalhes: buildExpenseDetails(accounts),
    gastosPartido: gastosPartido ?? candidate.gastosPartido,
  };
}

export async function fetchCandidateAccounts(
  params: {
    uf: string;
    cargo: CargoSlug;
    numero: string;
    candidateId: string;
  },
  signal: AbortSignal,
  tseFetch: TseFetch = defaultTseFetch,
): Promise<TSEAccountsResponse | null> {
  const { uf, cargo, numero, candidateId } = params;
  const config = getCargoConfig(cargo, uf);
  const electionUf = getElectionUf(cargo, uf);
  const formattedNumber = formatCandidateNumber(numero, config.maxLength);
  const partyNumber = partyNumberFromCandidateNumber(formattedNumber);
  const accountsUrl = `${TSE_BASE_URL}/prestador/consulta/${TSE_ELECTION_ID}/${TSE_ELECTION_YEAR}/${electionUf}/${config.tseCode}/${partyNumber}/${formattedNumber}/${encodeURIComponent(candidateId)}`;

  return fetchJsonOptional<TSEAccountsResponse>(
    accountsUrl,
    {
      signal,
      next: { revalidate: 0 },
    },
    tseFetch,
  );
}

export async function fetchJson<T>(
  url: string,
  init: RequestInit & { next?: { revalidate: number } },
  tseFetch: TseFetch = defaultTseFetch,
): Promise<T> {
  const browser = typeof window !== "undefined";
  const requestInit: RequestInit & { next?: { revalidate: number } } = {
    ...init,
  };

  if (browser) {
    delete requestInit.next;
    requestInit.credentials = "omit";
    requestInit.cache = "no-store";
  }

  const attempts = browser ? 3 : 1;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await tseFetch(url, requestInit);

      if (!response.ok) {
        throw new Error(`TSE respondeu ${response.status} em ${url}`);
      }

      const text = await response.text();
      if (!text.trim()) {
        throw new Error(`TSE retornou resposta vazia em ${url}`);
      }

      try {
        return JSON.parse(text) as T;
      } catch {
        throw new Error(`TSE retornou JSON inválido em ${url}`);
      }
    } catch (error) {
      lastError = error;
      const aborted =
        (error instanceof DOMException && error.name === "AbortError") ||
        init.signal?.aborted;
      const message = error instanceof Error ? error.message : String(error);
      const retryable = /networkerror|failed to fetch|load failed|network request failed/i.test(
        message,
      );

      if (aborted || !retryable || attempt === attempts - 1) {
        throw error;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, 700 * (attempt + 1));
      });
    }
  }

  throw lastError;
}

async function fetchJsonOptional<T>(
  url: string,
  init: RequestInit & { next?: { revalidate: number } },
  tseFetch: TseFetch = defaultTseFetch,
): Promise<T | null> {
  try {
    return await fetchJson<T>(url, init, tseFetch);
  } catch {
    return null;
  }
}

function findCandidate(
  response: TSECandidateListResponse,
  numero: string,
) {
  const normalizedNumber = normalizeCandidateNumber(numero);
  return response.candidatos?.find(
    (candidate) =>
      normalizeCandidateNumber(candidate.numero ?? "") === normalizedNumber,
  );
}

export function makeCandidateCacheKey(
  uf: string,
  cargo: CargoSlug,
  numero: string,
): string {
  const config = getCargoConfig(cargo, uf);
  const electionUf = getElectionUf(cargo, uf);
  return `cand:2026:${electionUf}:${config.tseCode}:${formatCandidateNumber(numero, config.maxLength)}`;
}

export function makeCandidateListCacheKey(
  uf: string,
  cargo: CargoSlug,
): string {
  const config = getCargoConfig(cargo, uf);
  const electionUf = getElectionUf(cargo, uf);
  return `cand-list:2026:${electionUf}:${config.tseCode}`;
}

export function makePartyCacheKey(
  uf: string,
  cargo: CargoSlug,
  numero: string,
): string {
  const config = getCargoConfig(cargo, uf);
  const electionUf = getElectionUf(cargo, uf);
  return `legenda:2026:${electionUf}:${config.tseCode}:${formatCandidateNumber(numero, LEGENDA_LENGTH)}`;
}

export function makePartyListCacheKey(uf: string, cargo: CargoSlug): string {
  const config = getCargoConfig(cargo, uf);
  const electionUf = getElectionUf(cargo, uf);
  return `partido-list:2026:${electionUf}:${config.tseCode}`;
}

export function isTseCacheKey(key: string): boolean {
  return /^(cand|cand-list|legenda|partido-list):2026:[A-Z]{2}:\d/.test(key);
}

export function partiesFromCandidates(
  candidates: CandidateListItem[],
  directory: TSEParty[],
): PartidoListItem[] {
  const parties = new Map<string, PartidoListItem>();

  candidates.forEach((candidate) => {
    const numero = partyNumberFromCandidateNumber(candidate.numero);
    const existing = parties.get(numero);

    if (existing) {
      existing.totalCandidatos += 1;
      return;
    }

    const entry = findPartyInDirectory(directory, numero);
    parties.set(numero, {
      numero,
      sigla: entry?.sigla ?? candidate.partido,
      nome: entry?.nome ?? candidate.partido,
      totalCandidatos: 1,
    });
  });

  return Array.from(parties.values()).sort(
    (left, right) => Number(left.numero) - Number(right.numero),
  );
}

export function assembleLegenda(params: {
  uf: string;
  cargo: CargoSlug;
  partyNumber: string;
  nome: string;
  sigla: string;
  candidatosNoPartido: number;
  gastosPartido: GastosPartido;
}): CandidatoColinha {
  const { uf, cargo, partyNumber, nome, sigla, candidatosNoPartido, gastosPartido } =
    params;
  const config = getCargoConfig(cargo, uf);
  const electionUf = getElectionUf(cargo, uf);

  return {
    id: `legenda:${config.tseCode}:${electionUf}:${partyNumber}`,
    numero: partyNumber,
    nomeUrna: nome,
    partido: sigla,
    cargo,
    tipoVoto: "legenda",
    candidatosNoPartido,
    fotoUrl: null,
    patrimonioDeclarado: null,
    totalGastos: gastosPartido.totalContratado,
    totalGastosPagos: gastosPartido.totalPago,
    limiteGastos: gastosPartido.limiteGastos,
    gastosPartido,
  };
}

export function candidateFromListItem(
  item: CandidateListItem,
  gastosPartido?: GastosPartido,
): CandidatoColinha {
  return {
    id: item.id,
    numero: item.numero,
    nomeUrna: item.nomeUrna,
    partido: item.partido,
    cargo: item.cargo,
    tipoVoto: "candidato",
    fotoUrl: item.fotoUrl,
    patrimonioDeclarado: null,
    totalGastos: gastosPartido?.totalContratado ?? null,
    totalGastosPagos: gastosPartido?.totalPago ?? null,
    limiteGastos: gastosPartido?.limiteGastos ?? null,
    gastosPartido,
    situacao: item.situacao,
  };
}

export function partyNumbersFromDirectory(directory: TSEParty[]): string[] {
  const numbers = new Set<string>();

  for (const party of directory) {
    if (party.numero === null || party.numero === undefined || party.numero === "") {
      continue;
    }

    numbers.add(formatCandidateNumber(party.numero, LEGENDA_LENGTH));
  }

  return Array.from(numbers).sort((left, right) => Number(left) - Number(right));
}

function mapCandidateList(
  response: TSECandidateListResponse,
  uf: string,
  cargo: CargoSlug,
): CandidateListItem[] {
  const config = getCargoConfig(cargo, uf);

  return (response.candidatos ?? [])
    .map((candidate) => ({
      id: String(candidate.id),
      numero: formatCandidateNumber(candidate.numero ?? "", config.maxLength),
      nomeUrna: candidate.nomeUrna ?? "Nome não informado",
      partido:
        candidate.partido?.sigla ??
        candidate.partido?.nome ??
        "Partido não informado",
      cargo,
      fotoUrl: candidate.fotoUrl ?? null,
      situacao:
        candidate.descricaoSituacaoCandidato ??
        candidate.descricaoSituacao ??
        undefined,
    }))
    .sort((left, right) => Number(left.numero) - Number(right.numero));
}

export async function listCandidates(
  params: Omit<CandidateLookupParams, "numero">,
  signal: AbortSignal,
  tseFetch: TseFetch = defaultTseFetch,
): Promise<CandidateListItem[]> {
  const { uf, cargo } = params;
  const config = getCargoConfig(cargo, uf);
  const electionUf = getElectionUf(cargo, uf);
  const listUrl = `${TSE_BASE_URL}/candidatura/listar/${TSE_ELECTION_YEAR}/${electionUf}/${TSE_ELECTION_ID}/${config.tseCode}/candidatos`;
  const response = await fetchJson<TSECandidateListResponse>(
    listUrl,
    {
      signal,
      next: { revalidate: 3600 },
    },
    tseFetch,
  );

  return mapCandidateList(response, uf, cargo);
}

export async function listCandidatesChunked(
  params: Omit<CandidateLookupParams, "numero">,
  signal: AbortSignal,
  tseFetch: TseFetch,
  partyNumbers: string[],
  delayMs = 250,
  onProgress?: (done: number, total: number, found: number) => void,
): Promise<CandidateListItem[]> {
  const { uf, cargo } = params;
  const config = getCargoConfig(cargo, uf);
  const electionUf = getElectionUf(cargo, uf);
  const merged = new Map<string, CandidateListItem>();

  for (let index = 0; index < partyNumbers.length; index += 1) {
    if (signal.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const partyNumber = formatCandidateNumber(partyNumbers[index], LEGENDA_LENGTH);
    const listUrl = new URL(
      `${TSE_BASE_URL}/candidatura/listar/${TSE_ELECTION_YEAR}/${electionUf}/${TSE_ELECTION_ID}/${config.tseCode}/candidatos`,
    );
    listUrl.searchParams.set("partido", partyNumber);

    try {
      const response = await fetchJson<TSECandidateListResponse>(
        listUrl.toString(),
        { signal },
        tseFetch,
      );

      for (const candidate of mapCandidateList(response, uf, cargo)) {
        if (partyNumberFromCandidateNumber(candidate.numero) === partyNumber) {
          merged.set(candidate.id, candidate);
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
    }

    onProgress?.(index + 1, partyNumbers.length, merged.size);

    if (index < partyNumbers.length - 1 && delayMs > 0) {
      await new Promise<void>((resolve, reject) => {
        if (signal.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }

        const timer = setTimeout(resolve, delayMs);
        signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(new DOMException("Aborted", "AbortError"));
          },
          { once: true },
        );
      });
    }
  }

  if (merged.size === 0) {
    throw new Error(
      "Não foi possível baixar a lista de candidatos. Tente de novo ou use o modo ponte.",
    );
  }

  return Array.from(merged.values()).sort(
    (left, right) => Number(left.numero) - Number(right.numero),
  );
}

export async function fetchCandidateDetailsById(
  electionUf: string,
  candidateId: string,
  signal: AbortSignal,
): Promise<TSECandidateDetails | null> {
  const detailUrl = `${TSE_BASE_URL}/candidatura/buscar/${TSE_ELECTION_YEAR}/${electionUf}/${TSE_ELECTION_ID}/candidato/${encodeURIComponent(candidateId)}`;
  return fetchJsonOptional<TSECandidateDetails>(detailUrl, {
    signal,
    next: { revalidate: 3600 },
  });
}

/**
 * Partidos que podem receber voto de legenda: só entram os que de fato
 * lançaram candidatos para o cargo naquela UF.
 */
export async function listParties(
  params: Omit<CandidateLookupParams, "numero">,
  signal: AbortSignal,
  tseFetch: TseFetch = defaultTseFetch,
): Promise<PartidoListItem[]> {
  const { uf, cargo } = params;
  const config = getCargoConfig(cargo, uf);

  if (!config.proporcional) {
    throw new PartyVoteNotAllowedError();
  }

  const [candidates, directory] = await Promise.all([
    listCandidates(params, signal, tseFetch),
    fetchPartyDirectory(signal, tseFetch),
  ]);

  return partiesFromCandidates(candidates, directory);
}

/**
 * Voto de legenda: o eleitor digita apenas o número do partido e o voto vai
 * para a sigla, que o usa para eleger seus candidatos mais votados.
 */
export async function lookupParty(
  params: CandidateLookupParams,
  signal: AbortSignal,
  tseFetch: TseFetch = defaultTseFetch,
): Promise<CandidatoColinha> {
  const { uf, cargo, numero } = params;
  const config = getCargoConfig(cargo, uf);

  if (!config.proporcional) {
    throw new PartyVoteNotAllowedError();
  }

  const electionUf = getElectionUf(cargo, uf);
  const partyNumber = formatCandidateNumber(numero, LEGENDA_LENGTH);

  const listUrl = new URL(
    `${TSE_BASE_URL}/candidatura/listar/${TSE_ELECTION_YEAR}/${electionUf}/${TSE_ELECTION_ID}/${config.tseCode}/candidatos`,
  );
  listUrl.searchParams.set("partido", partyNumber);

  const candidateList = await fetchJson<TSECandidateListResponse>(
    listUrl.toString(),
    {
      signal,
      next: { revalidate: 3600 },
    },
    tseFetch,
  );

  // O filtro por partido é aplicado pelo TSE, mas repetimos aqui porque a
  // ausência do parâmetro faz a API devolver a lista inteira do cargo.
  const partyCandidates = (candidateList.candidatos ?? []).filter(
    (candidate) =>
      partyNumberFromCandidateNumber(
        formatCandidateNumber(candidate.numero ?? "", config.maxLength),
      ) === partyNumber,
  );

  if (partyCandidates.length === 0) {
    throw new PartyNotFoundError();
  }

  const sigla =
    partyCandidates[0].partido?.sigla ??
    partyCandidates[0].partido?.nome ??
    "Partido não informado";

  const [directory, gastosPartido] = await Promise.all([
    fetchPartyDirectory(signal, tseFetch),
    fetchPartyExpenses(electionUf, partyNumber, sigla, signal, tseFetch),
  ]);

  const entry = findPartyInDirectory(directory, partyNumber);

  return assembleLegenda({
    uf,
    cargo,
    partyNumber,
    nome: entry?.nome ?? sigla,
    sigla: entry?.sigla ?? sigla,
    candidatosNoPartido: partyCandidates.length,
    gastosPartido,
  });
}

export async function hydrateCandidate(
  params: {
    uf: string;
    cargo: CargoSlug;
    numero: string;
    candidateId: string;
    partido: string;
    nomeUrna?: string;
    nomeCompleto?: string;
    fotoUrl?: string | null;
    situacao?: string;
  },
  signal: AbortSignal,
  tseFetch: TseFetch = defaultTseFetch,
  gastosPartido?: GastosPartido,
): Promise<CandidatoColinha> {
  const { uf, cargo, numero } = params;
  const config = getCargoConfig(cargo, uf);
  const electionUf = getElectionUf(cargo, uf);
  const formattedNumber = formatCandidateNumber(numero, config.maxLength);
  const partyNumber = partyNumberFromCandidateNumber(formattedNumber);
  const candidateId = encodeURIComponent(params.candidateId);
  const detailUrl = `${TSE_BASE_URL}/candidatura/buscar/${TSE_ELECTION_YEAR}/${electionUf}/${TSE_ELECTION_ID}/candidato/${candidateId}`;
  const accountsUrl = `${TSE_BASE_URL}/prestador/consulta/${TSE_ELECTION_ID}/${TSE_ELECTION_YEAR}/${electionUf}/${config.tseCode}/${partyNumber}/${formattedNumber}/${candidateId}`;

  const [details, accounts, partyExpenses] = await Promise.all([
    fetchJson<TSECandidateDetails>(
      detailUrl,
      {
        signal,
        next: { revalidate: 900 },
      },
      tseFetch,
    ),
    fetchJsonOptional<TSEAccountsResponse>(
      accountsUrl,
      {
        signal,
        next: { revalidate: 900 },
      },
      tseFetch,
    ),
    gastosPartido
      ? Promise.resolve(gastosPartido)
      : fetchPartyExpenses(
          electionUf,
          partyNumber,
          params.partido,
          signal,
          tseFetch,
        ),
  ]);

  const patrimonioDeclarado = Array.isArray(details.bens)
    ? details.bens.reduce((total, bem) => total + (asNumber(bem.valor) ?? 0), 0)
    : asNumber(details.totalDeBens);

  const patrimonioDetalhes: PatrimonioDetalhe[] = Array.isArray(details.bens)
    ? details.bens.flatMap((bem) => {
        const valor = asNumber(bem.valor);
        return valor === null
          ? []
          : [
              {
                descricao: bem.descricao ?? "Bem declarado",
                tipo: bem.descricaoDeTipoDeBem ?? null,
                valor,
              },
            ];
      })
    : [];
  const gastosDetalhes = buildExpenseDetails(accounts);
  const certidoes = buildCertificates(details.arquivos);

  const partido =
    details.partido?.sigla ??
    details.partido?.nome ??
    params.partido;

  return {
    id: String(details.id ?? params.candidateId),
    numero: formatCandidateNumber(
      details.numero ?? params.numero,
      config.maxLength,
    ),
    nomeCompleto: details.nomeCompleto ?? params.nomeCompleto,
    nomeUrna: details.nomeUrna ?? params.nomeUrna ?? "Nome não informado",
    partido,
    cargo,
    tipoVoto: "candidato",
    fotoUrl: details.fotoUrl ?? params.fotoUrl ?? null,
    patrimonioDeclarado,
    totalGastos: asNumber(accounts?.despesas?.totalDespesasContratadas),
    patrimonioDetalhes,
    gastosDetalhes,
    gastosPartido: partyExpenses,
    certidoes,
    totalGastosPagos: asNumber(accounts?.despesas?.totalDespesasPagas),
    limiteGastos: asNumber(accounts?.despesas?.valorLimiteDeGastos),
    situacao:
      details.descricaoSituacaoCandidato ??
      details.descricaoSituacao ??
      params.situacao,
  };
}

export async function lookupCandidate(
  params: CandidateLookupParams,
  signal: AbortSignal,
  tseFetch: TseFetch = defaultTseFetch,
): Promise<CandidatoColinha> {
  const { uf, cargo, numero } = params;
  const config = getCargoConfig(cargo, uf);
  const electionUf = getElectionUf(cargo, uf);
  const formattedNumber = formatCandidateNumber(numero, config.maxLength);
  const partyNumber = partyNumberFromCandidateNumber(formattedNumber);

  const listUrl = new URL(
    `${TSE_BASE_URL}/candidatura/listar/${TSE_ELECTION_YEAR}/${electionUf}/${TSE_ELECTION_ID}/${config.tseCode}/candidatos`,
  );
  listUrl.searchParams.set("partido", partyNumber);

  const candidateList = await fetchJson<TSECandidateListResponse>(
    listUrl.toString(),
    {
      signal,
      next: { revalidate: 3600 },
    },
    tseFetch,
  );

  const summary = findCandidate(candidateList, formattedNumber);
  if (!summary) {
    throw new CandidateNotFoundError();
  }

  return hydrateCandidate(
    {
      uf,
      cargo,
      numero: formattedNumber,
      candidateId: String(summary.id),
      partido:
        summary.partido?.sigla ??
        summary.partido?.nome ??
        "Partido não informado",
      nomeUrna: summary.nomeUrna ?? undefined,
      nomeCompleto: summary.nomeCompleto ?? undefined,
      fotoUrl: summary.fotoUrl ?? null,
      situacao:
        summary.descricaoSituacaoCandidato ??
        summary.descricaoSituacao ??
        undefined,
    },
    signal,
    tseFetch,
  );
}
