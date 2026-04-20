import api from './api'
import { Membership, MemberLoad, SkillEntry } from '@/types'

export const membershipService = {
  async updateSkills(membershipId: string, skills: SkillEntry[]): Promise<Membership> {
    const { data } = await api.patch(`/memberships/${membershipId}/skills`, { skills })
    return data
  },

  async updateAvailability(membershipId: string, available_hours: number): Promise<Membership> {
    const { data } = await api.patch(`/memberships/${membershipId}/availability`, { available_hours })
    return data
  },

  async getTeamLoad(projectId: string): Promise<MemberLoad[]> {
    const { data } = await api.get('/memberships/team-load', { params: { project_id: projectId } })
    return data
  },
}
