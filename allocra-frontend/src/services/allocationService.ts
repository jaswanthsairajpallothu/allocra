import api from './api'
import { AllocationRun } from '@/types'

export const allocationService = {
  async allocate(projectId: string): Promise<AllocationRun> {
    const { data } = await api.post('/allocate', { project_id: projectId })
    return data
  },

  async getHistory(projectId: string) {
    const { data } = await api.get('/allocate/history', { params: { project_id: projectId } })
    return data
  },
}
