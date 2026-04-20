import api from './api'
import { TokenResponse } from '@/types'

export const authService = {
  async signup(name: string, email: string, password: string): Promise<TokenResponse> {
    const { data } = await api.post('/auth/signup', { name, email, password })
    return data
  },

  async login(email: string, password: string): Promise<TokenResponse> {
    const { data } = await api.post('/auth/login', { email, password })
    return data
  },

  async me() {
    const { data } = await api.get('/auth/me')
    return data
  },
}
