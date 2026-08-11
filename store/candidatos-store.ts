"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { CargoSlug, CandidatoColinha } from "@/lib/types";

export type ColinhaSlots = Record<CargoSlug, CandidatoColinha | null>;

const emptySlots = (): ColinhaSlots => ({
  "deputado-federal": null,
  "deputado-estadual": null,
  "senador-1": null,
  "senador-2": null,
  governador: null,
  presidente: null,
});

interface CandidatosState {
  uf: string;
  slots: ColinhaSlots;
  setUf: (uf: string) => void;
  setCandidate: (cargo: CargoSlug, candidato: CandidatoColinha) => void;
  clearCandidate: (cargo: CargoSlug) => void;
  resetColinha: () => void;
}

export const useCandidatosStore = create<CandidatosState>()(
  persist(
    (set) => ({
      uf: "SP",
      slots: emptySlots(),
      setUf: (uf) => set({ uf }),
      setCandidate: (cargo, candidato) =>
        set((state) => ({
          slots: {
            ...state.slots,
            [cargo]: candidato,
          },
        })),
      clearCandidate: (cargo) =>
        set((state) => ({
          slots: {
            ...state.slots,
            [cargo]: null,
          },
        })),
      resetColinha: () => set({ slots: emptySlots() }),
    }),
    {
      name: "colinha-eleitoral-2026",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
