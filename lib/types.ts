export type CargoSlug =
  | "deputado-federal"
  | "deputado-estadual"
  | "senador-1"
  | "senador-2"
  | "governador"
  | "presidente";

export type Uf = string;

export type TipoVoto = "candidato" | "legenda";

export interface CandidatoColinha {
  id: string;
  numero: string;
  nomeUrna: string;
  nomeCompleto?: string;
  partido: string;
  cargo: CargoSlug;
  /** Ausente em registros salvos antes do voto de legenda existir. */
  tipoVoto?: TipoVoto;
  candidatosNoPartido?: number;
  fotoUrl: string | null;
  patrimonioDeclarado: number | null;
  totalGastos: number | null;
  patrimonioDetalhes?: PatrimonioDetalhe[];
  gastosDetalhes?: GastoDetalhe[];
  gastosPartido?: GastosPartido;
  certidoes?: CertidaoCandidato[];
  totalGastosPagos?: number | null;
  limiteGastos?: number | null;
  situacao?: string;
}

export interface PatrimonioDetalhe {
  descricao: string;
  tipo: string | null;
  valor: number;
}

export interface GastoDetalhe {
  categoria: string;
  quantidade: number | null;
  valor: number;
}

export interface GastosPartido {
  partido: string;
  disponivel: boolean;
  totalContratado: number | null;
  totalPago: number | null;
  limiteGastos: number | null;
  detalhes: GastoDetalhe[];
}

export interface CertidaoCandidato {
  id: string;
  nome: string;
  url: string;
  tipo: string;
  grupo?: string;
  descricao?: string;
  arquivo?: string;
}

export interface NoticiaCandidato {
  titulo: string;
  link: string;
  dataPublicacao: string;
  fonte: string;
}

export interface ProcessoJudicial {
  id: string;
  numeroProcesso: string;
  tribunal: string;
  classe: string | null;
  assuntos: string[];
  dataAjuizamento: string | null;
  poloCandidato: string | null;
}

export interface DataJudTribunalResult {
  alias: string;
  nome: string;
  processos: ProcessoJudicial[];
  totalEncontrado: number;
  disponivel: boolean;
  erro?: string;
}

export interface DataJudResponse {
  nomeConsultado: string;
  totalProcessos?: number;
  processos?: ProcessoJudicial[];
  tribunais: DataJudTribunalResult[];
}

export interface CandidateListItem {
  id: string;
  numero: string;
  nomeUrna: string;
  partido: string;
  cargo: CargoSlug;
  fotoUrl: string | null;
  situacao?: string;
}

export interface PartidoListItem {
  numero: string;
  sigla: string;
  nome: string;
  totalCandidatos: number;
}

export interface TSEParty {
  numero?: number | string | null;
  sigla?: string | null;
  nome?: string | null;
  sqPrestadorConta?: number | string | null;
}

export interface TSECargo {
  codigo?: number | string | null;
  nome?: string | null;
}

export interface TSECandidateSummary {
  id: number | string;
  nomeUrna?: string | null;
  nomeCompleto?: string | null;
  numero?: number | string | null;
  fotoUrl?: string | null;
  descricaoSituacao?: string | null;
  descricaoSituacaoCandidato?: string | null;
  partido?: TSEParty | null;
  cargo?: TSECargo | null;
}

export interface TSECandidateListResponse {
  candidatos?: TSECandidateSummary[] | null;
}

export interface TSEAsset {
  descricao?: string | null;
  descricaoDeTipoDeBem?: string | null;
  valor?: number | string | null;
}

export interface TSEPreviousElection {
  nrAno?: number | string | null;
  cargo?: string | null;
  partido?: string | null;
  situacaoTotalizacao?: string | null;
}

export interface TSECandidateDetails extends TSECandidateSummary {
  bens?: TSEAsset[] | null;
  totalDeBens?: number | string | null;
  st_DIVULGA_BENS?: boolean | null;
  arquivos?: TSEFile[] | null;
  ocupacao?: string | null;
  dataDeNascimento?: string | null;
  grauInstrucao?: string | null;
  descricaoSexo?: string | null;
  sgUfNascimento?: string | null;
  st_REELEICAO?: boolean | null;
  eleicoesAnteriores?: TSEPreviousElection[] | null;
}

export interface TSEFile {
  idArquivo?: number | string | null;
  nome?: string | null;
  url?: string | null;
  tipo?: string | null;
  codTipo?: string | null;
}

export interface TSEAccountsResponse {
  despesas?: {
    totalDespesasContratadas?: number | string | null;
    totalDespesasPagas?: number | string | null;
    valorLimiteDeGastos?: number | string | null;
    doacoesOutrosCandidatosPartigos?: number | string | null;
    fundosPartidarios?: number | string | null;
    fundoEspecial?: number | string | null;
    outrosRecursos?: number | string | null;
    financeiras?: number | string | null;
    estimaveis?: number | string | null;
  } | null;
  concentracaoDespesas?: {
    dsDRD?: string | null;
    qtdeDespesas?: number | string | null;
    valor?: number | string | null;
  }[] | null;
}

export interface CandidateLookupParams {
  uf: Uf;
  cargo: CargoSlug;
  numero: string;
}

export interface CargoConfig {
  slug: CargoSlug;
  label: string;
  shortLabel: string;
  tseCode: number;
  maxLength: number;
  /** Eleição proporcional: aceita voto de legenda com o número do partido. */
  proporcional: boolean;
}

export type CuriosidadeCategoria =
  | "mais-ricos"
  | "menos-patrimonio"
  | "mais-jovens"
  | "mais-experientes"
  | "recordistas-eleicoes"
  | "estreantes"
  | "ocupacoes"
  | "reeleicao";

export interface CuriosidadeCandidato {
  id: string;
  nomeUrna: string;
  nomeCompleto?: string;
  numero: string;
  partido: string;
  cargo: CargoSlug;
  cargoLabel: string;
  uf: string;
  fotoUrl: string | null;
  patrimonioDeclarado: number | null;
  idade: number | null;
  anoNascimento: number | null;
  ocupacao: string | null;
  grauInstrucao: string | null;
  eleicoesAnteriores: number;
  reeleicao: boolean;
  bemNotavel?: {
    descricao: string;
    valor: number;
    tipo?: string | null;
  };
}

export interface CuriosidadeItem {
  id: string;
  posicao?: number;
  nomeUrna: string;
  nomeCompleto?: string;
  numero: string;
  partido: string;
  cargo: CargoSlug;
  cargoLabel: string;
  uf: string;
  fotoUrl: string | null;
  destaquePrincipal: string;
  subtituloDestaque: string;
  curiosidadeTexto: string;
  patrimonioDeclarado?: number | null;
  idade?: number | null;
  anoNascimento?: number | null;
  ocupacao?: string | null;
  eleicoesDisputadas?: number | null;
  bemNotavel?: {
    descricao: string;
    valor: number;
    tipo?: string | null;
  };
  categoria: CuriosidadeCategoria;
  badge?: string;
}

export interface CuriosidadeEstatistica {
  id: string;
  titulo: string;
  valor: string;
  descricao: string;
  icone: "patrimonio" | "idade" | "eleicoes" | "candidatos" | "partidos" | "diversidade";
}

export interface CuriosidadesResponse {
  itens: CuriosidadeItem[];
  estatisticas: CuriosidadeEstatistica[];
  totalItens: number;
  totalCandidatos: number;
  categoria: CuriosidadeCategoria | "todas";
  uf: string;
  cargo?: string;
  atualizadoEm: string | null;
  fonte: "tse" | "cache";
}

