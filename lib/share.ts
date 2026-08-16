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

export function buildColinhaShareText(uf: string, count: number) {
  const place = getUfLabel(uf);
  return `Minha colinha de votação · ${place} · ${count} cargo${
    count === 1 ? "" : "s"
  }.\nFeita no Colinha Eleitoral.`;
}

export function canShareFiles(files: File[]) {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files })
  );
}

export async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.left = "-9999px";
  document.body.appendChild(field);
  field.select();
  document.execCommand("copy");
  document.body.removeChild(field);
}
