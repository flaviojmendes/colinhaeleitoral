import {
  formatCandidateNumber,
  getCargoConfig,
  getElectionUf,
  normalizeCandidateNumber,
} from "@/lib/cargos";
import type {
  CandidateListItem,
  CandidateLookupParams,
  CertidaoCandidato,
  CandidatoColinha,
  CargoSlug,
  GastoDetalhe,
  GastosPartido,
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

export class CandidateNotFoundError extends Error {
  constructor() {
    super("Candidato não encontrado");
    this.name = "CandidateNotFoundError";
  }
}

function asNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function partyNumberFromCandidateNumber(numero: string): string {
  return numero.length <= 2 ? numero : numero.slice(0, 2);
}

function certificateLabel(fileName: string): string {
  const normalizedName = fileName.toLocaleLowerCase("pt-BR");

  if (normalizedName.includes("cert_jf")) {
    return "Certidão da Justiça Federal";
  }
  if (normalizedName.includes("cert_tj_1g")) {
    return "Certidão do Tribunal de Justiça — 1º grau";
  }
  if (normalizedName.includes("cert_tj_2g")) {
    return "Certidão do Tribunal de Justiça — 2º grau";
  }

  return "Certidão apresentada ao TSE";
}

function buildCertificates(
  files: TSECandidateDetails["arquivos"],
): CertidaoCandidato[] {
  const documentBase = TSE_BASE_URL.replace(
    /\/rest\/v1\/?$/,
    "/rest/arquivo/doc",
  );

  return (files ?? []).flatMap((file) => {
    if (!file.idArquivo || !file.nome || !/pdf/i.test(file.tipo ?? "pdf")) {
      return [];
    }

    return [
      {
        id: String(file.idArquivo),
        nome: certificateLabel(file.nome),
        url: `${documentBase}/${file.idArquivo}`,
        tipo: file.tipo ?? "pdf",
      },
    ];
  });
}

function buildExpenseDetails(
  accounts: TSEAccountsResponse,
): GastoDetalhe[] {
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

async function fetchPartyExpenses(
  electionUf: string,
  partyNumber: string,
  partyName: string,
  signal: AbortSignal,
): Promise<GastosPartido> {
  try {
    const parties = await fetchJson<TSEParty[]>(
      `${TSE_BASE_URL}/prestador/campanha/partidos/${TSE_ELECTION_ID}`,
      {
        signal,
        next: { revalidate: 3600 },
      },
    );
    const party = parties.find(
      (item) => String(item.numero) === String(Number(partyNumber)),
    );
    const codigoOrgao = String(party?.sqPrestadorConta ?? partyNumber);
    const accountUrl = `${TSE_BASE_URL}/prestador/consulta/partido/${TSE_ELECTION_ID}/${TSE_ELECTION_YEAR}/${electionUf}/${codigoOrgao}/${partyNumber}`;
    const account = await fetchJson<TSEAccountsResponse>(accountUrl, {
      signal,
      next: { revalidate: 900 },
    });
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

async function fetchJson<T>(
  url: string,
  init: RequestInit & { next?: { revalidate: number } },
): Promise<T> {
  const response = await fetch(url, init);

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
  return `cand:2026:${uf}:${config.tseCode}:${formatCandidateNumber(numero, config.maxLength)}`;
}

export function makeCandidateListCacheKey(
  uf: string,
  cargo: CargoSlug,
): string {
  const config = getCargoConfig(cargo, uf);
  return `cand-list:2026:${uf}:${config.tseCode}`;
}

export async function listCandidates(
  params: Omit<CandidateLookupParams, "numero">,
  signal: AbortSignal,
): Promise<CandidateListItem[]> {
  const { uf, cargo } = params;
  const config = getCargoConfig(cargo, uf);
  const electionUf = getElectionUf(cargo, uf);
  const listUrl = `${TSE_BASE_URL}/candidatura/listar/${TSE_ELECTION_YEAR}/${electionUf}/${TSE_ELECTION_ID}/${config.tseCode}/candidatos`;
  const response = await fetchJson<TSECandidateListResponse>(listUrl, {
    signal,
    next: { revalidate: 3600 },
  });

  return (response.candidatos ?? [])
    .map((candidate) => ({
      id: String(candidate.id),
      numero: formatCandidateNumber(
        candidate.numero ?? "",
        config.maxLength,
      ),
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

export async function lookupCandidate(
  params: CandidateLookupParams,
  signal: AbortSignal,
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
  );

  const summary = findCandidate(candidateList, formattedNumber);
  if (!summary) {
    throw new CandidateNotFoundError();
  }

  const candidateId = encodeURIComponent(String(summary.id));
  const detailUrl = `${TSE_BASE_URL}/candidatura/buscar/${TSE_ELECTION_YEAR}/${electionUf}/${TSE_ELECTION_ID}/candidato/${candidateId}`;
  const accountsUrl = `${TSE_BASE_URL}/prestador/consulta/${TSE_ELECTION_ID}/${TSE_ELECTION_YEAR}/${electionUf}/${config.tseCode}/${partyNumber}/${formattedNumber}/${candidateId}`;
  const summaryParty =
    summary.partido?.sigla ??
    summary.partido?.nome ??
    "Partido não informado";

  const [details, accounts, gastosPartido] = await Promise.all([
    fetchJson<TSECandidateDetails>(detailUrl, {
      signal,
      next: { revalidate: 900 },
    }),
    fetchJson<TSEAccountsResponse>(accountsUrl, {
      signal,
      next: { revalidate: 900 },
    }),
    fetchPartyExpenses(electionUf, partyNumber, summaryParty, signal),
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
    summaryParty;

  return {
    id: String(details.id ?? summary.id),
    numero: formatCandidateNumber(details.numero ?? summary.numero ?? numero, config.maxLength),
    nomeCompleto: details.nomeCompleto ?? summary.nomeCompleto ?? undefined,
    nomeUrna: details.nomeUrna ?? summary.nomeUrna ?? "Nome não informado",
    partido,
    cargo,
    fotoUrl: details.fotoUrl ?? summary.fotoUrl ?? null,
    patrimonioDeclarado,
    totalGastos: asNumber(accounts.despesas?.totalDespesasContratadas),
    patrimonioDetalhes,
    gastosDetalhes,
    gastosPartido,
    certidoes,
    totalGastosPagos: asNumber(accounts.despesas?.totalDespesasPagas),
    limiteGastos: asNumber(accounts.despesas?.valorLimiteDeGastos),
    situacao:
      details.descricaoSituacaoCandidato ??
      details.descricaoSituacao ??
      summary.descricaoSituacaoCandidato ??
      summary.descricaoSituacao ??
      undefined,
  };
}
