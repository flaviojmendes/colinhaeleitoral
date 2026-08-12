import { NextResponse } from "next/server";

import { LEGENDA_LENGTH, getCargoConfig, getCargoFromParam } from "@/lib/cargos";
import { kv } from "@/lib/kv";
import {
  CandidateNotFoundError,
  PartyNotFoundError,
  PartyVoteNotAllowedError,
  listCandidates,
  listParties,
  lookupCandidate,
  lookupParty,
  makeCandidateCacheKey,
  makeCandidateListCacheKey,
  makePartyCacheKey,
  makePartyListCacheKey,
} from "@/lib/tse";
import type {
  CandidateListItem,
  CandidatoColinha,
  PartidoListItem,
} from "@/lib/types";

export const preferredRegion = "gru1";
export const runtime = "nodejs";

const REQUEST_TIMEOUT_MS = 8_000;

const TSE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Data-Source": "tse",
};

const FALLBACK_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Data-Source": "kv-fallback",
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const uf = searchParams.get("uf")?.trim().toUpperCase();
  const cargoParam = searchParams.get("cargo")?.trim().toLowerCase();
  const numero = searchParams.get("numero")?.trim() ?? "";
  const listMode = searchParams.get("lista") === "true";
  const partyListMode = searchParams.get("partidos") === "true";
  const legendaMode = searchParams.get("legenda") === "true";
  const needsNumber = !listMode && !partyListMode;

  if (!uf || !cargoParam || (needsNumber && !numero)) {
    return jsonError(
      needsNumber
        ? "Informe UF, cargo e número."
        : "Informe UF e cargo para listar.",
      400,
    );
  }

  const cargo = getCargoFromParam(cargoParam, uf);
  if (!cargo) {
    return jsonError("Cargo inválido.", 400);
  }

  const config = getCargoConfig(cargo, uf);

  if ((partyListMode || legendaMode) && !config.proporcional) {
    return jsonError(
      `${config.label} é eleição majoritária e não aceita voto de legenda.`,
      400,
    );
  }

  const expectedLength = legendaMode ? LEGENDA_LENGTH : config.maxLength;
  if (needsNumber && !new RegExp(`^\\d{${expectedLength}}$`).test(numero)) {
    return jsonError(
      legendaMode
        ? `O número do partido deve ter ${LEGENDA_LENGTH} dígitos.`
        : `O número de ${config.label} deve ter ${config.maxLength} dígitos.`,
      400,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    if (partyListMode) {
      const partidos = await listParties({ uf, cargo }, controller.signal);

      try {
        await kv.set(makePartyListCacheKey(uf, cargo), partidos);
      } catch {
        // Um problema de escrita não deve esconder uma lista válida do TSE.
      }

      return NextResponse.json({ partidos }, { headers: TSE_HEADERS });
    }

    if (listMode) {
      const candidatos = await listCandidates({ uf, cargo }, controller.signal);

      try {
        await kv.set(makeCandidateListCacheKey(uf, cargo), candidatos);
      } catch {
        // Um problema de escrita não deve esconder uma lista válida do TSE.
      }

      return NextResponse.json({ candidatos }, { headers: TSE_HEADERS });
    }

    const cacheKey = legendaMode
      ? makePartyCacheKey(uf, cargo, numero)
      : makeCandidateCacheKey(uf, cargo, numero);
    const dados = legendaMode
      ? await lookupParty({ uf, cargo, numero }, controller.signal)
      : await lookupCandidate({ uf, cargo, numero }, controller.signal);

    try {
      await kv.set(cacheKey, dados);
    } catch {
      // Um problema de escrita do cache não deve esconder uma resposta válida do TSE.
    }

    return NextResponse.json(dados, { headers: TSE_HEADERS });
  } catch (error) {
    if (error instanceof PartyVoteNotAllowedError) {
      return jsonError(
        `${config.label} é eleição majoritária e não aceita voto de legenda.`,
        400,
      );
    }

    if (error instanceof PartyNotFoundError) {
      return jsonError(
        "Nenhum partido com esse número disputa este cargo na sua UF.",
        404,
      );
    }

    if (error instanceof CandidateNotFoundError) {
      return jsonError("Não encontramos um candidato com esse número.", 404);
    }

    if (partyListMode) {
      const fallback = await readCache<PartidoListItem[]>(
        makePartyListCacheKey(uf, cargo),
      );

      if (fallback) {
        return NextResponse.json(
          { partidos: fallback },
          { headers: FALLBACK_HEADERS },
        );
      }

      return jsonError(
        "A lista de partidos está temporariamente indisponível. Tente novamente em instantes.",
        500,
      );
    }

    if (listMode) {
      const fallback = await readCache<CandidateListItem[]>(
        makeCandidateListCacheKey(uf, cargo),
      );

      if (fallback) {
        return NextResponse.json(
          { candidatos: fallback },
          { headers: FALLBACK_HEADERS },
        );
      }

      return jsonError(
        "A lista de candidatos está temporariamente indisponível. Tente novamente em instantes.",
        500,
      );
    }

    const fallback = await readCache<CandidatoColinha>(
      legendaMode
        ? makePartyCacheKey(uf, cargo, numero)
        : makeCandidateCacheKey(uf, cargo, numero),
    );

    if (fallback) {
      return NextResponse.json(fallback, { headers: FALLBACK_HEADERS });
    }

    return jsonError(
      "O serviço de consulta do TSE está temporariamente indisponível. Tente novamente em instantes.",
      500,
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function readCache<T>(key: string): Promise<T | null> {
  try {
    return await kv.get<T>(key);
  } catch {
    return null;
  }
}
