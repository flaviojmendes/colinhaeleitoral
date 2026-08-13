import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { SiteFooter } from "./site-footer";

interface PageShellProps {
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
}

export function PageShell({
  children,
  backHref = "/",
  backLabel = "Voltar ao início",
}: PageShellProps) {
  return (
    <div className="min-h-screen bg-console-deep">
      <header className="no-print border-b border-console-edge">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-3 rounded-lg" aria-label="Início">
            <Image
              src="/icon.svg"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 rounded-md"
              aria-hidden="true"
            />
            <span>
              <span className="block text-base font-bold tracking-tight text-console-ink">
                Colinha Eleitoral
              </span>
              <span className="block text-sm text-console-muted">Eleições 2026</span>
            </span>
          </Link>
          <Link
            href={backHref}
            className="inline-flex h-12 items-center rounded-xl px-3 text-sm font-bold text-console-muted transition-colors duration-150 hover:text-console-ink"
          >
            {backLabel}
          </Link>
        </div>
      </header>
      {children}
      <SiteFooter />
    </div>
  );
}
