import { create } from 'zustand'
import api from '../services/api'

export type NivelDesempenho = 'SEM_DADOS' | 'ABAIXO_META' | 'CONSERVADOR' | 'REALISTA' | 'AGRESSIVO'

export interface DashboardData {
  indicadores: {
    diasOperados: number
    diasPositivos: number
    lucroTotal: number
    ultimoCapital: number
    taxaAcertoGeral: number
    maiorGain: number
    maiorLoss: number
    totalGanhos: number
    totalPerdas: number
    pctDiasPositivos: number
    maiorSequenciaPositiva: number
    maiorSequenciaNegativa: number
    crescimentoPct: number
    mediaLucroDia: number
    mediaRentabilidade: number
    totalAportes: number
    totalSaques: number
  }
  desempenhoMesAtual: {
    nivel: NivelDesempenho
    rentabilidade: number
    capitalInicio: number
    capitalAtual: number
    diasOperados: number
    diasPositivos: number
    maiorSequenciaPositiva: number
    maiorSequenciaNegativa: number
  }
  financeiro: {
    aporteValor: number
    aporteMes: string | null
    saquesMesInicio: string | null
  }
  evolucaoCapital: Array<{
    data: string
    capital: number
    resultado: number
  }>
  diaEmAndamento: { data: string; capitalInicial: number } | null
  semanas: Array<any>
  meses: Array<any>
}

export interface MesProjecao {
  mes: string
  capitalInicial: number
  aporte: number
  capitalComAporte: number
  retorno: number
  capitalBruto: number
  saquePlanejado: number
  saqueViavel: number
  capitalFinal: number
}

export interface PlanejadoItem { id: string; mes: string; valor: number }

export interface ProjecaoData {
  capitalAtual: number
  mesInicio: string
  aportesPlanejados: PlanejadoItem[]
  saquesPlanejados: PlanejadoItem[]
  projecao: {
    conservador: MesProjecao[]
    realista: MesProjecao[]
    agressivo: MesProjecao[]
  }
}

interface AnalyticsState {
  dashboardData: DashboardData | null
  projecaoData: ProjecaoData | null
  isLoading: boolean
  error: string | null
  fetchDashboard: () => Promise<void>
  fetchProjecao: () => Promise<void>
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  dashboardData: null,
  projecaoData: null,
  isLoading: false,
  error: null,

  fetchDashboard: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get<DashboardData>('/dashboard')
      set({ dashboardData: response.data, isLoading: false })
    } catch (err: any) {
      set({
        error: err.response?.data?.error || 'Erro ao carregar Dashboard',
        isLoading: false,
      })
    }
  },

  fetchProjecao: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get<ProjecaoData>('/projecao')
      set({ projecaoData: response.data, isLoading: false })
    } catch (err: any) {
      set({
        error: err.response?.data?.error || 'Erro ao carregar Projeção Anual',
        isLoading: false,
      })
    }
  },
}))
