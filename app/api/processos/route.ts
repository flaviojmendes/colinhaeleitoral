import { NextResponse } from "next/server";

import {
  DataJudNotConfiguredError,
  searchJudicialProcesses,
  tribunalsForUf,
} from "@/lib/datajud";
import { getTmntMockByName, tmntProcessesResponse } from "@/lib/tmnt-mocks";

export const preferredRegion = "gru1";
export const runtime = "nodejs";

const REQUEST_TIMEOUT_MS = 8_000;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const uf = searchParams.get("uf")?.trim().toUpperCase();
  const nome = searchParams.get("nome")?.trim().replace(/\s+/g, " ");

  if (!uf || !nome || nome.length < 3) {
    return jsonError("Informe o nome completo e a UF do candidato.", 400);
  }

  if (nome.length > 160) {
    return jsonError("O nome informado é muito longo.", 400);
  }

  if (tribunalsForUf(uf).length === 0) {
    return jsonError("UF inválida para consulta judicial.", 400);
  }

  if (getTmntMockByName(nome)) {
    const mock = tmntProcessesResponse(nome);

    if (mock) {
      return NextResponse.json(mock, {
        headers: {
          "Cache-Control": "no-store",
          "X-Data-Source": "tmnt-mock",
        },
      });
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const resultado = await searchJudicialProcesses(
      uf,
      nome,
      controller.signal,
    );

    return NextResponse.json(resultado, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof DataJudNotConfiguredError) {
      return jsonError(
        "A consulta judicial ainda não está configurada neste ambiente.",
        503,
      );
    }

    return jsonError(
      "Não foi possível consultar os processos judiciais agora.",
      502,
    );
  } finally {
    clearTimeout(timeout);
  }
}
