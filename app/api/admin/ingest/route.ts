import { NextResponse } from "next/server";

import {
  adminCorsHeaders,
  jsonError,
  optionsResponse,
  requireAdmin,
} from "@/lib/admin-api";
import { kv } from "@/lib/kv";
import { isTseCacheKey } from "@/lib/tse";

export const preferredRegion = "gru1";
export const runtime = "nodejs";

const MAX_ITEMS = 40;

interface IngestItem {
  key: string;
  value: unknown;
}

interface IngestBody {
  items?: IngestItem[];
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) {
    return unauthorized;
  }

  let body: IngestBody;
  try {
    body = (await request.json()) as IngestBody;
  } catch {
    return jsonError(request, "JSON inválido.", 400);
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return jsonError(request, "Nenhum item para gravar.", 400);
  }

  if (items.length > MAX_ITEMS) {
    return jsonError(
      request,
      `Envie no máximo ${MAX_ITEMS} itens por vez.`,
      400,
    );
  }

  for (const item of items) {
    if (!item?.key || !isTseCacheKey(item.key)) {
      return jsonError(request, `Chave de cache inválida: ${item?.key}`, 400);
    }
  }

  await Promise.all(items.map((item) => kv.set(item.key, item.value)));

  return NextResponse.json(
    { saved: items.length },
    { headers: adminCorsHeaders(request) },
  );
}
