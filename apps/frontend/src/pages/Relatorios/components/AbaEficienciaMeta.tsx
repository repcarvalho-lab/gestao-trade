import React, { useEffect, useState } from 'react'
import { Activity, Target, Award, Flame } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import api from '../../../services/api'
import { Filtro, buildParams, fmtUSD } from './RelatoriosShared'

interface MetaDistItem {
  count: number
  pct: number
  resultadoTotal: number
  resultadoMedio: number
}

interface MetaTendSemana {
  semana: string
  metaIdeal: number
  metaMaxima: number
  stop: number
  naoAtingida: number
  eficiencia: number
}

interface MetaData {
  totalDias: number
  distribuicao: {
    META_IDEAL: MetaDistItem
    META_MAXIMA: MetaDistItem
    META_NAO_ATINGIDA: MetaDistItem
    STOP: MetaDistItem
  }
  taxaEficiencia: number
  tendencia: MetaTendSemana[]
  sequencias: { maiorSequenciaMeta: number; sequenciaAtual: number }
}

const STATUS_META_CFG = {
  META_MAXIMA:       { label: 'Meta Máxima',  color: '#8b5cf6' },
  META_IDEAL:        { label: 'Meta Ideal',   color: '#4ade80' },
  META_NAO_ATINGIDA: { label: 'Não Atingida', color: '#fbbf24' },
  STOP:              { label: 'Stop',         color: '#f43f5e' },
} as const

const STATUS_META_ORDER = ['META_MAXIMA', 'META_IDEAL', 'META_NAO_ATINGIDA', 'STOP'] as const

function TooltipSemana({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-bg-card border border-border-light rounded-lg px-4 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md bg-opacity-90">
      <p className="text-xs text-text-secondary mb-2 font-medium">{label}</p>
      {[...payload].reverse().map((e: any, i: number) => (
        <div key={i} className="flex gap-5 justify-between items-center mb-1 last:mb-0">
          <span className="flex items-center gap-1.5 text-[0.8rem] text-text-secondary">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: e.fill }} />
            {e.name}
          </span>
          <span className="text-[0.82rem] font-bold" style={{ color: e.fill }}>{e.value}d</span>
        </div>
      ))}
    </div>
  )
}

const TENDENCIA_WINDOW = 8

export default function AbaEficienciaMeta({ filtro }: { filtro: Filtro }) {
  const [data, setData]       = useState<MetaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [tendStart, setTendStart] = useState(0)

  useEffect(() => {
    setLoading(true); setData(null); setError('')
    api.get('/relatorios/meta', { params: buildParams(filtro) })
      .then(r => setData(r.data))
      .catch(() => setError('Erro ao carregar dados.'))
      .finally(() => setLoading(false))
  }, [filtro])

  useEffect(() => {
    if (data?.tendencia) {
      setTendStart(Math.max(0, data.tendencia.length - TENDENCIA_WINDOW))
    }
  }, [data])

  if (loading) return <div className="flex justify-center p-16"><Activity size={28} className="text-accent-blue animate-spin" /></div>
  if (error)   return <div className="p-8 text-center text-accent-loss">{error}</div>

  if (!data || data.totalDias === 0) return (
    <div className="p-16 text-center text-text-muted">
      Nenhum dia fechado encontrado para o período selecionado.
    </div>
  )

  const { distribuicao: d, taxaEficiencia, tendencia, sequencias } = data
  const efPct = taxaEficiencia * 100
  const efColor = efPct >= 70 ? '#4ade80' : efPct >= 50 ? '#fbbf24' : '#f43f5e'

  return (
    <div className="flex flex-col gap-6">

      {/* Cards resumo */}
      <div className="grid grid-cols-4 gap-3.5">

        {/* Taxa de eficiência */}
        <div className={`card backdrop-blur-sm border ${efPct >= 70 ? 'border-[#4ade80]/30 bg-[#4ade80]/5' : efPct >= 50 ? 'border-[#fbbf24]/30 bg-[#fbbf24]/5' : 'border-[#f43f5e]/30 bg-[#f43f5e]/5'}`}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Target size={14} color={efColor} />
            <p className="text-xs text-text-muted font-bold uppercase tracking-wider m-0">Taxa de Eficiência</p>
          </div>
          <p className="text-[2rem] font-extrabold m-0 leading-tight tracking-tight" style={{ color: efColor }}>{efPct.toFixed(0)}%</p>
          <p className="text-[0.72rem] text-text-muted mt-1">dias que bateram alguma meta</p>
        </div>

        {/* Total de dias */}
        <div className="card backdrop-blur-sm bg-bg-card/80 border border-border">
          <p className="text-xs text-text-muted font-bold uppercase tracking-wider mb-2">Dias Analisados</p>
          <p className="text-[2rem] font-extrabold text-text-primary m-0 leading-tight tracking-tight">{data.totalDias}</p>
          <p className="text-[0.72rem] text-text-muted mt-1">
            {d.META_IDEAL.count + d.META_MAXIMA.count} com meta · {d.META_NAO_ATINGIDA.count + d.STOP.count} sem meta
          </p>
        </div>

        {/* Maior sequência */}
        <div className="card backdrop-blur-sm border border-accent-blue/30 bg-accent-blue/5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Award size={14} className="text-accent-blue" />
            <p className="text-xs text-accent-blue font-bold uppercase tracking-wider m-0">Maior Sequência</p>
          </div>
          <p className="text-[2rem] font-extrabold text-accent-blue m-0 leading-tight tracking-tight">
            {sequencias.maiorSequenciaMeta}d
          </p>
          <p className="text-[0.72rem] text-text-muted mt-1">dias consecutivos com meta</p>
        </div>

        {/* Sequência atual */}
        <div className={`card backdrop-blur-sm border ${sequencias.sequenciaAtual > 0 ? 'border-[#4ade80]/30 bg-[#4ade80]/5' : 'border-[#f43f5e]/30 bg-[#f43f5e]/5'}`}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Flame size={14} color={sequencias.sequenciaAtual > 0 ? '#4ade80' : '#f43f5e'} />
            <p className="text-xs text-text-muted font-bold uppercase tracking-wider m-0">Sequência Atual</p>
          </div>
          <p className="text-[2rem] font-extrabold m-0 leading-tight tracking-tight" style={{ color: sequencias.sequenciaAtual > 0 ? '#4ade80' : '#f43f5e' }}>
            {Math.abs(sequencias.sequenciaAtual)}d
          </p>
          <p className="text-[0.72rem] text-text-muted mt-1">
            {sequencias.sequenciaAtual > 0 ? '🔥 consecutivos com meta' : '⚠️ consecutivos sem meta'}
          </p>
        </div>
      </div>

      {/* Distribuição + Tendência */}
      <div className="grid grid-cols-[1fr_1.8fr] gap-5">

        {/* Donut — Distribuição por Status */}
        <div className="card border border-border backdrop-blur-sm bg-bg-card/80 flex flex-col">
          <h2 className="text-sm font-bold text-text-primary m-0 mb-4">Distribuição por Status</h2>
          <div className="relative h-[180px]">
            {/* Label central */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <div className="text-[1.4rem] font-extrabold leading-none" style={{ color: efColor }}>{efPct.toFixed(0)}%</div>
              <div className="text-[0.65rem] text-text-muted mt-0.5">eficiência</div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={STATUS_META_ORDER.filter(k => d[k].count > 0).map(k => ({ name: STATUS_META_CFG[k].label, value: d[k].count, color: STATUS_META_CFG[k].color }))}
                  cx="50%" cy="50%"
                  innerRadius={52} outerRadius={78}
                  dataKey="value" paddingAngle={2} stroke="none"
                >
                  {STATUS_META_ORDER.filter(k => d[k].count > 0).map((k, i) => (
                    <Cell key={i} fill={STATUS_META_CFG[k].color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => active && payload?.length ? (
                    <div className="rounded-md px-3 py-1.5 text-xs font-bold text-white shadow-md flex items-center gap-1" style={{ background: payload[0].payload.color }}>
                      <span>{payload[0].name}:</span>
                      <span>{payload[0].value}d ({((payload[0].value as number / data!.totalDias) * 100).toFixed(0)}%)</span>
                    </div>
                  ) : null}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legenda com média */}
          <div className="flex flex-col gap-2 mt-3">
            {STATUS_META_ORDER.map(key => {
              const cfg = STATUS_META_CFG[key]
              const item = d[key]
              if (item.count === 0) return null
              return (
                <div key={key} className="flex items-center justify-between group">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm shrink-0 inline-block transition-transform group-hover:scale-125" style={{ background: cfg.color }} />
                    <span className="text-[0.8rem] text-text-primary">{cfg.label}</span>
                  </div>
                  <div className="flex gap-2.5 items-center">
                    <span className="text-[0.78rem] font-bold" style={{ color: cfg.color }}>{item.count}d</span>
                    <span className="text-[0.72rem] text-text-muted min-w-[28px] text-right">{(item.pct * 100).toFixed(0)}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tendência Semanal */}
        <div className="card border border-border backdrop-blur-sm bg-bg-card/80">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-text-primary m-0">Tendência Semanal</h2>
            {tendencia.length > TENDENCIA_WINDOW && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTendStart(s => Math.max(0, s - TENDENCIA_WINDOW))}
                  disabled={tendStart === 0}
                  className={`bg-bg-surface border border-border rounded-md px-2 py-0.5 text-text-primary text-sm leading-tight transition-colors hover:bg-bg-hover ${tendStart === 0 ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}`}
                >‹</button>
                <span className="text-[0.72rem] text-text-muted min-w-[80px] text-center font-medium">
                  {tendStart + 1}–{Math.min(tendStart + TENDENCIA_WINDOW, tendencia.length)} de {tendencia.length}
                </span>
                <button
                  onClick={() => setTendStart(s => Math.min(tendencia.length - TENDENCIA_WINDOW, s + TENDENCIA_WINDOW))}
                  disabled={tendStart + TENDENCIA_WINDOW >= tendencia.length}
                  className={`bg-bg-surface border border-border rounded-md px-2 py-0.5 text-text-primary text-sm leading-tight transition-colors hover:bg-bg-hover ${tendStart + TENDENCIA_WINDOW >= tendencia.length ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}`}
                >›</button>
              </div>
            )}
          </div>
          {tendencia.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-text-muted text-[0.85rem]">
              Sem dados de semanas completas para exibir.
            </div>
          ) : (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tendencia.slice(tendStart, tendStart + TENDENCIA_WINDOW)} margin={{ top: 5, right: 8, left: -14, bottom: 5 }} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.5} />
                  <XAxis dataKey="semana" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<TooltipSemana />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="metaIdeal"   name="Meta Ideal"   stackId="a" fill={STATUS_META_CFG.META_IDEAL.color} />
                  <Bar dataKey="metaMaxima"  name="Meta Máxima"  stackId="a" fill={STATUS_META_CFG.META_MAXIMA.color} />
                  <Bar dataKey="naoAtingida" name="Não Atingida" stackId="a" fill={STATUS_META_CFG.META_NAO_ATINGIDA.color} />
                  <Bar dataKey="stop"        name="Stop"         stackId="a" fill={STATUS_META_CFG.STOP.color} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="flex gap-4 justify-center mt-4 flex-wrap">
            {STATUS_META_ORDER.map(key => (
              <span key={key} className="flex items-center gap-1.5 text-[0.75rem]" style={{ color: STATUS_META_CFG[key].color }}>
                <span className="w-2 h-2 rounded-sm inline-block" style={{ background: STATUS_META_CFG[key].color }} />
                {STATUS_META_CFG[key].label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela por status */}
      <div className="card p-0 overflow-hidden border border-border backdrop-blur-sm bg-bg-card/50">
        <div className="px-5 py-3.5 border-b border-border bg-bg-surface/50">
          <h2 className="text-sm font-bold text-text-primary m-0">Resultado por Status</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
              <tr>
                {['Status', 'Dias', '% do Total', 'Resultado Total', 'Resultado Médio/Dia'].map((h, i) => (
                  <th key={h} className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-text-muted border-b border-border whitespace-nowrap ${i === 0 ? 'text-left' : 'text-center'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STATUS_META_ORDER.map(key => {
                const cfg  = STATUS_META_CFG[key]
                const item = d[key]
                if (item.count === 0) return null
                return (
                  <tr key={key} className="border-t border-border transition-colors hover:bg-bg-hover group">
                    <td className="px-4 py-2.5 text-[0.875rem] font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-sm inline-block shrink-0 transition-transform group-hover:scale-125" style={{ background: cfg.color }} />
                        <span style={{ color: cfg.color }}>{cfg.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center text-[0.875rem] font-mono font-bold text-text-primary">{item.count}</td>
                    <td className="px-4 py-2.5 text-center text-[0.875rem] font-mono text-text-secondary">{(item.pct * 100).toFixed(1)}%</td>
                    <td className={`px-4 py-2.5 text-center text-[0.875rem] font-mono font-bold ${item.resultadoTotal >= 0 ? 'text-accent-win' : 'text-accent-loss'}`}>
                      {item.resultadoTotal >= 0 ? '+' : ''}{fmtUSD(item.resultadoTotal)}
                    </td>
                    <td className={`px-4 py-2.5 text-center text-[0.875rem] font-mono font-bold ${item.resultadoMedio >= 0 ? 'text-accent-win' : 'text-accent-loss'}`}>
                      {item.resultadoMedio >= 0 ? '+' : ''}{fmtUSD(item.resultadoMedio)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
