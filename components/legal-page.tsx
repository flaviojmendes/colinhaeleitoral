import type { ReactNode } from "react";

import { LEGAL_UPDATED_AT } from "@/lib/legal";

import { PageShell } from "./page-shell";

interface LegalPageProps {
  title: string;
  children: ReactNode;
}

export function LegalPage({ title, children }: LegalPageProps) {
  return (
    <PageShell>
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <article className="rounded-2xl border border-console-edge bg-console p-2.5 sm:p-3">
          <div className="screen-surface rounded-xl px-5 py-6 sm:px-8 sm:py-8">
            <p className="text-sm font-semibold text-muted">
              Atualizado em {LEGAL_UPDATED_AT}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-ink sm:text-4xl">
              {title}
            </h1>
            <div className="legal-copy mt-6">{children}</div>
          </div>
        </article>
      </main>
    </PageShell>
  );
}
