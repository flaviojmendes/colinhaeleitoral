import type { CuriosidadeCategoria } from "@/lib/types";

export const CURIOSIDADES_CATEGORIAS: readonly {
  id: CuriosidadeCategoria;
  label: string;
  shortLabel: string;
  descricao: string;
}[] = [
  {
    id: "mais-ricos",
    label: "Maior patrimônio",
    shortLabel: "Maior patrimônio",
    descricao:
      "Soma dos bens declarados ao TSE na ficha de cada candidato. Valores são autodeclaração.",
  },
  {
    id: "menos-patrimonio",
    label: "Menor patrimônio",
    shortLabel: "Menor patrimônio",
    descricao:
      "Candidatos que declararam R$ 0,00 ou os menores totais de bens neste recorte.",
  },
  {
    id: "mais-jovens",
    label: "Mais jovens",
    shortLabel: "Mais jovens",
    descricao: "Idade no primeiro turno de 2026, a partir da data de nascimento do TSE.",
  },
  {
    id: "mais-experientes",
    label: "Mais experientes",
    shortLabel: "Mais experientes",
    descricao: "Candidatos com maior idade neste recorte de presidente, governador e senador.",
  },
  {
    id: "recordistas-eleicoes",
    label: "Veteranos de urna",
    shortLabel: "Veteranos",
    descricao:
      "Quantas eleições anteriores o TSE registra para cada pessoa, além de 2026.",
  },
  {
    id: "estreantes",
    label: "Primeira disputa",
    shortLabel: "Estreantes",
    descricao:
      "Candidatos sem eleição anterior no histórico do TSE — primeira vez na urna.",
  },
  {
    id: "ocupacoes",
    label: "Ocupações",
    shortLabel: "Ocupações",
    descricao:
      "Profissão declarada na candidatura. Cargos eletivos atuais aparecem por último.",
  },
  {
    id: "reeleicao",
    label: "Tentando reeleição",
    shortLabel: "Reeleição",
    descricao:
      "Quem declara ocupar hoje o mesmo cargo que disputa, ou que o TSE já marca como reeleição.",
  },
];
