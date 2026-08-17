import type { Metadata } from "next";

import { CuriosidadesExplorer } from "@/components/curiosidades-explorer";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Rankings · Eleições 2026",
  description:
    "Patrimônio declarado, idade, veteranos de urna e ocupações de presidente, governador e senador nas Eleições 2026, com dados oficiais do TSE.",
  openGraph: {
    title: "Rankings · Eleições 2026",
    description:
      "Compare patrimônio, idade e histórico de urna com dados oficiais do TSE.",
    type: "website",
  },
};

export default function CuriosidadesPage() {
  return (
    <PageShell backHref="/" backLabel="Voltar para a colinha">
      <main className="no-print">
        <CuriosidadesExplorer />
      </main>
    </PageShell>
  );
}
