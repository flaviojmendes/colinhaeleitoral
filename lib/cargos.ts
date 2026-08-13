import type { CargoConfig, CargoSlug, Uf } from "@/lib/types";

/** Número do partido na urna: os dois primeiros dígitos do voto proporcional. */
export const LEGENDA_LENGTH = 2;

export const CARGOS_2026: readonly CargoConfig[] = [
  {
    slug: "deputado-federal",
    label: "Deputado Federal",
    shortLabel: "Dep. Federal",
    tseCode: 6,
    maxLength: 4,
    proporcional: true,
  },
  {
    slug: "deputado-estadual",
    label: "Deputado Estadual",
    shortLabel: "Dep. Estadual",
    tseCode: 7,
    maxLength: 5,
    proporcional: true,
  },
  {
    slug: "senador-1",
    label: "Senador 1",
    shortLabel: "Senador",
    tseCode: 5,
    maxLength: 3,
    proporcional: false,
  },
  {
    slug: "senador-2",
    label: "Senador 2",
    shortLabel: "Senador",
    tseCode: 5,
    maxLength: 3,
    proporcional: false,
  },
  {
    slug: "governador",
    label: "Governador",
    shortLabel: "Governador",
    tseCode: 3,
    maxLength: 2,
    proporcional: false,
  },
  {
    slug: "presidente",
    label: "Presidente",
    shortLabel: "Presidente",
    tseCode: 1,
    maxLength: 2,
    proporcional: false,
  },
];

export const UF_OPTIONS = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
] as const;

const UF_LABEL_BY_VALUE = new Map<string, string>(
  UF_OPTIONS.map((uf) => [uf.value, uf.label]),
);

export function isKnownUf(value: string): boolean {
  return UF_LABEL_BY_VALUE.has(value);
}

export function getUfLabel(value: string): string {
  return UF_LABEL_BY_VALUE.get(value) ?? value;
}

const CONFIG_BY_SLUG = new Map(
  CARGOS_2026.map((cargo) => [cargo.slug, cargo]),
);

export function getCargoConfig(slug: CargoSlug, uf: Uf): CargoConfig {
  const config = CONFIG_BY_SLUG.get(slug);

  if (!config) {
    throw new Error(`Cargo inválido: ${slug}`);
  }

  if (slug === "deputado-estadual" && uf === "DF") {
    return {
      ...config,
      label: "Deputado Distrital",
      shortLabel: "Dep. Distrital",
      tseCode: 8,
    };
  }

  return config;
}

export function getCargoFromParam(value: string, uf: Uf): CargoSlug | null {
  const bySlug = CARGOS_2026.find((cargo) => cargo.slug === value);

  if (bySlug) {
    return bySlug.slug;
  }

  const code = Number(value);
  if (!Number.isInteger(code)) {
    return null;
  }

  return (
    CARGOS_2026.find((cargo) => getCargoConfig(cargo.slug, uf).tseCode === code)
      ?.slug ?? null
  );
}

export function getElectionUf(cargo: CargoSlug, uf: Uf): string {
  return cargo === "presidente" ? "BR" : uf;
}

export function normalizeCandidateNumber(value: string | number): string {
  const digits = String(value).replace(/\D/g, "");
  return digits.replace(/^0+(?=\d)/, "") || "0";
}

export function formatCandidateNumber(
  value: string | number,
  length: number,
): string {
  return normalizeCandidateNumber(value).padStart(length, "0");
}
