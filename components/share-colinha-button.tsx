"use client";

import { ImageIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { CARGOS_2026 } from "@/lib/cargos";
import { buildColinhaShareText } from "@/lib/share";
import { renderColinhaStory, type ColinhaShareRow } from "@/lib/share-canvas";
import type { CandidatoColinha, CargoSlug } from "@/lib/types";

import { ShareImageSheet } from "./share-image-sheet";

interface ShareColinhaButtonProps {
  uf: string;
  slots: Record<CargoSlug, CandidatoColinha | null>;
  variant?: "primary" | "secondary";
  label?: string;
}

export function ShareColinhaButton({
  uf,
  slots,
  variant = "primary",
  label = "Enviar foto da lista",
}: ShareColinhaButtonProps) {
  const [open, setOpen] = useState(false);
  const rows: ColinhaShareRow[] = useMemo(
    () =>
      CARGOS_2026.flatMap((cargo) => {
        const candidato = slots[cargo.slug];
        return candidato ? [{ cargo, candidato }] : [];
      }),
    [slots],
  );

  const generate = useCallback(
    () => renderColinhaStory(uf, rows),
    [rows, uf],
  );

  if (rows.length === 0) {
    return null;
  }

  const className =
    variant === "primary"
      ? "flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 text-base font-bold text-white transition-colors duration-150 hover:bg-accent-deep"
      : "flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-ink/15 bg-white px-3 text-sm font-bold text-ink transition-colors duration-150 hover:border-ink/40 sm:px-5 sm:text-base";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <ImageIcon size={18} aria-hidden="true" />
        {label}
      </button>
      <ShareImageSheet
        open={open}
        title="Enviar sua colinha"
        filename="minha-colinha-2026.png"
        shareTitle="Minha colinha de votação"
        shareText={buildColinhaShareText(uf, rows.length)}
        generate={generate}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
