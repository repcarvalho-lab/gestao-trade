import React from 'react'

// ─── Tipos ────────────────────────────────────────────────────

export interface Metricas {
  total: number
  diasPositivos: number
  pctPositivos: number
  resultadoTotal: number
  resultadoMedio: number
  rentabilidadeMedia: number
  taxaAcertoMedia: number
}

export interface ErroItem { nome: string; ocorrencias: number }

export interface DisciplinaData {
  totalDias: number
  comDisciplina: Metricas
  semDisciplina: Metricas
  semInfo: Metricas
  principaisErros: ErroItem[]
  errosComDisciplina: ErroItem[]
}

export interface SemanaReport {
  id: string; semana: number; ano: number
  dataInicial: string; dataFinal: string
  diasOperados: number; diasPositivos: number; diasNegativos: number
  totalWin: number; totalLoss: number
  taxaAcerto: number; lucroTotal: number
  melhorDia: number; piorDia: number
}

export interface MesReport {
  id: string; mes: string; dataBase: string
  diasOperados: number; diasPositivos: number; diasNegativos: number
  capitalInicial: number; vlDepositadoSacado: number
  lucroTotal: number; capitalFinal: number
  rentabMedia: number; rentabTotal: number
  taxaAcertoMedia: number; maiorGain: number; maiorLoss: number
}

export interface PerformanceData { semanas: SemanaReport[]; meses: MesReport[] }

export interface ScorePilarData {
  score: number
  pctComDisciplina?: number
  diasAnalisados?: number
  pctPositivos?: number
  taxaEficiencia?: number
  taxaAcertoMedia?: number
  pctSemErros?: number
}

export interface ScoreData {
  score: number
  grade: string
  totalDias: number
  pilares: {
    disciplina: ScorePilarData
    resultado: ScorePilarData
    consistencia: ScorePilarData
  } | null
}

// ─── Filtro de Período ────────────────────────────────────────

export type Preset = 'all' | 'mes' | '3m' | '6m' | 'ano'
export type Filtro = { inicio: string; fim: string } | null

export const PRESETS: { label: string; value: Preset }[] = [
  { label: 'Tudo',       value: 'all' },
  { label: 'Este mês',   value: 'mes' },
  { label: '3 meses',    value: '3m'  },
  { label: '6 meses',    value: '6m'  },
  { label: 'Este ano',   value: 'ano' },
]

export function computeFiltro(preset: Preset): Filtro {
  if (preset === 'all') return null
  const hoje = new Date()
  const ano  = hoje.getFullYear()
  const mes  = hoje.getMonth() // 0-indexed
  const iso  = (d: Date) => d.toISOString().slice(0, 10)
  const lastDay = (y: number, m: number) => new Date(y, m + 1, 0)
  if (preset === 'mes') return { inicio: `${ano}-${String(mes + 1).padStart(2, '0')}-01`, fim: iso(lastDay(ano, mes)) }
  if (preset === '3m')  return { inicio: iso(new Date(ano, mes - 2, 1)), fim: iso(lastDay(ano, mes)) }
  if (preset === '6m')  return { inicio: iso(new Date(ano, mes - 5, 1)), fim: iso(lastDay(ano, mes)) }
  if (preset === 'ano') return { inicio: `${ano}-01-01`, fim: `${ano}-12-31` }
  return null
}

export function buildParams(filtro: Filtro) {
  if (!filtro) return {}
  return { inicio: filtro.inicio, fim: filtro.fim }
}

// ─── Helpers ──────────────────────────────────────────────────

export const fmtUSD = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' }).format(v)
export const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`

export function TooltipEscuro({ active, payload, label, labelKey, formatter, extra }: any) {
  if (!active || !payload?.length) return null
  const titulo = labelKey && payload[0]?.payload
    ? payload[0].payload[labelKey] ?? label
    : label
  
  const extraLines = extra && typeof extra === 'function' ? extra(payload[0].payload) : []

  return (
    <div className="bg-bg-card border border-border-light rounded-lg px-4 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md bg-opacity-90">
      {titulo && (
        <p className="text-xs text-text-secondary mb-2 font-medium">{titulo}</p>
      )}
      {payload.map((e: any, i: number) => (
        <div key={i} className="flex gap-4 justify-between items-center mb-1 last:mb-0">
          <span className="text-sm text-text-secondary">{e.name}</span>
          <span className="text-sm font-bold" style={{ color: e.color ?? e.fill ?? '#e2e8f0' }}>
            {formatter ? formatter(e.value) : (typeof e.value === 'number' ? `${e.value.toFixed(1)}%` : e.value)}
          </span>
        </div>
      ))}
      {extraLines && extraLines.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border-light flex flex-col gap-1">
          {extraLines.map((line: string, i: number) => (
            <span key={i} className="text-xs text-text-muted">{line}</span>
          ))}
        </div>
      )}
    </div>
  )
}

export function parseMesLabel(mes: string) {
  const [ano, m] = mes.split('-')
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${nomes[Number(m) - 1]}/${ano.slice(2)}`
}

export function formatDateShort(dateStr: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(dateStr))
}
