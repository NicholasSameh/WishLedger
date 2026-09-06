import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { db } from "@/db/schema";
import type { GameId, BannerCategory } from "@/db/schema";

export type CurrencyMode = "currency" | "manual";

interface CurrencyInputs {
  a: number;
  b: number;
  c: number;
}

interface CalculatorInputs {
  bannerCategory: BannerCategory;
  currentPity: number;
  isGuaranteed: boolean;
  copiesWanted: number;
  pullBudget: number;
  currencyMode: CurrencyMode;
  currencyInputs: CurrencyInputs;
}

interface AppState {
  game: GameId;
  setGame: (game: GameId) => void;

  activeUid: string | null;
  setActiveUid: (uid: string | null) => void;

  calculator: CalculatorInputs;
  setCalculatorInput: <K extends keyof CalculatorInputs>(key: K, value: CalculatorInputs[K]) => void;
  setCurrencyInput: (key: keyof CurrencyInputs, value: number) => void;

  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
}

const DEFAULT_CALCULATOR: CalculatorInputs = {
  bannerCategory: "character-event",
  currentPity: 0,
  isGuaranteed: false,
  copiesWanted: 1,
  pullBudget: 90,
  currencyMode: "manual",
  currencyInputs: { a: 0, b: 0, c: 0 },
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      game: "genshin",
      setGame: (game) =>
        set((state) => ({
          game,
          calculator: { ...state.calculator, bannerCategory: "character-event" },
        })),

      activeUid: null,
      setActiveUid: (activeUid) => set({ activeUid }),

      calculator: DEFAULT_CALCULATOR,
      setCalculatorInput: (key, value) =>
        set((state) => ({ calculator: { ...state.calculator, [key]: value } })),
      setCurrencyInput: (key, value) =>
        set((state) => ({
          calculator: {
            ...state.calculator,
            currencyInputs: { ...state.calculator.currencyInputs, [key]: value },
          },
        })),

      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: "wishledger-app-state",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ game: state.game, calculator: state.calculator }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
          // THIS FIXES THE RELOAD BUG! It automatically finds your UID on refresh.
          db.pulls.orderBy('id').last().then(lastPull => {
              if (lastPull) state.setActiveUid(lastPull.uid);
          }).catch(() => {});
        }
      },
    }
  )
);