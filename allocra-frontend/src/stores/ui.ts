import { create } from "zustand";
import type { PlanRequiredError } from "@/types/api";

interface UIState {
  upgradeOpen: boolean;
  upgradeContext: PlanRequiredError | null;
  openUpgrade: (ctx?: PlanRequiredError | null) => void;
  closeUpgrade: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  upgradeOpen: false,
  upgradeContext: null,
  openUpgrade: (ctx = null) => set({ upgradeOpen: true, upgradeContext: ctx }),
  closeUpgrade: () => set({ upgradeOpen: false, upgradeContext: null }),
}));
