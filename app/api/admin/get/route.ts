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

const MAX_KEYS = 40;

interface GetBody {
  keys?: string[];
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) {
    return unauthorized;
  }

  let body: GetBody;
  try {
    body = (await request.json()) as GetBody;
  } catch {
    return jsonError(request, "JSON inválido.", 400);
  }

  const keys = Array.isArray(body.keys) ? body.keys : [];
  if (keys.length > MAX_KEYS) {
    return jsonError(request, `Envie no máximo ${MAX_KEYS} chaves.`, 400);
  }

  const records: Record<string, unknown> = {};

  for (const key of keys) {
    if (!isTseCacheKey(key)) {
      return jsonError(request, `Chave de cache inválida: ${key}`, 400);
    }

    const value = await kv.get(key);
    if (value !== null && value !== undefined) {
      records[key] = value;
    }
  }

  return NextResponse.json(
    { records },
    { headers: adminCorsHeaders(request) },
  );
}
