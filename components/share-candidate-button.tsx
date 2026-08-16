"use client";

import { Share2 } from "lucide-react";
import { useCallback, useState } from "react";

import {
  buildCandidateShareText,
  buildCandidateShareUrl,
} from "@/lib/share";
import { renderCandidateStory } from "@/lib/share-canvas";
import type { CandidatoColinha } from "@/lib/types";

import { ShareImageSheet } from "./share-image-sheet";

interface ShareCandidateButtonProps {
  candidato: CandidatoColinha;
  uf: string;
  variant?: "primary" | "secondary";
}

export function ShareCandidateButton({
  candidato,
  uf,
  variant = "secondary",
}: ShareCandidateButtonProps) {
  const [open, setOpen] = useState(false);
  const shareUrl =
    typeof window === "undefined"
      ? ""
      : buildCandidateShareUrl(window.location.origin, uf, candidato);
  const shareText = shareUrl
    ? buildCandidateShareText(uf, candidato, shareUrl)
    : "";
  const filename =
    candidato.tipoVoto === "legenda"
      ? `colinha-partido-${candidato.numero}.png`
      : `colinha-${candidato.numero}.png`;

  const generate = useCallback(
    () => renderCandidateStory(uf, candidato),
    [candidato, uf],
  );

  const className =
    variant === "primary"
      ? "flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 text-base font-bold text-white transition-colors duration-150 hover:bg-accent-deep"
      : "flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-ink/15 bg-white px-5 text-base font-bold text-ink transition-colors duration-150 hover:border-ink/40";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <Share2 size={18} aria-hidden="true" />
        Compartilhar Candidato
      </button>
      <ShareImageSheet
        open={open}
        title="Compartilhar Candidato"
        filename={filename}
        shareTitle={
          candidato.tipoVoto === "legenda"
            ? `Partido ${candidato.partido}`
            : candidato.nomeUrna
        }
        shareText={shareText}
        actionLabel="Compartilhar Candidato"
        linkUrl={shareUrl}
        generate={generate}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
