import { create } from 'zustand'
import { Workspace, Project } from '@/types'

interface WorkspaceState {
  workspaces: Workspace[]
  projects: Project[]
  selectedWorkspace: Workspace | null
  selectedProject: Project | null
  loading: boolean

  setWorkspaces: (workspaces: Workspace[]) => void
  setProjects: (projects: Project[]) => void
  selectWorkspace: (workspace: Workspace) => void
  selectProject: (project: Project) => void
  addWorkspace: (workspace: Workspace) => void
  addProject: (project: Project) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  projects: [],
  selectedWorkspace: null,
  selectedProject: null,
  loading: false,

  setWorkspaces: (workspaces) => set({ workspaces }),
  setProjects: (projects) => set({ projects }),

  selectWorkspace: (workspace) =>
    set({ selectedWorkspace: workspace, selectedProject: null, projects: [] }),

  selectProject: (project) => set({ selectedProject: project }),

  addWorkspace: (workspace) =>
    set((s) => ({ workspaces: [...s.workspaces, workspace] })),

  addProject: (project) =>
    set((s) => ({ projects: [...s.projects, project] })),

  setLoading: (loading) => set({ loading }),

  reset: () =>
    set({ workspaces: [], projects: [], selectedWorkspace: null, selectedProject: null }),
}))
