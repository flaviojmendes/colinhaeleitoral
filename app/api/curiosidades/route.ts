import { NextResponse } from "next/server";

import { isKnownUf } from "@/lib/cargos";
import {
  getCuriosidades,
  parseCuriosidadeCategoria,
} from "@/lib/curiosidades";

export const preferredRegion = "gru1";
export const runtime = "nodejs";
export const maxDuration = 30;

const REQUEST_TIMEOUT_MS = 24_000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const uf = searchParams.get("uf")?.trim().toUpperCase() || "SP";
  const categoria = parseCuriosidadeCategoria(
    searchParams.get("categoria")?.trim().toLowerCase(),
  );
  const cargo = searchParams.get("cargo")?.trim().toLowerCase() || undefined;
  const busca = searchParams.get("busca")?.trim() || undefined;
  const limiteParam = searchParams.get("limite");
  const limite = limiteParam
    ? Math.max(1, Math.min(100, Number(limiteParam)))
    : undefined;

  if (!isKnownUf(uf)) {
    return NextResponse.json({ error: "UF inválida." }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const data = await getCuriosidades(
      { uf, categoria, cargo, busca, limite },
      controller.signal,
    );

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        "X-Data-Source": data.fonte,
      },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Não foi possível montar os rankings com os dados do TSE agora. Tente de novo em instantes.",
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
