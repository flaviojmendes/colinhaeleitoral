"use client";

import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  LoaderCircle,
  Newspaper,
} from "lucide-react";
import { useState } from "react";
import useSWR from "swr";

import type { NoticiaCandidato } from "@/lib/types";

interface CandidateNewsProps {
  nome: string;
}

async function fetchNoticias(url: string): Promise<NoticiaCandidato[]> {
  const response = await fetch(url);
  const payload = (await response.json().catch(() => null)) as
    | NoticiaCandidato[]
    | { error?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      (payload && !Array.isArray(payload) ? payload.error : null) ??
        "Não foi possível carregar as notícias.",
    );
  }

  return payload;
}

function formatDate(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function CandidateNews({ nome }: CandidateNewsProps) {
  const [open, setOpen] = useState(false);
  const { data, error, isLoading } = useSWR<NoticiaCandidato[]>(
    open ? `/api/noticias?nome=${encodeURIComponent(nome)}` : null,
    fetchNoticias,
    { revalidateOnFocus: false },
  );

  return (
    <div className="border-t border-screen-line">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-white sm:px-5"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Newspaper className="shrink-0 text-muted" size={18} aria-hidden="true" />
          <span className="text-base font-bold text-ink">Notícias recentes</span>
        </span>
        {open ? (
          <ChevronUp className="shrink-0 text-muted" size={17} aria-hidden="true" />
        ) : (
          <ChevronDown className="shrink-0 text-muted" size={17} aria-hidden="true" />
        )}
      </button>

      {open ? (
        <div className="border-t border-screen-line bg-white">
          <p className="px-4 py-4 text-sm leading-6 text-muted sm:px-5">
            Resultados automáticos da internet pelo nome de urna. O app não
            escolhe nem recomenda essas matérias.
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 border-t border-screen-line px-4 py-8 text-xs font-semibold text-muted">
              <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />
              Buscando notícias…
            </div>
          ) : error ? (
            <p
              role="alert"
              className="border-t border-screen-line px-4 py-6 text-center text-xs font-semibold leading-5 text-coral-ink sm:px-5"
            >
              {error instanceof Error
                ? error.message
                : "Não foi possível carregar as notícias."}
            </p>
          ) : data && data.length > 0 ? (
            <ul className="border-t border-screen-line">
              {data.map((noticia) => {
                const publishedAt = formatDate(noticia.dataPublicacao);

                return (
                  <li
                    key={noticia.link}
                    className="border-b border-screen-line last:border-b-0"
                  >
                    <a
                      href={noticia.link}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-h-14 items-start justify-between gap-3 px-4 py-3 transition-colors duration-150 hover:bg-screen sm:px-5"
                    >
                      <span className="min-w-0">
                        <span className="block text-xs font-bold leading-5 text-accent">
                          {noticia.titulo}
                        </span>
                        <span className="mt-1 block font-mono text-[10px] tracking-widest text-muted">
                          {noticia.fonte.toLocaleUpperCase("pt-BR")}
                          {publishedAt ? ` · ${publishedAt}` : ""}
                        </span>
                      </span>
                      <ExternalLink
                        className="mt-0.5 shrink-0 text-accent"
                        size={14}
                        aria-hidden="true"
                      />
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="border-t border-screen-line px-4 py-6 text-center text-xs leading-5 text-muted sm:px-5">
              Nenhuma notícia recente foi encontrada para este nome.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
