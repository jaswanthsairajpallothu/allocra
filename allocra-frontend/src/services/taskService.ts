import api from './api'
import { Task } from '@/types'

export const taskService = {
  async list(projectId: string): Promise<Task[]> {
    const { data } = await api.get('/tasks', { params: { project_id: projectId } })
    return data
  },

  async create(payload: {
    title: string
    project_id: string
    required_skill: string
    required_level: number
    estimated_hours: number
    priority: string
    description?: string
  }): Promise<Task> {
    const { data } = await api.post('/tasks', payload)
    return data
  },

  async update(taskId: string, payload: Partial<Task>): Promise<Task> {
    const { data } = await api.patch(`/tasks/${taskId}`, payload)
    return data
  },

  async delete(taskId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}`)
  },
}
