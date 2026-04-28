import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import api from '../../../services/api'
import { Filtro, buildParams, fmtUSD, fmtPct, TooltipEscuro } from './RelatoriosShared'

interface DiaSemanaItem {
  dow: number; nome: string; diasOperados: number; diasPositivos: number
  pctPositivos: number; resultadoTotal: number; resultadoMedio: number
  taxaAcertoMedia: number; totalWins: number; totalLosses: number
}

export default function AbaDiaSemana({ filtro }: { filtro: Filtro }) {
  const [data, setData] = useState<{ diasSemana: DiaSemanaItem[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [metrica, setMetrica] = useState<'resultadoMedio' | 'pctPositivos' | 'taxaAcertoMedia'>('resultadoMedio')

  useEffect(() => {
    setLoading(true); setData(null)
    api.get('/relatorios/dias-semana', { params: buildParams(filtro) })
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [filtro])

  if (loading) return <div className="flex justify-center p-16"><Activity size={28} className="text-accent-blue animate-spin" /></div>
  if (!data || data.diasSemana.every(d => d.diasOperados === 0)) return <div className="p-16 text-center text-text-muted">Nenhum dado disponível.</div>

  const dias = data.diasSemana.filter(d => d.diasOperados > 0)
  const melhorDia  = [...dias].sort((a, b) => b.resultadoMedio - a.resultadoMedio)[0]
  const piorDia    = [...dias].sort((a, b) => a.resultadoMedio - b.resultadoMedio)[0]
  const maisAcerto = [...dias].sort((a, b) => b.taxaAcertoMedia - a.taxaAcertoMedia)[0]

  const METRICAS = [
    { key: 'resultadoMedio'  as const, label: 'Resultado Médio' },
    { key: 'pctPositivos'    as const, label: '% Dias Positivos' },
    { key: 'taxaAcertoMedia' as const, label: 'Assertividade' },
  ]

  const fmtMetrica = (v: number) => {
    if (metrica === 'resultadoMedio') return fmtUSD(v)
    return `${(v * 100).toFixed(1)}%`
  }

  const chartData = data.diasSemana.map(d => ({
    nome: d.nome.slice(0, 3),
    nomeCompleto: d.nome,
    valor: d[metrica],
    diasOperados: d.diasOperados,
    diasPositivos: d.diasPositivos,
    resultadoMedio: d.resultadoMedio,
    taxaAcertoMedia: d.taxaAcertoMedia,
    pctPositivos: d.pctPositivos,
    semDados: d.diasOperados === 0,
  }))

  const resultClass = (v: number) => v >= 0 ? 'text-accent-win' : 'text-accent-loss'

  return (
    <div className="flex flex-col gap-6">

      {/* Destaques */}
      <div className="grid grid-cols-3 gap-3.5">
        <div className="card border-[#4ade80]/30 bg-[#4ade80]/5 backdrop-blur-sm">
          <p className="text-[0.72rem] text-[#4ade80] font-bold uppercase tracking-wider mb-1.5">Melhor Dia</p>
          <p className="text-[1.3rem] font-bold text-text-primary m-0 mb-1">{melhorDia.nome}</p>
          <p className="text-2xl font-extrabold text-[#4ade80] m-0 tracking-tight">{fmtUSD(melhorDia.resultadoMedio)}</p>
          <p className="text-[0.72rem] text-text-muted mt-1">média/dia · {melhorDia.diasOperados} dias operados</p>
        </div>
        <div className="card border-[#f43f5e]/30 bg-[#f43f5e]/5 backdrop-blur-sm">
          <p className="text-[0.72rem] text-[#f43f5e] font-bold uppercase tracking-wider mb-1.5">Pior Dia</p>
          <p className="text-[1.3rem] font-bold text-text-primary m-0 mb-1">{piorDia.nome}</p>
          <p className="text-2xl font-extrabold text-[#f43f5e] m-0 tracking-tight">{fmtUSD(piorDia.resultadoMedio)}</p>
          <p className="text-[0.72rem] text-text-muted mt-1">média/dia · {piorDia.diasOperados} dias operados</p>
        </div>
        <div className="card border-accent-blue/30 bg-accent-blue/5 backdrop-blur-sm">
          <p className="text-[0.72rem] text-accent-blue font-bold uppercase tracking-wider mb-1.5">Maior Assertividade</p>
          <p className="text-[1.3rem] font-bold text-text-primary m-0 mb-1">{maisAcerto.nome}</p>
          <p className="text-2xl font-extrabold text-accent-blue m-0 tracking-tight">{fmtPct(maisAcerto.taxaAcertoMedia)}</p>
          <p className="text-[0.72rem] text-text-muted mt-1">{maisAcerto.totalWins}W / {maisAcerto.totalLosses}L</p>
        </div>
      </div>

      {/* Gráfico */}
      <div className="card border border-border backdrop-blur-sm bg-bg-card/80">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-sm font-bold text-text-primary m-0">Desempenho por Dia da Semana</h2>
          <div className="flex gap-1.5">
            {METRICAS.map(m => {
              const ativo = metrica === m.key
              return (
                <button key={m.key} onClick={() => setMetrica(m.key)} className={`
                  px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer transition-all
                  border ${ativo ? 'border-accent-blue bg-accent-blue/10 text-accent-blue' : 'border-transparent hover:border-border text-text-muted hover:bg-bg-hover'}
                `}>
                  {m.label}
                </button>
              )
            })}
          </div>
        </div>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.5} />
              <XAxis dataKey="nome" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={fmtMetrica} />
              <Tooltip content={<TooltipEscuro labelKey="nomeCompleto" formatter={fmtMetrica}
                extra={(p: any) => p.diasOperados > 0 ? [
                  `${p.diasOperados} dias operados (${p.diasPositivos} positivos)`,
                  `Resultado médio: ${fmtUSD(p.resultadoMedio)}`,
                  `Assertividade: ${(p.taxaAcertoMedia * 100).toFixed(1)}%`,
                ] : ['Sem dados']}
              />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={
                    entry.semDados ? 'var(--border)' :
                    metrica === 'resultadoMedio' ? (entry.valor >= 0 ? 'var(--accent-win)' : 'var(--accent-loss)') :
                    'var(--accent-blue)'
                  } />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela */}
      <div className="card p-0 overflow-hidden border border-border backdrop-blur-sm bg-bg-card/50">
        <div className="px-5 py-3.5 border-b border-border bg-bg-surface/50">
          <h2 className="text-sm font-bold text-text-primary m-0">Detalhamento por Dia</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
              <tr>
                {['Dia', 'Dias Op.', 'Dias +', '% Positivos', 'Resultado Total', 'Resultado Médio', 'Assertividade', 'Wins', 'Losses'].map((h, i) => (
                  <th key={h} className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-text-muted border-b border-border whitespace-nowrap ${i === 0 ? 'text-left' : 'text-center'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.diasSemana.map(d => (
                <tr key={d.dow} className={`border-t border-border transition-colors hover:bg-bg-hover group ${d.diasOperados === 0 ? 'opacity-40' : ''}`}>
                  <td className="px-4 py-2.5 font-bold text-[0.85rem] text-text-primary group-hover:text-accent-blue transition-colors">{d.nome}</td>
                  <td className="px-4 py-2.5 text-center font-mono text-[0.85rem] text-text-secondary">{d.diasOperados}</td>
                  <td className="px-4 py-2.5 text-center font-mono text-[0.85rem] font-bold text-accent-win">{d.diasPositivos}</td>
                  <td className={`px-4 py-2.5 text-center font-mono text-[0.85rem] font-bold ${d.pctPositivos >= 0.6 ? 'text-accent-win' : d.pctPositivos >= 0.4 ? 'text-accent-warn' : 'text-accent-loss'}`}>
                    {d.diasOperados > 0 ? `${(d.pctPositivos * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td className={`px-4 py-2.5 text-center font-mono text-[0.85rem] font-bold ${resultClass(d.resultadoTotal)}`}>
                    {d.diasOperados > 0 ? (d.resultadoTotal >= 0 ? '+' + fmtUSD(d.resultadoTotal) : fmtUSD(d.resultadoTotal)) : '—'}
                  </td>
                  <td className={`px-4 py-2.5 text-center font-mono text-[0.85rem] font-bold ${resultClass(d.resultadoMedio)}`}>
                    {d.diasOperados > 0 ? (d.resultadoMedio >= 0 ? '+' + fmtUSD(d.resultadoMedio) : fmtUSD(d.resultadoMedio)) : '—'}
                  </td>
                  <td className={`px-4 py-2.5 text-center font-mono text-[0.85rem] font-bold ${d.taxaAcertoMedia >= 0.6 ? 'text-accent-win' : d.taxaAcertoMedia >= 0.4 ? 'text-accent-warn' : 'text-accent-loss'}`}>
                    {d.diasOperados > 0 ? fmtPct(d.taxaAcertoMedia) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-center font-mono font-bold text-[0.85rem] text-accent-win">{d.totalWins}</td>
                  <td className="px-4 py-2.5 text-center font-mono font-bold text-[0.85rem] text-accent-loss">{d.totalLosses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
