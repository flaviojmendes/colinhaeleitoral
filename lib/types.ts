export type CargoSlug =
  | "deputado-federal"
  | "deputado-estadual"
  | "senador-1"
  | "senador-2"
  | "governador"
  | "presidente";

export type Uf = string;

export interface CandidatoColinha {
  id: string;
  numero: string;
  nomeUrna: string;
  partido: string;
  cargo: CargoSlug;
  fotoUrl: string | null;
  patrimonioDeclarado: number | null;
  totalGastos: number | null;
  patrimonioDetalhes?: PatrimonioDetalhe[];
  gastosDetalhes?: GastoDetalhe[];
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

export interface CandidateListItem {
  id: string;
  numero: string;
  nomeUrna: string;
  partido: string;
  cargo: CargoSlug;
  fotoUrl: string | null;
  situacao?: string;
}

export interface TSEParty {
  numero?: number | string | null;
  sigla?: string | null;
  nome?: string | null;
}

export interface TSECargo {
  codigo?: number | string | null;
  nome?: string | null;
}

export interface TSECandidateSummary {
  id: number | string;
  nomeUrna?: string | null;
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

export interface TSECandidateDetails extends TSECandidateSummary {
  bens?: TSEAsset[] | null;
  totalDeBens?: number | string | null;
  st_DIVULGA_BENS?: boolean | null;
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
}
