import { getCargoConfig, getUfLabel } from "@/lib/cargos";
import type { CandidatoColinha, CargoSlug } from "@/lib/types";

export function buildCandidateSharePath(
  uf: string,
  candidato: Pick<CandidatoColinha, "cargo" | "numero" | "tipoVoto">,
) {
  const path = `/c/${encodeURIComponent(uf.toUpperCase())}/${encodeURIComponent(
    candidato.cargo,
  )}/${encodeURIComponent(candidato.numero)}`;

  if (candidato.tipoVoto === "legenda") {
    return `${path}?legenda=1`;
  }

  return path;
}

export function buildCandidateShareUrl(
  origin: string,
  uf: string,
  candidato: Pick<CandidatoColinha, "cargo" | "numero" | "tipoVoto">,
) {
  return `${origin}${buildCandidateSharePath(uf, candidato)}`;
}

export function buildCandidateShareText(
  uf: string,
  candidato: CandidatoColinha,
  url: string,
) {
  const cargoLabel = getCargoConfig(candidato.cargo as CargoSlug, uf).label;
  const place = getUfLabel(uf);
  const isLegenda = candidato.tipoVoto === "legenda";

  const lines = isLegenda
    ? [
        `Partido: ${candidato.partido}`,
        `Número: ${candidato.numero}`,
        `Cargo: ${cargoLabel} (${place})`,
        "Voto de legenda (só no partido).",
      ]
    : [
        `Candidato: ${candidato.nomeUrna}`,
        `Número: ${candidato.numero}`,
        `Partido: ${candidato.partido}`,
        `Cargo: ${cargoLabel} (${place})`,
      ];

  return `${lines.join("\n")}\n\nConfira no Colinha Eleitoral:\n${url}`;
}
