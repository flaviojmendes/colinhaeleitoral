import { ExternalLink } from "lucide-react";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="no-print border-t border-console-edge">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 text-sm text-console-muted sm:px-6">
        <p>Colinha Eleitoral · um papel de lembrete para o dia da votação</p>
        <p>
          feito com 👀 por{" "}
          <a
            href="https://instagram.com/trilhainfo"
            target="_blank"
            rel="noreferrer"
            className="font-bold text-console-ink hover:text-white"
          >
            @trilhainfo
          </a>
        </p>
        <nav
          aria-label="Informações legais"
          className="flex flex-wrap items-center gap-x-5 gap-y-2"
        >
          <Link
            href="/privacidade"
            className="inline-flex min-h-11 items-center font-bold text-console-ink hover:text-white"
          >
            Privacidade
          </Link>
          <Link
            href="/termos"
            className="inline-flex min-h-11 items-center font-bold text-console-ink hover:text-white"
          >
            Termos de uso
          </Link>
          <a
            href="https://divulgacandcontas.tse.jus.br/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 font-bold text-console-ink hover:text-white"
          >
            Site oficial do TSE
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        </nav>
      </div>
    </footer>
  );
}
