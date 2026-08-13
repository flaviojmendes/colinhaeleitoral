"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

import { COLINHA_STORAGE_KEY } from "@/lib/legal";
import { hasValidLgpdConsent } from "@/lib/lgpd";
import type { CargoSlug, CandidatoColinha } from "@/lib/types";

export type ColinhaSlots = Record<CargoSlug, CandidatoColinha | null>;

const gatedLocalStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === "undefined" || !hasValidLgpdConsent()) {
      return null;
    }

    return window.localStorage.getItem(name);
  },
  setItem: (name, value) => {
    if (typeof window === "undefined" || !hasValidLgpdConsent()) {
      return;
    }

    window.localStorage.setItem(name, value);
  },
  removeItem: (name) => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(name);
  },
};

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
      name: COLINHA_STORAGE_KEY,
      storage: createJSONStorage(() => gatedLocalStorage),
      skipHydration: true,
    },
  ),
);
