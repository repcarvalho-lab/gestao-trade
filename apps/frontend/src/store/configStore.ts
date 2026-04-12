import { create } from 'zustand'
import api from '../services/api'

export interface Configuration {
  id: string
  metaIdealPct: number
  metaMaximaPct: number
  stopDiarioPct: number
  riscoMaxCicloPct: number
  pctSugeridaEntrada: number
  fatorMG1: number
  fatorMG2: number
  mg2Habilitado: boolean
  maxEntradasPorCiclo: number
  maxCiclosPorDia: number
  payout: number
  cambioCompra: number
  cambioVenda: number
  retornoConservador: number
  retornoRealista: number
  retornoAgressivo: number
  aporteJunho: number | null
  saqueMinimo: number | null
  saqueMaximo: number | null
}

interface ConfigState {
  config: Configuration | null
  isLoading: boolean
  fetchConfig: () => Promise<void>
  updateConfig: (data: Partial<Configuration>) => Promise<void>
}

export const useConfigStore = create<ConfigState>((set) => ({
  config: null,
  isLoading: false,

  fetchConfig: async () => {
    set({ isLoading: true })
    try {
      const { data } = await api.get('/config')
      set({ config: data })
    } finally {
      set({ isLoading: false })
    }
  },

  updateConfig: async (data) => {
    const { data: updated } = await api.patch('/config', data)
    set({ config: updated })
  },
}))
