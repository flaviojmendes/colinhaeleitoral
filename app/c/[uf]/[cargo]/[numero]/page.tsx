import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/page-shell";
import { SharedCandidateView } from "@/components/shared-candidate-view";
import { getCargoFromParam, isKnownUf } from "@/lib/cargos";

interface SharedCandidatePageProps {
  params: Promise<{
    uf: string;
    cargo: string;
    numero: string;
  }>;
  searchParams: Promise<{
    legenda?: string;
  }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: SharedCandidatePageProps): Promise<Metadata> {
  const { uf, cargo, numero } = await params;
  const { legenda } = await searchParams;
  const isLegenda = legenda === "1" || legenda === "true";

  return {
    title: isLegenda
      ? `Partido ${numero} · ${uf.toUpperCase()}`
      : `Candidato ${numero} · ${uf.toUpperCase()}`,
    description: isLegenda
      ? `Confira o partido ${numero} para ${cargo} em ${uf.toUpperCase()} no Colinha Eleitoral.`
      : `Confira o candidato ${numero} para ${cargo} em ${uf.toUpperCase()} no Colinha Eleitoral.`,
  };
}

export default async function SharedCandidatePage({
  params,
  searchParams,
}: SharedCandidatePageProps) {
  const { uf: ufParam, cargo: cargoParam, numero: numeroParam } = await params;
  const { legenda } = await searchParams;
  const uf = ufParam.trim().toUpperCase();
  const numero = numeroParam.trim();
  const cargo = getCargoFromParam(cargoParam.trim().toLowerCase(), uf);

  if (!isKnownUf(uf) || !cargo || !numero) {
    notFound();
  }

  return (
    <PageShell backLabel="Montar minha lista">
      <SharedCandidateView
        uf={uf}
        cargo={cargo}
        numero={numero}
        legenda={legenda === "1" || legenda === "true"}
      />
    </PageShell>
  );
}
