import { NextResponse } from "next/server";

import { getCargoConfig, getCargoFromParam } from "@/lib/cargos";
import { kv } from "@/lib/kv";
import {
  CandidateNotFoundError,
  listCandidates,
  lookupCandidate,
  makeCandidateCacheKey,
  makeCandidateListCacheKey,
} from "@/lib/tse";
import type { CandidateListItem, CandidatoColinha } from "@/lib/types";

export const preferredRegion = "gru1";
export const runtime = "nodejs";

const REQUEST_TIMEOUT_MS = 8_000;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const uf = searchParams.get("uf")?.trim().toUpperCase();
  const cargoParam = searchParams.get("cargo")?.trim().toLowerCase();
  const numero = searchParams.get("numero")?.trim() ?? "";
  const listMode = searchParams.get("lista") === "true";

  if (!uf || !cargoParam || (!numero && !listMode)) {
    return jsonError(
      listMode
        ? "Informe UF e cargo para listar os candidatos."
        : "Informe UF, cargo e número do candidato.",
      400,
    );
  }

  const cargo = getCargoFromParam(cargoParam, uf);
  if (!cargo) {
    return jsonError("Cargo inválido.", 400);
  }

  const config = getCargoConfig(cargo, uf);
  if (!listMode && !new RegExp(`^\\d{${config.maxLength}}$`).test(numero)) {
    return jsonError(
      `O número de ${config.label} deve ter ${config.maxLength} dígitos.`,
      400,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    if (listMode) {
      const candidatos = await listCandidates({ uf, cargo }, controller.signal);
      const listCacheKey = makeCandidateListCacheKey(uf, cargo);

      try {
        await kv.set(listCacheKey, candidatos);
      } catch {
        // Um problema de escrita não deve esconder uma lista válida do TSE.
      }

      return NextResponse.json(
        { candidatos },
        {
          headers: {
            "Cache-Control": "private, no-store",
            "X-Data-Source": "tse",
          },
        },
      );
    }

    const cacheKey = makeCandidateCacheKey(uf, cargo, numero);
    const dadosCandidato = await lookupCandidate(
      { uf, cargo, numero },
      controller.signal,
    );

    try {
      await kv.set(cacheKey, dadosCandidato);
    } catch {
      // Um problema de escrita do cache não deve esconder uma resposta válida do TSE.
    }

    return NextResponse.json(dadosCandidato, {
      headers: {
        "Cache-Control": "private, no-store",
        "X-Data-Source": "tse",
      },
    });
  } catch (error) {
    if (error instanceof CandidateNotFoundError) {
      return jsonError("Não encontramos um candidato com esse número.", 404);
    }

    if (listMode) {
      const listCacheKey = makeCandidateListCacheKey(uf, cargo);
      let fallback: CandidateListItem[] | null = null;
      try {
        fallback = await kv.get<CandidateListItem[]>(listCacheKey);
      } catch {
        fallback = null;
      }

      if (fallback) {
        return NextResponse.json(
          { candidatos: fallback },
          {
            headers: {
              "Cache-Control": "private, no-store",
              "X-Data-Source": "kv-fallback",
            },
          },
        );
      }

      return jsonError(
        "A lista de candidatos está temporariamente indisponível. Tente novamente em instantes.",
        500,
      );
    }

    const cacheKey = makeCandidateCacheKey(uf, cargo, numero);
    let fallback: CandidatoColinha | null = null;
    try {
      fallback = await kv.get<CandidatoColinha>(cacheKey);
    } catch {
      fallback = null;
    }

    if (fallback) {
      return NextResponse.json(fallback, {
        headers: {
          "Cache-Control": "private, no-store",
          "X-Data-Source": "kv-fallback",
        },
      });
    }

    return jsonError(
      "O serviço de consulta do TSE está temporariamente indisponível. Tente novamente em instantes.",
      500,
    );
  } finally {
    clearTimeout(timeout);
  }
}
