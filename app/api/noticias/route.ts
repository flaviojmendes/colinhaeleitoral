import { NextResponse } from "next/server";

import { fetchCandidateNews } from "@/lib/noticias";

export const preferredRegion = "gru1";
export const runtime = "nodejs";

const REQUEST_TIMEOUT_MS = 8_000;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nome = searchParams.get("nome")?.trim().replace(/\s+/g, " ");

  if (!nome || nome.length < 3) {
    return jsonError("Informe o nome do candidato.", 400);
  }

  if (nome.length > 120) {
    return jsonError("O nome informado é muito longo.", 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const noticias = await fetchCandidateNews(nome, controller.signal);

    return NextResponse.json(noticias, {
      headers: {
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return jsonError(
      "Não foi possível carregar as notícias agora. Tente novamente em instantes.",
      502,
    );
  } finally {
    clearTimeout(timeout);
  }
}
