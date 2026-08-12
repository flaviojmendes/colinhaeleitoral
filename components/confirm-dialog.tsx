"use client";

import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    cancelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-console-deep/80 p-0 sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="w-full max-w-md rounded-t-2xl border border-console-edge bg-console p-2.5 sm:rounded-2xl"
      >
        <div className="rounded-xl bg-screen px-5 py-5">
          <h2
            id="confirm-dialog-title"
            className="text-xl font-black tracking-tight text-ink"
          >
            {title}
          </h2>
          <p
            id="confirm-dialog-description"
            className="mt-3 text-base leading-6 text-muted"
          >
            {description}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <button
              ref={cancelRef}
              type="button"
              onClick={onCancel}
              className="flex h-13 items-center justify-center rounded-lg border-2 border-ink/15 bg-white text-base font-bold text-ink transition-colors duration-150 hover:border-ink/40"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex h-13 items-center justify-center rounded-lg bg-coral text-base font-bold text-coral-ink transition-colors duration-150 hover:bg-coral-deep"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
