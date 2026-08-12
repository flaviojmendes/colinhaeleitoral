import type {
  CandidatoColinha,
  DataJudResponse,
  NoticiaCandidato,
  ProcessoJudicial,
} from "@/lib/types";

interface TmntMock {
  candidato: CandidatoColinha;
  noticias: NoticiaCandidato[];
  processos: ProcessoJudicial[];
}

const characterImages: Record<string, string> = {
  "Mestre Splinter":
    "https://static.wikia.nocookie.net/nickelodeon/images/1/1e/Character-splinter.png/revision/latest?cb=20170109233040",
  Leonardo:
    "https://static.wikia.nocookie.net/nickelodeon/images/e/e7/TMNT_Leonardo.png/revision/latest?cb=20140519035455",
  Donatello:
    "https://static.wikia.nocookie.net/nickelodeon/images/5/54/TMNT_Donatelo.png/revision/latest?cb=20140519041129",
  Raphael:
    "https://static.wikia.nocookie.net/nickelodeon/images/0/00/TMNT_Raphael.png/revision/latest?cb=20140519041240",
  Michelangelo:
    "https://static.wikia.nocookie.net/nickelodeon/images/f/f7/TMNT_Michelangelo.png/revision/latest?cb=20140519040033",
  "April O'Neil":
    "https://static.wikia.nocookie.net/nickelodeon/images/c/cc/AprilFists.png/revision/latest?cb=20130908102301",
};

const avatar = (nome: string) =>
  characterImages[nome] ??
  `https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=252a28&color=dce9dc&bold=true`;

function candidate(
  values: Pick<
    CandidatoColinha,
    | "cargo"
    | "numero"
    | "nomeUrna"
    | "partido"
    | "patrimonioDeclarado"
    | "totalGastos"
  > & {
    nomeCompleto?: string;
    patrimonioDescricao?: string;
    gastosDescricao?: string;
  },
): CandidatoColinha {
  const patrimonioDetalhes =
    values.patrimonioDeclarado === null
      ? []
      : [
          {
            descricao:
              values.patrimonioDescricao ?? "Patrimônio declarado",
            tipo: "Mock de teste",
            valor: values.patrimonioDeclarado,
          },
        ];
  const gastosDetalhes =
    values.totalGastos === null
      ? []
      : [
          {
            categoria: values.gastosDescricao ?? "Despesas de teste",
            quantidade: 1,
            valor: values.totalGastos,
          },
        ];

  return {
    id: `tmnt-${values.cargo}-${values.numero}`,
    numero: values.numero,
    nomeUrna: values.nomeUrna,
    nomeCompleto: values.nomeCompleto ?? values.nomeUrna,
    partido: values.partido,
    cargo: values.cargo,
    tipoVoto: "candidato",
    fotoUrl: avatar(values.nomeUrna),
    patrimonioDeclarado: values.patrimonioDeclarado,
    totalGastos: values.totalGastos,
    patrimonioDetalhes,
    gastosDetalhes,
    gastosPartido: {
      partido: "PMN",
      disponivel: true,
      totalContratado: values.totalGastos,
      totalPago: values.totalGastos,
      limiteGastos: null,
      detalhes: gastosDetalhes,
    },
    certidoes: [],
    totalGastosPagos: values.totalGastos,
    limiteGastos: null,
    situacao: "Candidato fictício para teste",
  };
}

function legenda(cargo: "deputado-federal" | "deputado-estadual") {
  return {
    candidato: {
      ...candidate({
        cargo,
        numero: "99",
        nomeUrna: "Partido Mutante Ninja",
        partido: "PMN",
        patrimonioDeclarado: null,
        totalGastos: 0,
      }),
      id: `tmnt-${cargo}-legenda-99`,
      tipoVoto: "legenda" as const,
      candidatosNoPartido: 2,
      fotoUrl: null,
      patrimonioDetalhes: undefined,
      gastosDetalhes: undefined,
      gastosPartido: {
        partido: "PMN",
        disponivel: true,
        totalContratado: 999999,
        totalPago: 500,
        limiteGastos: null,
        detalhes: [
          {
            categoria: "Pizza e equipamentos de treinamento",
            quantidade: 99,
            valor: 999999,
          },
        ],
      },
    },
    noticias: [],
    processos: [],
  } satisfies TmntMock;
}

const mocks: Record<string, TmntMock> = {
  "presidente_99": {
    candidato: candidate({
      cargo: "presidente",
      numero: "99",
      nomeUrna: "Mestre Splinter",
      partido: "PMN",
      patrimonioDeclarado: 0,
      totalGastos: 500,
      patrimonioDescricao: "Nenhum bem declarado",
      gastosDescricao: "Fatias de pizza",
    }),
    noticias: [
      {
        titulo:
          "Rato gigante é flagrado dando aulas de artes marciais no esgoto.",
        link: "https://example.com/tmnt/noticia-splinter-dojo",
        dataPublicacao: "2026-08-12T09:00:00.000Z",
        fonte: "O Globo",
      },
      {
        titulo:
          "Candidato do PMN propõe transformar galerias pluviais em academias.",
        link: "https://example.com/tmnt/noticia-splinter-academias",
        dataPublicacao: "2026-08-11T09:00:00.000Z",
        fonte: "G1",
      },
    ],
    processos: [
      {
        id: "tmnt-splinter-tjsp",
        numeroProcesso: "0000099-99.2026.8.26.0001",
        tribunal: "TJSP",
        classe: "Ação civil pública",
        assuntos: [
          "Ocupação irregular de solo urbano (Instalação de Dojo em área de esgoto sanitário).",
        ],
        dataAjuizamento: "2026-08-01",
        poloCandidato: "Réu",
      },
      {
        id: "tmnt-splinter-stj",
        numeroProcesso: "0000099-99.2026.9.00.0000",
        tribunal: "STJ",
        classe: "Ação penal",
        assuntos: ["Adoção irregular de 4 quelônios mutantes."],
        dataAjuizamento: "2026-08-02",
        poloCandidato: "Investigado",
      },
    ],
  },
  "governador_99": {
    candidato: candidate({
      cargo: "governador",
      numero: "99",
      nomeUrna: "Leonardo",
      partido: "PMN",
      patrimonioDeclarado: 50000,
      totalGastos: 10000,
      patrimonioDescricao: "Equipamentos de treinamento",
      gastosDescricao: "Campanha e transporte de equipe",
    }),
    noticias: [],
    processos: [
      {
        id: "tmnt-leonardo-trf3",
        numeroProcesso: "0000099-99.2026.4.03.0001",
        tribunal: "TRF-3",
        classe: "Ação penal",
        assuntos: ["Porte ostensivo de arma branca (Duas Katanas) em via pública."],
        dataAjuizamento: "2026-08-03",
        poloCandidato: "Investigado",
      },
    ],
  },
  "senador-1_991": {
    candidato: candidate({
      cargo: "senador-1",
      numero: "991",
      nomeUrna: "Donatello",
      partido: "PMN",
      patrimonioDeclarado: 900000,
      totalGastos: 150000,
      patrimonioDescricao: "Equipamentos high-tech",
      gastosDescricao: "Pesquisa e desenvolvimento de tecnologia",
    }),
    noticias: [],
    processos: [
      {
        id: "tmnt-donatello-stf",
        numeroProcesso: "0000991-99.2026.1.00.0000",
        tribunal: "STF",
        classe: "Inquérito",
        assuntos: [
          "Invasão de dispositivo informático (Hackeamento do sistema de trânsito para liberar passagem da Van).",
        ],
        dataAjuizamento: "2026-08-04",
        poloCandidato: "Investigado",
      },
    ],
  },
  "senador-2_992": {
    candidato: candidate({
      cargo: "senador-2",
      numero: "992",
      nomeUrna: "Raphael",
      partido: "PMN",
      patrimonioDeclarado: 5000,
      totalGastos: 2000,
      patrimonioDescricao: "Um par de Sai",
      gastosDescricao: "Equipamentos de treino",
    }),
    noticias: [
      {
        titulo: "Debate termina em confusão após candidato perder a paciência.",
        link: "https://example.com/tmnt/noticia-raphael-debate",
        dataPublicacao: "2026-08-12T08:00:00.000Z",
        fonte: "Estadão",
      },
    ],
    processos: [
      {
        id: "tmnt-raphael-tjsp",
        numeroProcesso: "0000992-99.2026.8.26.0001",
        tribunal: "TJSP",
        classe: "Termo circunstanciado",
        assuntos: [
          "Lesão corporal leve e vias de fato contra membros da organização 'Clã do Pé'.",
        ],
        dataAjuizamento: "2026-08-05",
        poloCandidato: "Investigado",
      },
    ],
  },
  "deputado-federal_9999": {
    candidato: candidate({
      cargo: "deputado-federal",
      numero: "9999",
      nomeUrna: "Michelangelo",
      partido: "PMN",
      patrimonioDeclarado: 10,
      totalGastos: 999999,
      patrimonioDescricao: "Um skate",
      gastosDescricao: "Pizza e skate",
    }),
    noticias: [
      {
        titulo: "Candidato usa fundo eleitoral para comprar 500 pizzas de pepperoni.",
        link: "https://example.com/tmnt/noticia-michelangelo-pizzas",
        dataPublicacao: "2026-08-12T07:00:00.000Z",
        fonte: "Folha",
      },
      {
        titulo: "Skate no Congresso: Deputado promete half-pipe na Esplanada.",
        link: "https://example.com/tmnt/noticia-michelangelo-skate",
        dataPublicacao: "2026-08-10T07:00:00.000Z",
        fonte: "UOL",
      },
    ],
    processos: [],
  },
  "deputado-estadual_99999": {
    candidato: candidate({
      cargo: "deputado-estadual",
      numero: "99999",
      nomeUrna: "April O'Neil",
      partido: "PMN",
      patrimonioDeclarado: 150000,
      totalGastos: 45000,
      patrimonioDescricao: "Câmera e van",
      gastosDescricao: "Produção jornalística",
    }),
    noticias: [],
    processos: [],
  },
  "deputado-federal_99": legenda("deputado-federal"),
  "deputado-estadual_99": legenda("deputado-estadual"),
};

const aliases: Record<string, string> = {
  "mestre splinter": "presidente_99",
  splinter: "presidente_99",
  leonardo: "governador_99",
  donatello: "senador-1_991",
  raphael: "senador-2_992",
  rafael: "senador-2_992",
  michelangelo: "deputado-federal_9999",
  "april oneil": "deputado-estadual_99999",
  "april o neil": "deputado-estadual_99999",
  "april o'neil": "deputado-estadual_99999",
  "partido mutante ninja": "deputado-federal_99",
  pmn: "deputado-federal_99",
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/['’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getTmntMock(cargo: string, numero: string): TmntMock | null {
  return mocks[`${cargo}_${numero}`] ?? null;
}

export function isTmntNumber(numero: string): boolean {
  return numero.startsWith("99");
}

export function getTmntMockByName(nome: string): TmntMock | null {
  const normalized = normalize(nome);
  const key = aliases[normalized];

  if (key) {
    return mocks[key] ?? null;
  }

  const entry = Object.entries(aliases).find(
    ([alias]) =>
      normalized.includes(alias) || alias.includes(normalized),
  );

  return entry ? mocks[entry[1]] ?? null : null;
}

export function isTmntName(nome: string): boolean {
  return getTmntMockByName(nome) !== null;
}

export function tmntProcessesResponse(nome: string): DataJudResponse | null {
  const mock = getTmntMockByName(nome);
  if (!mock) {
    return null;
  }

  const processos = mock.processos.map((processo, index) => ({
    ...processo,
    // Mantém o formato de protocolo plausível sem consultar nenhum tribunal.
    numeroProcesso: fakeProtocol(processo.tribunal, index),
  }));

  return {
    nomeConsultado: nome,
    totalProcessos: processos.length,
    processos,
    tribunais: [
      {
        alias: "tmnt-mock",
        nome: "Tribunal Mutante Ninja (mock)",
        processos,
        totalEncontrado: processos.length,
        disponivel: true,
      },
    ],
  };
}

function fakeProtocol(tribunal: string, index: number): string {
  const digits = Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 10),
  ).join("");
  const tribunalCode = tribunal === "STF" ? "1.00" : "8.26";

  return `${digits}${String(index + 1).padStart(3, "0")}-99.2026.${tribunalCode}.0001`;
}
