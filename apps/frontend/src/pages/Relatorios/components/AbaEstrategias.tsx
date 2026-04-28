import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import api from '../../../services/api'
import { Filtro, buildParams, fmtUSD, fmtPct, TooltipEscuro } from './RelatoriosShared'

interface EstrategiaItem {
  nome: string; total: number; wins: number; losses: number
  taxaAcerto: number; resultadoTotal: number; resultadoMedio: number
  melhorTrade: number; piorTrade: number
}

type OrdemEstrategia = 'taxaAcerto' | 'resultadoTotal' | 'resultadoMedio' | 'total'

export default function AbaEstrategias({ filtro }: { filtro: Filtro }) {
  const [data, setData] = useState<{ estrategias: EstrategiaItem[]; totalTrades: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ordem, setOrdem] = useState<OrdemEstrategia>('taxaAcerto')

  useEffect(() => {
    setLoading(true); setData(null); setError('')
    api.get('/relatorios/estrategias', { params: buildParams(filtro) })
      .then(r => setData(r.data))
      .catch(() => setError('Erro ao carregar dados.'))
      .finally(() => setLoading(false))
  }, [filtro])

  if (loading) return <div className="flex justify-center p-16"><Activity size={28} className="text-accent-blue animate-spin" /></div>
  if (error) return <div className="p-8 text-center text-accent-loss">{error}</div>
  if (!data || data.estrategias.length === 0) return <div className="p-16 text-center text-text-muted">Nenhuma operação com origem registrada.</div>

  const sorted = [...data.estrategias].sort((a, b) => b[ordem] - a[ordem])
  const melhorTaxa = [...data.estrategias].sort((a, b) => b.taxaAcerto - a.taxaAcerto)[0]
  const melhorResultado = [...data.estrategias].sort((a, b) => b.resultadoTotal - a.resultadoTotal)[0]
  const maisUsada = [...data.estrategias].sort((a, b) => b.total - a.total)[0]

  const PIE_COLORS = ['#3b82f6','#4ade80','#fbbf24','#f43f5e','#a78bfa','#34d399','#fb923c','#e879f9']

  const chartData = sorted.slice(0, 8).map(e => ({
    nome: e.nome.length > 14 ? e.nome.slice(0, 14) + '…' : e.nome,
    nomeCompleto: e.nome,
    taxaAcerto: e.taxaAcerto * 100,
    resultadoTotal: e.resultadoTotal,
    resultadoMedio: e.resultadoMedio,
    total: e.total,
  }))

  const pieData = [...data.estrategias].sort((a, b) => b.total - a.total).slice(0, 8).map((e, i) => ({
    name: e.nome,
    value: e.total,
    pct: data.totalTrades > 0 ? (e.total / data.totalTrades) * 100 : 0,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }))

  const ORDENS: { key: OrdemEstrategia; label: string }[] = [
    { key: 'taxaAcerto',     label: 'Assertividade' },
    { key: 'resultadoTotal', label: 'Resultado Total' },
    { key: 'resultadoMedio', label: 'Resultado Médio' },
    { key: 'total',          label: 'Nº de Trades' },
  ]

  const metricsInfo: Record<OrdemEstrategia, { nome: string; fmt: (v: number) => string; domain: any[] }> = {
    taxaAcerto:     { nome: 'Assertividade',  fmt: v => `${v.toFixed(0)}%`, domain: [0, 100] },
    resultadoTotal: { nome: 'Resultado Total', fmt: v => fmtUSD(v),        domain: ['auto', 'auto'] },
    resultadoMedio: { nome: 'Resultado Médio', fmt: v => fmtUSD(v),        domain: ['auto', 'auto'] },
    total:          { nome: 'Nº de Trades',    fmt: v => String(v),        domain: [0, 'dataMax'] },
  }
  const mainMetric = metricsInfo[ordem]

    const resultClass = (v: number) => v > 0 ? 'text-accent-win' : v < 0 ? 'text-accent-loss' : 'text-text-muted'

  return (
    <div className="flex flex-col gap-6">

      {/* Cards destaque */}
      <div className="grid grid-cols-3 gap-3.5">
        <div className="card border-[#4ade80]/30 bg-[#4ade80]/5 backdrop-blur-sm">
          <p className="text-[0.72rem] text-[#4ade80] font-bold uppercase tracking-wider mb-1.5">Maior Assertividade</p>
          <p className="text-[1.1rem] font-bold text-text-primary m-0 mb-1 truncate">{melhorTaxa.nome}</p>
          <p className="text-2xl font-extrabold text-[#4ade80] m-0 tracking-tight">{fmtPct(melhorTaxa.taxaAcerto)}</p>
          <p className="text-[0.72rem] text-text-muted mt-1">{melhorTaxa.wins}W / {melhorTaxa.losses}L em {melhorTaxa.total} trades</p>
        </div>
        <div className="card border-accent-blue/30 bg-accent-blue/5 backdrop-blur-sm">
          <p className="text-[0.72rem] text-accent-blue font-bold uppercase tracking-wider mb-1.5">Maior Resultado Total</p>
          <p className="text-[1.1rem] font-bold text-text-primary m-0 mb-1 truncate">{melhorResultado.nome}</p>
          <p className="text-2xl font-extrabold text-accent-blue m-0 tracking-tight">{fmtUSD(melhorResultado.resultadoTotal)}</p>
          <p className="text-[0.72rem] text-text-muted mt-1">Média {fmtUSD(melhorResultado.resultadoMedio)}/trade</p>
        </div>
        <div className="card border-accent-warn/30 bg-accent-warn/5 backdrop-blur-sm">
          <p className="text-[0.72rem] text-accent-warn font-bold uppercase tracking-wider mb-1.5">Mais Utilizada</p>
          <p className="text-[1.1rem] font-bold text-text-primary m-0 mb-1 truncate">{maisUsada.nome}</p>
          <p className="text-2xl font-extrabold text-accent-warn m-0 tracking-tight">{maisUsada.total} trades</p>
          <p className="text-[0.72rem] text-text-muted mt-1">{fmtPct(maisUsada.taxaAcerto)} de acerto</p>
        </div>
      </div>

      {/* Gráficos: pizza + barras */}
      <div className="grid grid-cols-[1fr_1.6fr] gap-5">

        {/* Pizza — distribuição de trades por origem */}
        <div className="card border border-border backdrop-blur-sm bg-bg-card/80 flex flex-col">
          <h2 className="text-sm font-bold text-text-primary m-0 mb-4">Distribuição de Trades</h2>
          <div className="relative h-[180px]">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <div className="text-[1.3rem] font-extrabold text-text-primary leading-none">{data.totalTrades}</div>
              <div className="text-[0.65rem] text-text-muted mt-0.5">trades</div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={74} dataKey="value" paddingAngle={2} stroke="none">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => active && payload?.length ? (
                    <div className="rounded-md px-3 py-1.5 text-xs font-bold text-white shadow-md flex items-center gap-1" style={{ background: payload[0].payload.color }}>
                      <span>{payload[0].payload.name}:</span>
                      <span>{payload[0].value} trades ({payload[0].payload.pct.toFixed(0)}%)</span>
                    </div>
                  ) : null}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-1.5 mt-3">
            {pieData.map((entry, i) => (
              <div key={i} className="flex items-center justify-between group">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm shrink-0 inline-block transition-transform group-hover:scale-125" style={{ background: entry.color }} />
                  <span className="text-[0.78rem] text-text-primary truncate max-w-[120px]">{entry.name}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-[0.78rem] font-bold" style={{ color: entry.color }}>{entry.value}</span>
                  <span className="text-[0.72rem] text-text-muted min-w-[28px] text-right">{entry.pct.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Barras — métrica selecionável */}
        <div className="card border border-border backdrop-blur-sm bg-bg-card/80">
          <h2 className="text-sm font-bold text-text-primary m-0 mb-5">{mainMetric.nome} por Origem</h2>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} opacity={0.5} />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickFormatter={mainMetric.fmt} tickLine={false} axisLine={false} domain={mainMetric.domain} />
                <YAxis type="category" dataKey="nome" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} width={110} />
                <Tooltip content={<TooltipEscuro labelKey="nomeCompleto" formatter={mainMetric.fmt} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey={ordem} name={mainMetric.nome} fill="var(--accent-blue)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Tabela completa */}
      <div className="card p-0 overflow-hidden border border-border backdrop-blur-sm bg-bg-card/50">
        <div className="px-5 py-3.5 border-b border-border bg-bg-surface/50 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-text-primary m-0">Todas as Origens</h2>
          <div className="flex gap-1.5">
            {ORDENS.map(o => {
              const ativo = ordem === o.key
              return (
                <button key={o.key} onClick={() => setOrdem(o.key)} className={`
                  px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer transition-all
                  border ${ativo ? 'border-accent-blue bg-accent-blue/10 text-accent-blue' : 'border-transparent hover:border-border text-text-muted hover:bg-bg-hover'}
                `}>
                  {o.label}
                </button>
              )
            })}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
              <tr>
                {['Origem', 'Trades', 'Win', 'Loss', 'Taxa Acerto', 'Resultado Total', 'Resultado Médio', 'Melhor Trade', 'Pior Trade'].map((h, i) => (
                  <th key={h} className={`px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-text-muted border-b border-border whitespace-nowrap ${i === 0 ? 'text-left' : 'text-center'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((e, i) => (
                <tr key={e.nome} className="border-t border-border transition-colors hover:bg-bg-hover group">
                  <td className="px-3.5 py-2 text-[0.875rem] font-semibold text-text-primary">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-accent-blue/15 text-accent-blue text-[0.65rem] font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="group-hover:text-accent-blue transition-colors">{e.nome}</span>
                    </div>
                  </td>
                  <td className="px-3.5 py-2 text-center text-[0.82rem] font-mono font-semibold text-text-primary">{e.total}</td>
                  <td className="px-3.5 py-2 text-center text-[0.82rem] font-mono font-semibold text-accent-win">{e.wins}</td>
                  <td className="px-3.5 py-2 text-center text-[0.82rem] font-mono font-semibold text-accent-loss">{e.losses}</td>
                  <td className={`px-3.5 py-2 text-center text-[0.82rem] font-mono font-bold ${e.taxaAcerto >= 0.6 ? 'text-accent-win' : e.taxaAcerto >= 0.4 ? 'text-accent-warn' : 'text-accent-loss'}`}>
                    {fmtPct(e.taxaAcerto)}
                  </td>
                  <td className={`px-3.5 py-2 text-center text-[0.82rem] font-mono font-bold ${resultClass(e.resultadoTotal)}`}>
                    {e.resultadoTotal >= 0 ? '+' : ''}{fmtUSD(e.resultadoTotal)}
                  </td>
                  <td className={`px-3.5 py-2 text-center text-[0.82rem] font-mono font-bold ${resultClass(e.resultadoMedio)}`}>
                    {e.resultadoMedio >= 0 ? '+' : ''}{fmtUSD(e.resultadoMedio)}
                  </td>
                  <td className="px-3.5 py-2 text-center text-[0.82rem] font-mono font-bold text-accent-win">+{fmtUSD(e.melhorTrade)}</td>
                  <td className="px-3.5 py-2 text-center text-[0.82rem] font-mono font-bold text-accent-loss">{fmtUSD(e.piorTrade)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
