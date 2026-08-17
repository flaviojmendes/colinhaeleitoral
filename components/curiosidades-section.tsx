"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import useSWR from "swr";

import type { CuriosidadesResponse } from "@/lib/types";
import { useCandidatosStore } from "@/store/candidatos-store";

const AVATAR_FALLBACK = (nome: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    nome,
  )}&background=252a28&color=dce9dc&bold=true`;

async function fetchHighlights(url: string): Promise<CuriosidadesResponse> {
  const response = await fetch(url);
  const payload = (await response.json().catch(() => null)) as
    | CuriosidadesResponse
    | { error?: string }
    | null;

  if (!response.ok || !payload || !("itens" in payload)) {
    throw new Error("Não foi possível carregar os destaques.");
  }

  return payload;
}

export function CuriosidadesSection() {
  const uf = useCandidatosStore((state) => state.uf);
  const { data, isLoading } = useSWR<CuriosidadesResponse>(
    `/api/curiosidades?uf=${uf}&categoria=todas&limite=4`,
    fetchHighlights,
    { revalidateOnFocus: false },
  );

  const highlights = data?.itens.slice(0, 4) ?? [];

  return (
    <section
      aria-label="Rankings das eleições"
      className="mt-12 rounded-2xl border border-console-edge bg-console p-4 sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-coral">
            A partir do TSE
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-console-ink sm:text-3xl">
            Rankings de {uf}
          </h2>
          <p className="mt-1 text-sm text-console-muted">
            Patrimônio, idade e histórico de urna de presidente, governador e
            senador. Atualiza sozinho a cada hora.
          </p>
        </div>

        <Link
          href="/curiosidades"
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-console-edge bg-console-deep px-4 text-xs font-bold text-console-ink hover:border-coral hover:text-coral"
        >
          Ver todos os rankings
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      {isLoading && highlights.length === 0 ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-console-muted">
          <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />
          Consultando as fichas no TSE…
        </div>
      ) : null}

      {highlights.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((item) => (
            <Link
              key={`${item.id}-${item.categoria}`}
              href="/curiosidades"
              className="group flex flex-col justify-between rounded-xl border border-console-edge/70 bg-console-deep/80 p-3.5 hover:border-coral/50"
            >
              <div>
                <span className="rounded-md border border-console-edge bg-console px-2 py-0.5 text-[11px] font-bold text-console-muted group-hover:text-console-ink">
                  {item.badge ?? item.subtituloDestaque}
                </span>
                <div className="mt-3 flex items-center gap-3">
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-console-edge bg-console">
                    <Image
                      src={item.fotoUrl ?? AVATAR_FALLBACK(item.nomeUrna)}
                      alt=""
                      fill
                      sizes="44px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-console-ink group-hover:text-coral">
                      {item.nomeUrna}
                    </p>
                    <p className="truncate text-xs text-console-muted">
                      {item.partido} · {item.cargoLabel}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-3 border-t border-console-edge/50 pt-2.5">
                <p className="font-mono text-lg font-black text-coral">
                  {item.destaquePrincipal}
                </p>
                <p className="text-[11px] text-console-muted">
                  {item.subtituloDestaque}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      <p className="mt-4 border-t border-console-edge/60 pt-4 text-xs text-console-muted">
        Declarações de bens e dados de candidatura publicados pelo TSE. Deputados
        ficam de fora deste ranking porque são centenas de fichas por estado.
      </p>
    </section>
  );
}
