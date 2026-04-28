import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Workspace } from "@/types";

interface WorkspaceState {
  /** Currently active workspace (legacy convenience field — kept for existing components). */
  current: Workspace | null;
  setCurrent: (w: Workspace | null) => void;

  /** Persisted IDs — survive page reloads. */
  activeWorkspaceId: string | null;
  activeProjectId: string | null;
  setActiveWorkspace: (id: string | null) => void;
  setActiveProject: (id: string | null) => void;
  clear: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      current: null,
      setCurrent: (w) =>
        set({ current: w, activeWorkspaceId: w?.id ?? null }),

      activeWorkspaceId: null,
      activeProjectId: null,
      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
      setActiveProject: (id) => set({ activeProjectId: id }),
      clear: () =>
        set({
          current: null,
          activeWorkspaceId: null,
          activeProjectId: null,
        }),
    }),
    {
      name: "allocra-workspace",
      partialize: (s) => ({
        activeWorkspaceId: s.activeWorkspaceId,
        activeProjectId: s.activeProjectId,
      }),
    }
  )
);
