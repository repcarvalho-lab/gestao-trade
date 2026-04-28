import { create } from 'zustand'
import api from '../services/api'

interface CapitalData {
  capitalCorretoraUSD: number
  saldoReservaBRL: number
  cambioConsiderado: number
  bancaGlobalUSD: number
}

interface CapitalState {
  capital: CapitalData | null
  loading: boolean
  fetchCapital: () => Promise<void>
}

export const useCapitalStore = create<CapitalState>((set) => ({
  capital: null,
  loading: false,
  fetchCapital: async () => {
    set({ loading: true })
    try {
      const { data } = await api.get<CapitalData>('/capital')
      set({ capital: data })
    } catch (err) {
      console.error('Erro ao buscar capital global', err)
    } finally {
      set({ loading: false })
    }
  },
}))
