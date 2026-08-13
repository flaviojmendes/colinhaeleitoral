"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";

import { buildCandidateShareText, buildCandidateShareUrl } from "@/lib/share";
import type { CandidatoColinha } from "@/lib/types";

interface ShareCandidateButtonProps {
  candidato: CandidatoColinha;
  uf: string;
  variant?: "primary" | "secondary";
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.left = "-9999px";
  document.body.appendChild(field);
  field.select();
  document.execCommand("copy");
  document.body.removeChild(field);
}

export function ShareCandidateButton({
  candidato,
  uf,
  variant = "secondary",
}: ShareCandidateButtonProps) {
  async function handleShare() {
    const url = buildCandidateShareUrl(window.location.origin, uf, candidato);
    const text = buildCandidateShareText(uf, candidato, url);
    const title =
      candidato.tipoVoto === "legenda"
        ? `Partido ${candidato.partido}`
        : candidato.nomeUrna;

    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, text, url });
        return;
      }

      await copyText(`${text}`);
      toast.success("Link copiado. Agora é só colar no WhatsApp.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      try {
        await copyText(url);
        toast.success("Link copiado. Agora é só colar no WhatsApp.");
      } catch {
        toast.error("Não foi possível compartilhar agora. Tente de novo.");
      }
    }
  }

  const className =
    variant === "primary"
      ? "flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 text-base font-bold text-white transition-colors duration-150 hover:bg-accent-deep"
      : "flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-ink/15 bg-white px-5 text-base font-bold text-ink transition-colors duration-150 hover:border-ink/40";

  return (
    <button type="button" onClick={() => void handleShare()} className={className}>
      <Share2 size={18} aria-hidden="true" />
      Enviar para alguém
    </button>
  );
}
