import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import api from '../../../services/api'
import { Filtro, buildParams, fmtUSD, fmtPct, TooltipEscuro } from './RelatoriosShared'

interface HorarioItem {
  hora: string; total: number; wins: number; losses: number
  taxaAcerto: number; resultadoTotal: number; resultadoMedio: number
}

export default function AbaHorarios({ filtro }: { filtro: Filtro }) {
  const [data, setData] = useState<{ horarios: HorarioItem[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [metrica, setMetrica] = useState<'resultadoTotal' | 'taxaAcerto' | 'total'>('resultadoTotal')

  useEffect(() => {
    setLoading(true); setData(null)
    api.get('/relatorios/horarios', { params: buildParams(filtro) })
      .then(r => {
        const trades = r.data.trades as { status: string, resultado: number | null, horario: string }[]
        
        // Agrupar localmente baseando-se no timezone do browser do usuário!
        const mapa: Record<string, { total: number; wins: number; losses: number; resultados: number[] }> = {}
        
        for (let i = 0; i < 24; i++) {
          const hh = String(i).padStart(2, '0') + ':00'
          mapa[hh] = { total: 0, wins: 0, losses: 0, resultados: [] }
        }

        trades.forEach(t => {
          if (!t.horario) return
          const h = new Date(t.horario).getHours()
          const hh = String(h).padStart(2, '0') + ':00'
          
          mapa[hh].total++
          if (t.status === 'WIN') mapa[hh].wins++
          else mapa[hh].losses++
          mapa[hh].resultados.push(t.resultado ?? 0)
        })

        const horarios = Object.entries(mapa).map(([hora, g]) => ({
          hora,
          total: g.total,
          wins: g.wins,
          losses: g.losses,
          taxaAcerto: g.total > 0 ? g.wins / g.total : 0,
          resultadoTotal: g.resultados.reduce((s, v) => s + v, 0),
          resultadoMedio: g.total > 0 ? g.resultados.reduce((s, v) => s + v, 0) / g.total : 0,
        })).sort((a, b) => a.hora.localeCompare(b.hora))

        setData({ horarios })
      })
      .finally(() => setLoading(false))
  }, [filtro])

  if (loading) return <div className="flex justify-center p-16"><Activity size={28} className="text-accent-blue animate-spin" /></div>
  if (!data || data.horarios.every(d => d.total === 0)) return <div className="p-16 text-center text-text-muted">Nenhum dado disponível.</div>

  const horariosOp = data.horarios.filter(d => d.total > 0)
  const melhorHora = [...horariosOp].sort((a, b) => b.resultadoTotal - a.resultadoTotal)[0]
  const piorHora   = [...horariosOp].sort((a, b) => a.resultadoTotal - b.resultadoTotal)[0]
  const maisOperada= [...horariosOp].sort((a, b) => b.total - a.total)[0]

  const METRICAS = [
    { key: 'resultadoTotal' as const, label: 'Resultado Total' },
    { key: 'taxaAcerto'     as const, label: 'Assertividade' },
    { key: 'total'          as const, label: 'Total Operações' },
  ]

  const fmtMetrica = (v: number) => {
    if (metrica === 'resultadoTotal') return fmtUSD(v)
    if (metrica === 'taxaAcerto') return `${(v * 100).toFixed(1)}%`
    return String(v)
  }

  const chartData = data.horarios.map(d => ({
    hora: d.hora.slice(0, 2) + 'h',
    horaCompleta: d.hora,
    valor: d[metrica],
    total: d.total,
    resultadoTotal: d.resultadoTotal,
    taxaAcerto: d.taxaAcerto,
    semDados: d.total === 0,
  }))

  const resultClass = (v: number) => v >= 0 ? 'text-accent-win' : 'text-accent-loss'

  return (
    <div className="flex flex-col gap-6">

      {/* Destaques */}
      <div className="grid grid-cols-3 gap-3.5">
        <div className="card border-[#4ade80]/30 bg-[#4ade80]/5 backdrop-blur-sm">
          <p className="text-[0.72rem] text-[#4ade80] font-bold uppercase tracking-wider mb-1.5">Melhor Horário</p>
          <p className="text-[1.3rem] font-bold text-text-primary m-0 mb-1">{melhorHora.hora}</p>
          <p className="text-2xl font-extrabold text-[#4ade80] m-0 tracking-tight">{fmtUSD(melhorHora.resultadoTotal)}</p>
          <p className="text-[0.72rem] text-text-muted mt-1">{melhorHora.total} operações realizadas</p>
        </div>
        <div className="card border-[#f43f5e]/30 bg-[#f43f5e]/5 backdrop-blur-sm">
          <p className="text-[0.72rem] text-[#f43f5e] font-bold uppercase tracking-wider mb-1.5">Pior Horário</p>
          <p className="text-[1.3rem] font-bold text-text-primary m-0 mb-1">{piorHora.hora}</p>
          <p className="text-2xl font-extrabold text-[#f43f5e] m-0 tracking-tight">{fmtUSD(piorHora.resultadoTotal)}</p>
          <p className="text-[0.72rem] text-text-muted mt-1">{piorHora.total} operações realizadas</p>
        </div>
        <div className="card border-accent-blue/30 bg-accent-blue/5 backdrop-blur-sm">
          <p className="text-[0.72rem] text-accent-blue font-bold uppercase tracking-wider mb-1.5">Horário Mais Operado</p>
          <p className="text-[1.3rem] font-bold text-text-primary m-0 mb-1">{maisOperada.hora}</p>
          <p className="text-2xl font-extrabold text-accent-blue m-0 tracking-tight">{maisOperada.total} trades</p>
          <p className="text-[0.72rem] text-text-muted mt-1">{fmtPct(maisOperada.taxaAcerto)} de assertividade</p>
        </div>
      </div>

      {/* Gráfico */}
      <div className="card border border-border backdrop-blur-sm bg-bg-card/80">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-sm font-bold text-text-primary m-0">Desempenho por Faixa de Horário</h2>
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
              <XAxis dataKey="hora" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={fmtMetrica} />
              <Tooltip content={<TooltipEscuro labelKey="horaCompleta" formatter={fmtMetrica}
                extra={(p: any) => p.total > 0 ? [
                  `${p.total} operações registradas`,
                  `Resultado total: ${fmtUSD(p.resultadoTotal)}`,
                  `Assertividade: ${(p.taxaAcerto * 100).toFixed(1)}%`,
                ] : ['Sem dados']}
              />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={
                    entry.semDados ? 'var(--border)' :
                    metrica === 'resultadoTotal' ? (entry.valor >= 0 ? 'var(--accent-win)' : 'var(--accent-loss)') :
                    metrica === 'taxaAcerto' ? (entry.valor >= 0.5 ? 'var(--accent-win)' : 'var(--accent-loss)') :
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
          <h2 className="text-sm font-bold text-text-primary m-0">Detalhamento por Horário</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
              <tr>
                {['Horário', 'Operações', 'Resultado Total', 'Resultado Médio', 'Assertividade', 'Wins', 'Losses'].map((h, i) => (
                  <th key={h} className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-text-muted border-b border-border whitespace-nowrap ${i === 0 ? 'text-left' : 'text-center'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.horarios.map(d => (
                <tr key={d.hora} className={`border-t border-border transition-colors hover:bg-bg-hover group ${d.total === 0 ? 'opacity-40' : ''}`}>
                  <td className="px-4 py-2.5 font-bold text-[0.85rem] text-text-primary group-hover:text-accent-blue transition-colors">{d.hora}</td>
                  <td className="px-4 py-2.5 text-center font-mono text-[0.85rem] text-text-secondary">{d.total}</td>
                  <td className={`px-4 py-2.5 text-center font-mono text-[0.85rem] font-bold ${resultClass(d.resultadoTotal)}`}>
                    {d.total > 0 ? (d.resultadoTotal >= 0 ? '+' + fmtUSD(d.resultadoTotal) : fmtUSD(d.resultadoTotal)) : '—'}
                  </td>
                  <td className={`px-4 py-2.5 text-center font-mono text-[0.85rem] font-bold ${resultClass(d.resultadoMedio)}`}>
                    {d.total > 0 ? (d.resultadoMedio >= 0 ? '+' + fmtUSD(d.resultadoMedio) : fmtUSD(d.resultadoMedio)) : '—'}
                  </td>
                  <td className={`px-4 py-2.5 text-center font-mono text-[0.85rem] font-bold ${d.taxaAcerto >= 0.6 ? 'text-accent-win' : d.taxaAcerto >= 0.4 ? 'text-accent-warn' : 'text-accent-loss'}`}>
                    {d.total > 0 ? fmtPct(d.taxaAcerto) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-center font-mono font-bold text-[0.85rem] text-accent-win">{d.wins}</td>
                  <td className="px-4 py-2.5 text-center font-mono font-bold text-[0.85rem] text-accent-loss">{d.losses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
