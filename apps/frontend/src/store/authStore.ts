import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

interface User {
  id: string
  email: string
  nome?: string
  role: 'admin' | 'user'
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (nome: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setToken: (token: string) => void
  updateProfile: (nome: string, email: string) => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      register: async (nome, email, password) => {
        set({ isLoading: true })
        try {
          const { data } = await api.post('/auth/register', { nome, email, password })
          localStorage.setItem('accessToken', data.accessToken)
          set({
            user: data.user,
            accessToken: data.accessToken,
            isAuthenticated: true,
          })
        } finally {
          set({ isLoading: false })
        }
      },

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const { data } = await api.post('/auth/login', { email, password })
          localStorage.setItem('accessToken', data.accessToken)
          set({
            user: data.user,
            accessToken: data.accessToken,
            isAuthenticated: true,
          })
        } finally {
          set({ isLoading: false })
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch {
          // ignora erro no logout
        } finally {
          localStorage.removeItem('accessToken')
          set({ user: null, accessToken: null, isAuthenticated: false })
        }
      },

      setToken: (token) => {
        localStorage.setItem('accessToken', token)
        set({ accessToken: token, isAuthenticated: true })
      },

      updateProfile: async (nome, email) => {
        set({ isLoading: true })
        try {
          const { data } = await api.put('/auth/profile', { nome, email })
          set({ user: data.user })
        } finally {
          set({ isLoading: false })
        }
      },
    }),
    {
      name: 'traderos-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
)
