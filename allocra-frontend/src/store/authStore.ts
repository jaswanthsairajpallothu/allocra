import { create } from 'zustand'
import { User } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

const savedUser = localStorage.getItem('allocra_user')
const savedToken = localStorage.getItem('allocra_token')

export const useAuthStore = create<AuthState>((set) => ({
  user: savedUser ? JSON.parse(savedUser) : null,
  token: savedToken || null,
  isAuthenticated: !!savedToken,

  setAuth: (user, token) => {
    localStorage.setItem('allocra_token', token)
    localStorage.setItem('allocra_user', JSON.stringify(user))
    set({ user, token, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('allocra_token')
    localStorage.removeItem('allocra_user')
    set({ user: null, token: null, isAuthenticated: false })
  },

  updateUser: (partial) =>
    set((state) => {
      if (!state.user) return state
      const updated = { ...state.user, ...partial }
      localStorage.setItem('allocra_user', JSON.stringify(updated))
      return { user: updated }
    }),
}))
