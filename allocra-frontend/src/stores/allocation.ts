import { create } from "zustand";
import type { AllocationResult } from "@/types";

interface AllocationState {
  // Latest run output
  latestResult: AllocationResult | null;
  setResult: (r: AllocationResult) => void;
  clearResult: () => void;

  // Selection state used by various UIs
  selectedTaskId: string | null;
  selectedAssigneeId: string | null;
  setSelectedTask: (id: string | null) => void;
  setSelectedAssignee: (id: string | null) => void;
  reset: () => void;
}

export const useAllocationStore = create<AllocationState>((set) => ({
  latestResult: null,
  setResult: (r) => set({ latestResult: r }),
  clearResult: () => set({ latestResult: null }),

  selectedTaskId: null,
  selectedAssigneeId: null,
  setSelectedTask: (id) => set({ selectedTaskId: id }),
  setSelectedAssignee: (id) => set({ selectedAssigneeId: id }),
  reset: () =>
    set({
      latestResult: null,
      selectedTaskId: null,
      selectedAssigneeId: null,
    }),
}));
