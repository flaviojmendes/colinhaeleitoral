import Parser from "rss-parser";

import type { NoticiaCandidato } from "@/lib/types";

const GOOGLE_NEWS_ENDPOINT = "https://news.google.com/rss/search";
const MAX_NOTICIAS = 3;

interface GoogleNewsItem {
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  /** O Google publica a fonte em <source url="…">Nome do veículo</source>. */
  source?: string;
}

const parser = new Parser<Record<string, unknown>, GoogleNewsItem>({
  customFields: { item: ["source"] },
});

function buildFeedUrl(nome: string): string {
  const url = new URL(GOOGLE_NEWS_ENDPOINT);
  url.searchParams.set("q", `"${nome}" eleições`);
  url.searchParams.set("hl", "pt-BR");
  url.searchParams.set("gl", "BR");
  url.searchParams.set("ceid", "BR:pt-419");
  return url.toString();
}

/** O Google repete o veículo no fim do título; sem isso a lista fica redundante. */
function stripSourceSuffix(titulo: string, fonte: string): string {
  const suffix = ` - ${fonte}`;
  return titulo.endsWith(suffix)
    ? titulo.slice(0, -suffix.length).trim()
    : titulo;
}

function toIsoDate(item: GoogleNewsItem): string {
  const raw = item.isoDate ?? item.pubDate;
  if (!raw) {
    return "";
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function toNoticia(item: GoogleNewsItem): NoticiaCandidato | null {
  const titulo = item.title?.trim();
  const link = item.link?.trim();

  if (!titulo || !link) {
    return null;
  }

  const fonte = item.source?.trim() || "Fonte não informada";

  return {
    titulo: stripSourceSuffix(titulo, fonte),
    link,
    dataPublicacao: toIsoDate(item),
    fonte,
  };
}

export async function fetchCandidateNews(
  nome: string,
  signal: AbortSignal,
): Promise<NoticiaCandidato[]> {
  const response = await fetch(buildFeedUrl(nome), {
    signal,
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Google Notícias respondeu ${response.status}.`);
  }

  const feed = await parser.parseString(await response.text());

  return (feed.items ?? [])
    .flatMap((item) => {
      const noticia = toNoticia(item);
      return noticia ? [noticia] : [];
    })
    .sort(
      (left, right) =>
        Date.parse(right.dataPublicacao || "0") -
        Date.parse(left.dataPublicacao || "0"),
    )
    .slice(0, MAX_NOTICIAS);
}
