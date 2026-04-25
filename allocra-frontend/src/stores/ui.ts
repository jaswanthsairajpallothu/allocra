import { create } from "zustand";

interface UiState {
  upgradeModalOpen: boolean;
  upgradeModalPlan: string | null;

  openUpgradeModal: (plan: string) => void;
  closeUpgradeModal: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  upgradeModalOpen: false,
  upgradeModalPlan: null,

  openUpgradeModal: (plan) =>
    set({
      upgradeModalOpen: true,
      upgradeModalPlan: plan,
    }),

  closeUpgradeModal: () =>
    set({
      upgradeModalOpen: false,
      upgradeModalPlan: null,
    }),
}));