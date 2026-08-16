"use client";

import { Download, Link2, Share2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { canShareFiles, copyText } from "@/lib/share";
import { downloadBlob } from "@/lib/share-canvas";

interface ShareImageSheetProps {
  open: boolean;
  title: string;
  filename: string;
  shareTitle: string;
  shareText: string;
  actionLabel?: string;
  linkUrl?: string;
  generate: () => Promise<Blob>;
  onClose: () => void;
}

export function ShareImageSheet({
  open,
  title,
  filename,
  shareTitle,
  shareText,
  actionLabel = "Enviar foto",
  linkUrl,
  generate,
  onClose,
}: ShareImageSheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const generateRef = useRef(generate);
  generateRef.current = generate;

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    closeRef.current?.focus();
    setLoading(true);
    setError(null);
    setBlob(null);
    setPreviewUrl(null);

    void generateRef
      .current()
      .then((nextBlob) => {
        if (cancelled) {
          return;
        }
        objectUrl = URL.createObjectURL(nextBlob);
        setBlob(nextBlob);
        setPreviewUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Não foi possível montar a foto. Tente de novo.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelled = true;
      window.removeEventListener("keydown", handleKeyDown);
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  async function handleSharePhoto() {
    if (!blob) {
      return;
    }

    const file = new File([blob], filename, { type: "image/png" });
    setSharing(true);

    try {
      if (canShareFiles([file])) {
        try {
          await navigator.share({
            files: [file],
            title: shareTitle,
            text: shareText,
          });
          return;
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            return;
          }
          await navigator.share({ files: [file], title: shareTitle });
          return;
        }
      }

      downloadBlob(blob, filename);
      toast.success("Foto salva. Abra a galeria e envie no WhatsApp, Instagram ou TikTok.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      downloadBlob(blob, filename);
      toast.success("Foto salva no celular.");
    } finally {
      setSharing(false);
    }
  }

  function handleSave() {
    if (!blob) {
      return;
    }
    downloadBlob(blob, filename);
    toast.success("Foto salva. Depois é só postar na rede que você usa.");
  }

  async function handleCopyLink() {
    if (!linkUrl) {
      return;
    }

    try {
      await copyText(shareText);
      toast.success("Link copiado. Agora é só colar.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-console-deep/80 p-0 sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-image-title"
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-console-edge bg-console p-2.5 sm:rounded-2xl"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-screen">
          <div className="flex items-start justify-between gap-3 border-b border-screen-line px-4 py-4">
            <div>
              <h2
                id="share-image-title"
                className="text-xl font-black tracking-tight text-ink"
              >
                {title}
              </h2>
              <p className="mt-1 text-sm leading-5 text-muted">
                Envie a foto no WhatsApp, Instagram ou TikTok.
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-ink/15 text-muted transition-colors duration-150 hover:border-ink/40 hover:text-ink"
            >
              <X size={22} aria-hidden="true" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="mx-auto aspect-9/16 w-full max-w-56 overflow-hidden rounded-2xl border border-screen-line bg-console-deep">
              {loading ? (
                <div className="flex h-full items-center justify-center px-4 text-center text-sm font-semibold text-console-muted">
                  Montando a foto…
                </div>
              ) : error ? (
                <div className="flex h-full items-center justify-center px-4 text-center text-sm font-semibold leading-6 text-coral">
                  {error}
                </div>
              ) : previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Prévia da imagem para redes sociais"
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
          </div>

          <div className="space-y-2 border-t border-screen-line p-4">
            <button
              type="button"
              onClick={() => void handleSharePhoto()}
              disabled={!blob || sharing}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-accent text-base font-bold text-white transition-colors duration-150 hover:bg-accent-deep disabled:cursor-not-allowed disabled:bg-screen-deep disabled:text-muted"
            >
              <Share2 size={18} aria-hidden="true" />
              {actionLabel}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!blob}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-ink/15 bg-white text-base font-bold text-ink transition-colors duration-150 hover:border-ink/40 disabled:cursor-not-allowed disabled:text-muted"
            >
              <Download size={18} aria-hidden="true" />
              Guardar no celular
            </button>
            {linkUrl ? (
              <button
                type="button"
                onClick={() => void handleCopyLink()}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl text-base font-bold text-muted transition-colors duration-150 hover:text-ink"
              >
                <Link2 size={18} aria-hidden="true" />
                Enviar só o link
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
