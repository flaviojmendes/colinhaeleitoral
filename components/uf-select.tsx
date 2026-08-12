"use client";

import { ChevronDown, MapPin } from "lucide-react";

import { UF_OPTIONS } from "@/lib/cargos";

interface UfSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function UfSelect({ value, onChange }: UfSelectProps) {
  return (
    <div>
      <label
        htmlFor="uf-select"
        className="text-sm font-bold text-ink"
      >
        Estado onde você vota
      </label>
      <p className="mt-1 text-sm leading-5 text-muted">
        Escolha o estado da sua seção eleitoral.
      </p>
      <div className="relative mt-3">
        <MapPin
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          size={20}
          aria-hidden="true"
        />
        <select
          id="uf-select"
          className="h-14 w-full appearance-none rounded-xl border-2 border-screen-line bg-white pl-12 pr-12 text-base font-bold text-ink transition-colors duration-150 hover:border-ink/30"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {UF_OPTIONS.map((uf) => (
            <option key={uf.value} value={uf.value}>
              {uf.label} ({uf.value})
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted"
          size={20}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
