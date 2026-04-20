import api from './api'
import { Project } from '@/types'

export const projectService = {
  async list(workspaceId: string): Promise<Project[]> {
    const { data } = await api.get('/projects', { params: { workspace_id: workspaceId } })
    return data
  },

  async create(name: string, workspace_id: string, description?: string): Promise<Project> {
    const { data } = await api.post('/projects', { name, workspace_id, description })
    return data
  },

  async addMember(projectId: string, userId: string) {
    const { data } = await api.post(`/projects/${projectId}/add-member`, { user_id: userId })
    return data
  },
}
