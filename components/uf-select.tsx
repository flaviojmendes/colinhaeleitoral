"use client";

import { MapPin } from "lucide-react";

import { UF_OPTIONS } from "@/lib/cargos";

interface UfSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function UfSelect({ value, onChange }: UfSelectProps) {
  return (
    <label className="flex min-w-0 items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper-deep text-accent">
        <MapPin size={17} strokeWidth={2.2} aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
          Seu estado
        </span>
        <select
          aria-label="Selecione o seu estado"
          className="mt-0.5 w-full appearance-none bg-transparent text-sm font-semibold text-ink outline-none"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {UF_OPTIONS.map((uf) => (
            <option key={uf.value} value={uf.value}>
              {uf.value} · {uf.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}
