import { NextResponse } from "next/server";

import {
  extractBearerToken,
  isValidAdminSecret,
} from "@/lib/admin-auth";
import { TSE_PAGE_ORIGIN } from "@/lib/tse";

const ALLOWED_ORIGINS = new Set([TSE_PAGE_ORIGIN]);

export function adminCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  const allowOrigin =
    origin && ALLOWED_ORIGINS.has(origin) ? origin : undefined;

  return {
    ...(allowOrigin
      ? {
          "Access-Control-Allow-Origin": allowOrigin,
          Vary: "Origin",
        }
      : {}),
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "private, no-store",
  };
}

export function jsonError(
  request: Request,
  message: string,
  status: number,
) {
  return NextResponse.json(
    { error: message },
    { status, headers: adminCorsHeaders(request) },
  );
}

export function requireAdmin(request: Request): NextResponse | null {
  if (!isValidAdminSecret(extractBearerToken(request))) {
    return jsonError(request, "Não autorizado.", 401);
  }

  return null;
}

export function optionsResponse(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: adminCorsHeaders(request),
  });
}
