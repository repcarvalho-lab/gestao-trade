import React, { useEffect, useState } from 'react'
import { Activity, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../../../services/api'
import { Filtro, DisciplinaData, buildParams, fmtUSD, fmtPct, TooltipEscuro } from './RelatoriosShared'

// ─── Componente MetricRow ──────────────────────────────────────

function MetricRow({ label, com, sem, fmt, inverter = false }: {
  label: string; com: number; sem: number; fmt: (v: number) => string; inverter?: boolean
}) {
  const comMelhor = inverter ? com < sem : com > sem
  const semMelhor = inverter ? sem < com : sem > com
  return (
    <tr className="border-t border-border transition-colors hover:bg-bg-hover group">
      <td className="px-4 py-3 text-[0.85rem] text-text-secondary group-hover:text-text-primary transition-colors">{label}</td>
      <td className="px-4 py-3 text-center font-bold text-[0.85rem] font-mono transition-colors"
        style={{ color: comMelhor ? 'var(--accent-win)' : semMelhor ? 'var(--accent-loss)' : 'var(--text-primary)' }}>
        {fmt(com)}
      </td>
      <td className="px-4 py-3 text-center font-bold text-[0.85rem] font-mono transition-colors"
        style={{ color: semMelhor ? 'var(--accent-win)' : comMelhor ? 'var(--accent-loss)' : 'var(--text-primary)' }}>
        {fmt(sem)}
      </td>
    </tr>
  )
}

export default function AbaDisciplina({ filtro }: { filtro: Filtro }) {
  const [data, setData] = useState<DisciplinaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true); setData(null); setError('')
    api.get('/relatorios/disciplina', { params: buildParams(filtro) })
      .then(r => setData(r.data))
      .catch(() => setError('Erro ao carregar relatório.'))
      .finally(() => setLoading(false))
  }, [filtro])

  if (loading) return <div className="flex justify-center p-16"><Activity size={28} className="text-accent-blue animate-spin" /></div>
  if (error) return <div className="p-8 text-center text-accent-loss">{error}</div>
  if (!data || data.totalDias === 0) return <div className="p-16 text-center text-text-muted">Nenhum dia fechado encontrado.</div>

  const { comDisciplina: com, semDisciplina: sem, principaisErros, errosComDisciplina } = data
  const maxErros = principaisErros[0]?.ocorrencias ?? 1

  const comparativoData = [
    { label: '% Dias Positivos', com: com.pctPositivos * 100, sem: sem.pctPositivos * 100 },
    { label: 'Assertividade',   com: com.taxaAcertoMedia * 100, sem: sem.taxaAcertoMedia * 100 },
  ]

  return (
    <div className="flex flex-col gap-6">

      {/* Cards resumo */}
      <div className="grid grid-cols-3 gap-3.5">
        <div className="card border-white/5 backdrop-blur-sm bg-bg-card/80 hover:border-border-light transition-colors">
          <p className="text-xs text-text-muted mb-1 font-medium">Total de Dias Fechados</p>
          <p className="text-3xl font-extrabold text-text-primary m-0 tracking-tight">{data.totalDias}</p>
          {data.semInfo.total > 0 && (
            <p className="text-[0.72rem] text-text-muted mt-1">{data.semInfo.total} sem informação de disciplina</p>
          )}
        </div>
        <div className="card border-[#4ade80]/30 bg-[#4ade80]/5 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle size={14} color="#4ade80" />
            <p className="text-xs text-[#4ade80] m-0 font-semibold">Com Disciplina</p>
          </div>
          <p className="text-3xl font-extrabold text-[#4ade80] m-0 tracking-tight">{com.total}</p>
          <p className="text-[0.72rem] text-text-muted mt-1">
            {data.totalDias > 0 ? `${((com.total / data.totalDias) * 100).toFixed(0)}% dos dias` : '—'}
          </p>
        </div>
        <div className="card border-[#f43f5e]/30 bg-[#f43f5e]/5 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <XCircle size={14} color="#f43f5e" />
            <p className="text-xs text-[#f43f5e] m-0 font-semibold">Sem Disciplina</p>
          </div>
          <p className="text-3xl font-extrabold text-[#f43f5e] m-0 tracking-tight">{sem.total}</p>
          <p className="text-[0.72rem] text-text-muted mt-1">
            {data.totalDias > 0 ? `${((sem.total / data.totalDias) * 100).toFixed(0)}% dos dias` : '—'}
          </p>
        </div>
      </div>

      {/* Tabela + gráfico */}
      <div className="grid grid-cols-2 gap-5">
        <div className="card p-0 overflow-hidden border border-border backdrop-blur-sm bg-bg-card/50">
          <div className="px-5 py-4 border-b border-border bg-bg-surface/50">
            <h2 className="text-sm font-bold text-text-primary m-0">Comparativo de Métricas</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-text-muted border-b border-border">Métrica</th>
                  <th className="px-4 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-[#4ade80] border-b border-border">Com Disciplina</th>
                  <th className="px-4 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-[#f43f5e] border-b border-border">Sem Disciplina</th>
                </tr>
              </thead>
              <tbody>
                <MetricRow label="Dias positivos"      com={com.diasPositivos}      sem={sem.diasPositivos}      fmt={v => `${v} dias`} />
                <MetricRow label="% Dias positivos"    com={com.pctPositivos}       sem={sem.pctPositivos}       fmt={fmtPct} />
                <MetricRow label="Resultado total"     com={com.resultadoTotal}     sem={sem.resultadoTotal}     fmt={fmtUSD} />
                <MetricRow label="Resultado médio/dia" com={com.resultadoMedio}     sem={sem.resultadoMedio}     fmt={fmtUSD} />
                <MetricRow label="Rentab. média/dia"   com={com.rentabilidadeMedia} sem={sem.rentabilidadeMedia} fmt={fmtPct} />
                <MetricRow label="Assertividade"      com={com.taxaAcertoMedia}    sem={sem.taxaAcertoMedia}    fmt={fmtPct} />
              </tbody>
            </table>
          </div>
        </div>

        <div className="card backdrop-blur-sm bg-bg-card/80 border border-border">
          <h2 className="text-sm font-bold text-text-primary m-0 mb-5">Comparativo Visual</h2>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparativoData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.5} />
                <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={v => `${v.toFixed(0)}%`} tickLine={false} axisLine={false} />
                <Tooltip content={<TooltipEscuro />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="com" name="Com Disciplina" fill="#4ade80" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sem" name="Sem Disciplina" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-5 justify-center mt-3">
            {[{ label: 'Com Disciplina', color: '#4ade80' }, { label: 'Sem Disciplina', color: '#f43f5e' }].map(i => (
              <span key={i.label} className="flex items-center gap-1.5 text-[0.78rem]" style={{ color: i.color }}>
                <span className="w-2 h-2 rounded-sm inline-block" style={{ background: i.color }} />{i.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Principais erros */}
      {principaisErros.length > 0 && (
        <div className="card p-0 overflow-hidden border border-border backdrop-blur-sm bg-bg-card/50">
          <div className="px-5 py-4 border-b border-border bg-bg-surface/50 flex items-center gap-2">
            <AlertTriangle size={16} className="text-accent-warn" />
            <h2 className="text-sm font-bold text-text-primary m-0">Principais Erros — Dias Sem Disciplina</h2>
          </div>
          <div className="p-5 flex flex-col gap-4">
            {principaisErros.map((erro, i) => {
              const pct = erro.ocorrencias / Math.max(sem.total, 1)
              const comCount = errosComDisciplina.find(e => e.nome === erro.nome)?.ocorrencias ?? 0
              return (
                <div key={erro.nome} className="flex flex-col gap-1.5 group">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#f43f5e]/15 text-[#f43f5e] text-[0.65rem] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="text-sm text-text-primary font-medium group-hover:text-[#f43f5e] transition-colors">{erro.nome}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {comCount > 0 && <span className="text-xs text-text-muted hidden sm:inline-block">também {comCount}× c/ disciplina</span>}
                      <span className="text-[0.82rem] font-bold text-[#f43f5e] min-w-[60px] text-right">{erro.ocorrencias}× ({(pct * 100).toFixed(0)}% dos dias)</span>
                    </div>
                  </div>
                  <div className="h-1 rounded-full bg-[#f43f5e]/10 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000 ease-out bg-[#f43f5e]/60" style={{ width: `${(erro.ocorrencias / maxErros) * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
