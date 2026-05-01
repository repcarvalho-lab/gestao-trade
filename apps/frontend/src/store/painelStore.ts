import { create } from 'zustand'
import api from '../services/api'

export type DayStatus = 'OPERANDO' | 'META_IDEAL' | 'META_MAXIMA' | 'ATENCAO' | 'STOP' | 'META_NAO_ATINGIDA'
export type TradeType = 'ENTR' | 'MG1' | 'MG2'
export type TradeStatus = 'ABERTA' | 'WIN' | 'LOSS'
export type CicloStatus = 'ABERTO' | 'FECHADO_WIN' | 'FECHADO_STOP' | 'FECHADO_MANUAL'

export interface Trade {
  id: string
  tipo: TradeType
  ativo: string
  valor: number
  status: TradeStatus
  resultado: number | null
  horario: string
  cicloId: string
  ciclo: { numero: number; status: CicloStatus }
  motivo: { nome: string } | null
  motivoOutro: string | null
}

export interface TradingDay {
  id: string
  date: string
  capitalInicial: number
  deposito: number
  capitalInicialReal: number
  capitalFinal: number | null
  resultadoDia: number
  rentabilidade: number
  status: DayStatus
  numeroTrades: number
  win: number
  loss: number
  taxaAcerto: number | null
  ciclosRealizados: number
  isClosed: boolean
  emocional?: string | null
  seguiuSetup?: boolean | null
  errosDia?: string[]
  trades: Trade[]
  // Indicadores calculados (retornados pelo backend junto com o dia aberto)
  stopProximo?: boolean
  pctStopConsumido?: number
  faltaParaMeta?: number
  espacoAntesDoStop?: number
  metaIdeal?: number
  metaMaxima?: number
  stopDiario?: number
  valorENTR?: number
  valorMG1?: number
  valorMG2?: number
  bancaGlobalUSD?: number
  saldoReservaBRL?: number
  capitalCorretoraUSD?: number
}

interface PainelState {
  diaAberto: TradingDay | null
  isLoading: boolean
  fetchDiaAberto: () => Promise<void>
  criarDia: (capitalInicial?: number, data?: string) => Promise<void>
  atualizarDeposito: (deposito: number) => Promise<void>
  criarTrade: (input: {
    tipo: TradeType
    ativo: string
    valor: number
    motivoId?: string
    motivoOutro?: string
    horario?: string
  }) => Promise<Trade>
  editarTrade: (tradeId: string, updates: {
    ativo?: string
    valor?: number
    motivoId?: string | null
    motivoOutro?: string | null
    horario?: string
  }) => Promise<void>
  marcarResultado: (tradeId: string, resultado: 'WIN' | 'LOSS') => Promise<void>
  excluirTrade: (tradeId: string) => Promise<void>
  fecharDia: (emocional: string, seguiuSetup: boolean, errosDia?: string[]) => Promise<void>
  excluirDia: () => Promise<void>
  transferirCapital: (de: 'CORRETORA' | 'RESERVA', para: 'CORRETORA' | 'RESERVA', valorUSD: number, cambio: number, data: string, observacao?: string) => Promise<void>
}

export const usePainelStore = create<PainelState>((set, get) => ({
  diaAberto: null,
  isLoading: false,

  fetchDiaAberto: async () => {
    set({ isLoading: true })
    try {
      const { data } = await api.get('/trading-days/aberto')
      set({ diaAberto: data })
    } catch (err: unknown) {
      const error = err as { response?: { status: number } }
      if (error?.response?.status === 404) set({ diaAberto: null })
    } finally {
      set({ isLoading: false })
    }
  },

  criarDia: async (capitalInicial, data) => {
    const { data: dia } = await api.post('/trading-days', { capitalInicial, data })
    set({ diaAberto: dia })
  },

  atualizarDeposito: async (deposito) => {
    const dia = get().diaAberto
    if (!dia) return
    const { data } = await api.patch(`/trading-days/${dia.id}/deposito`, { deposito })
    set({ diaAberto: data })
  },

  criarTrade: async (input) => {
    const dia = get().diaAberto
    if (!dia) throw new Error('Nenhum dia aberto')
    const { data } = await api.post('/trades', {
      ...input,
      tradingDayId: dia.id,
    })
    get().fetchDiaAberto()
    return data
  },

  editarTrade: async (tradeId, updates) => {
    await api.patch(`/trades/${tradeId}`, updates)
    await get().fetchDiaAberto()
  },

  marcarResultado: async (tradeId, resultado) => {
    await api.patch(`/trades/${tradeId}/resultado`, { resultado })
    await get().fetchDiaAberto()
  },

  excluirTrade: async (tradeId) => {
    await api.delete(`/trades/${tradeId}`)
    await get().fetchDiaAberto()
  },

  fecharDia: async (emocional, seguiuSetup, errosDia = []) => {
    const dia = get().diaAberto
    if (!dia) return
    await api.post(`/trading-days/${dia.id}/fechar`, { emocional, seguiuSetup, errosDia })
    set({ diaAberto: null })
  },

  excluirDia: async () => {
    const dia = get().diaAberto
    if (!dia) return
    await api.delete(`/trading-days/${dia.id}`)
    set({ diaAberto: null })
  },

  transferirCapital: async (de, para, valorUSD, cambio, data, observacao) => {
    await api.post('/movimentos/transfer', { de, para, valorUSD, cambio, data, observacao })
    await get().fetchDiaAberto()
  },
}))
