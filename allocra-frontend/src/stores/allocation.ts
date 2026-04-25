import { create } from "zustand";

interface AllocationState {
  isAllocating: boolean;
  lastRunAt: string | null;

  startAllocation: () => void;
  finishAllocation: () => void;
  setLastRunAt: (time: string) => void;
}

export const useAllocationStore = create<AllocationState>((set) => ({
  isAllocating: false,
  lastRunAt: null,

  startAllocation: () =>
    set({ isAllocating: true }),

  finishAllocation: () =>
    set({ isAllocating: false }),

  setLastRunAt: (time) =>
    set({ lastRunAt: time }),
}));