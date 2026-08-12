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
        className="font-mono text-[10px] tracking-widest text-muted"
      >
        ONDE VOCÊ VOTA
      </label>
      <div className="relative mt-1.5">
        <MapPin
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          size={17}
          aria-hidden="true"
        />
        <select
          id="uf-select"
          className="h-12 w-full appearance-none rounded-lg border-2 border-screen-line bg-white pl-10 pr-10 text-sm font-bold text-ink transition-colors duration-150 hover:border-ink/30"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {UF_OPTIONS.map((uf) => (
            <option key={uf.value} value={uf.value}>
              {uf.value} · {uf.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
          size={17}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
