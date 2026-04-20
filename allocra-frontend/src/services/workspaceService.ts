import api from './api'
import { Workspace } from '@/types'

export const workspaceService = {
  async list(): Promise<Workspace[]> {
    const { data } = await api.get('/workspaces')
    return data
  },

  async create(name: string): Promise<Workspace> {
    const { data } = await api.post('/workspaces', { name })
    return data
  },

  async getInvite(workspaceId: string) {
    const { data } = await api.post(`/workspaces/${workspaceId}/invite`)
    return data
  },

  async join(join_code: string): Promise<Workspace> {
    const { data } = await api.post('/workspaces/join', { join_code })
    return data
  },
}
