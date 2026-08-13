import Link from "next/link";

import { PageShell } from "@/components/page-shell";

export default function NotFound() {
  return (
    <PageShell>
      <main className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-3xl font-black tracking-tight text-console-ink">
          Não encontramos esta página
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-console-muted">
          O link pode estar incompleto ou o candidato não existe mais. Volte e
          procure pelo nome na lista.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex h-14 items-center rounded-xl bg-accent px-6 text-base font-bold text-white transition-colors duration-150 hover:bg-accent-deep"
        >
          Ir para o início
        </Link>
      </main>
    </PageShell>
  );
}
