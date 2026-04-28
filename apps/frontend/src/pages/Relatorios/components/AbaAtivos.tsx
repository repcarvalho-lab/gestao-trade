import React, { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import api from '../../../services/api'
import { Filtro, buildParams, fmtUSD, fmtPct, TooltipEscuro } from './RelatoriosShared'

interface AtivoItem {
  nome: string; total: number; wins: number; losses: number
  taxaAcerto: number; resultadoTotal: number; resultadoMedio: number
  melhorTrade: number; piorTrade: number
}

export default function AbaAtivos({ filtro }: { filtro: Filtro }) {
  const [data, setData] = useState<{ ativos: AtivoItem[]; totalTrades: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [ordem, setOrdem] = useState<'taxaAcerto' | 'resultadoTotal' | 'total'>('resultadoTotal')

  useEffect(() => {
    setLoading(true); setData(null)
    api.get('/relatorios/ativos', { params: buildParams(filtro) })
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [filtro])

  if (loading) return <div className="flex justify-center p-16"><Activity size={28} className="text-accent-blue animate-spin" /></div>
  if (!data || data.ativos.length === 0) return <div className="p-16 text-center text-text-muted">Nenhuma operação com ativo registrado.</div>

  const sorted = [...data.ativos].sort((a, b) => b[ordem] - a[ordem])
  const melhor = [...data.ativos].sort((a, b) => b.resultadoTotal - a.resultadoTotal)[0]
  const pior   = [...data.ativos].sort((a, b) => a.resultadoTotal - b.resultadoTotal)[0]
  const maisUsado = [...data.ativos].sort((a, b) => b.total - a.total)[0]

  const chartData = sorted.slice(0, 8).map(a => ({
    nome: a.nome.length > 12 ? a.nome.slice(0, 12) + '…' : a.nome,
    nomeCompleto: a.nome,
    resultadoTotal: a.resultadoTotal,
    taxaAcerto: a.taxaAcerto * 100,
    total: a.total,
  }))

  const ORDENS = [
    { key: 'resultadoTotal' as const, label: 'Resultado' },
    { key: 'taxaAcerto'    as const, label: 'Assertividade' },
    { key: 'total'         as const, label: 'Nº Trades' },
  ]

  const resultClass = (v: number) => v > 0 ? 'text-accent-win' : v < 0 ? 'text-accent-loss' : 'text-text-muted'

  return (
    <div className="flex flex-col gap-6">

      {/* Destaques */}
      <div className="grid grid-cols-3 gap-3.5">
        <div className="card border-[#4ade80]/30 bg-[#4ade80]/5 backdrop-blur-sm">
          <p className="text-[0.72rem] text-[#4ade80] font-bold uppercase tracking-wider mb-1.5">Melhor Ativo</p>
          <p className="text-[1.1rem] font-bold text-text-primary m-0 mb-1 truncate">{melhor.nome}</p>
          <p className="text-2xl font-extrabold text-[#4ade80] m-0 tracking-tight">{fmtUSD(melhor.resultadoTotal)}</p>
          <p className="text-[0.72rem] text-text-muted mt-1">{melhor.wins}W / {melhor.losses}L · {fmtPct(melhor.taxaAcerto)} acerto</p>
        </div>
        <div className="card border-[#f43f5e]/30 bg-[#f43f5e]/5 backdrop-blur-sm">
          <p className="text-[0.72rem] text-[#f43f5e] font-bold uppercase tracking-wider mb-1.5">Pior Ativo</p>
          <p className="text-[1.1rem] font-bold text-text-primary m-0 mb-1 truncate">{pior.nome}</p>
          <p className="text-2xl font-extrabold text-[#f43f5e] m-0 tracking-tight">{fmtUSD(pior.resultadoTotal)}</p>
          <p className="text-[0.72rem] text-text-muted mt-1">{pior.wins}W / {pior.losses}L · {fmtPct(pior.taxaAcerto)} acerto</p>
        </div>
        <div className="card border-[#fbbf24]/30 bg-[#fbbf24]/5 backdrop-blur-sm">
          <p className="text-[0.72rem] text-accent-warn font-bold uppercase tracking-wider mb-1.5">Mais Operado</p>
          <p className="text-[1.1rem] font-bold text-text-primary m-0 mb-1 truncate">{maisUsado.nome}</p>
          <p className="text-2xl font-extrabold text-accent-warn m-0 tracking-tight">{maisUsado.total} trades</p>
          <p className="text-[0.72rem] text-text-muted mt-1">{fmtPct(maisUsado.taxaAcerto)} acerto · {fmtUSD(maisUsado.resultadoTotal)}</p>
        </div>
      </div>

      {/* Donut + Gráfico de barras */}
      <div className="grid grid-cols-[1fr_1.8fr] gap-5">

        {/* Donut — distribuição de trades por ativo */}
        {(() => {
          const CORES = ['#3b82f6','#4ade80','#fbbf24','#f43f5e','#8b5cf6','#06b6d4','#f97316','#ec4899']
          const donutData = data.ativos.slice(0, 8).map((a, i) => ({
            nome: a.nome, value: a.total, color: CORES[i % CORES.length],
          }))
          const total = donutData.reduce((s, d) => s + d.value, 0)
          return (
            <div className="card border border-border backdrop-blur-sm bg-bg-card/80 flex flex-col">
              <h2 className="text-sm font-bold text-text-primary m-0 mb-3">Distribuição de Trades</h2>
              <div className="relative h-[170px]">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <div className="text-[1.3rem] font-extrabold text-text-primary leading-none">{total}</div>
                  <div className="text-[0.65rem] text-text-muted mt-0.5">trades</div>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" paddingAngle={2} stroke="none">
                      {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={({ active, payload }) => active && payload?.length ? (
                      <div className="rounded-md px-3 py-1.5 text-xs font-bold text-white shadow-md flex items-center gap-1" style={{ background: payload[0].payload.color }}>
                        <span>{payload[0].payload.nome}:</span>
                        <span>{payload[0].value} trades ({((payload[0].value as number / total) * 100).toFixed(0)}%)</span>
                      </div>
                    ) : null} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-1.5 mt-3">
                {donutData.map((a) => (
                  <div key={a.nome} className="flex items-center justify-between group">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-sm shrink-0 inline-block transition-transform group-hover:scale-125" style={{ background: a.color }} />
                      <span className="text-[0.78rem] text-text-primary truncate max-w-[120px]">{a.nome}</span>
                    </div>
                    <span className="text-[0.75rem] text-text-muted">{a.value} · {((a.value / total) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Gráfico de barras */}
        <div className="card border border-border backdrop-blur-sm bg-bg-card/80">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-sm font-bold text-text-primary m-0">
              {ordem === 'resultadoTotal' ? 'Resultado por Ativo' : ordem === 'taxaAcerto' ? 'Assertividade por Ativo' : 'Trades por Ativo'}
            </h2>
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
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} opacity={0.5} />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false}
                  tickFormatter={v => ordem === 'taxaAcerto' ? `${v.toFixed(0)}%` : ordem === 'resultadoTotal' ? `$${v}` : String(v)} />
                <YAxis type="category" dataKey="nome" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} width={90} />
                <Tooltip content={<TooltipEscuro labelKey="nomeCompleto" formatter={(v: number) =>
                  ordem === 'taxaAcerto' ? `${Number(v).toFixed(1)}%` : ordem === 'resultadoTotal' ? fmtUSD(Number(v)) : String(v)
                } />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey={ordem} fill="var(--accent-blue)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="card p-0 overflow-hidden border border-border backdrop-blur-sm bg-bg-card/50">
        <div className="px-5 py-3.5 border-b border-border bg-bg-surface/50">
          <h2 className="text-sm font-bold text-text-primary m-0">Todos os Ativos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
              <tr>
                {['Ativo', 'Trades', 'Win', 'Loss', 'Assertividade', 'Resultado Total', 'Resultado Médio', 'Melhor Trade', 'Pior Trade'].map((h, i) => (
                  <th key={h} className={`px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-text-muted border-b border-border whitespace-nowrap ${i === 0 ? 'text-left' : 'text-center'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(a => (
                <tr key={a.nome} className="border-t border-border transition-colors hover:bg-bg-hover group">
                  <td className="px-3.5 py-2.5 font-semibold text-[0.875rem] text-text-primary group-hover:text-accent-blue transition-colors">{a.nome}</td>
                  <td className="px-3.5 py-2.5 text-center font-mono font-semibold text-[0.85rem] text-text-secondary">{a.total}</td>
                  <td className="px-3.5 py-2.5 text-center font-mono font-bold text-[0.85rem] text-accent-win">{a.wins}</td>
                  <td className="px-3.5 py-2.5 text-center font-mono font-bold text-[0.85rem] text-accent-loss">{a.losses}</td>
                  <td className={`px-3.5 py-2.5 text-center font-mono font-bold text-[0.85rem] ${a.taxaAcerto >= 0.6 ? 'text-accent-win' : a.taxaAcerto >= 0.4 ? 'text-accent-warn' : 'text-accent-loss'}`}>
                    {fmtPct(a.taxaAcerto)}
                  </td>
                  <td className={`px-3.5 py-2.5 text-center font-mono font-bold text-[0.85rem] ${resultClass(a.resultadoTotal)}`}>
                    {a.resultadoTotal >= 0 ? '+' : ''}{fmtUSD(a.resultadoTotal)}
                  </td>
                  <td className={`px-3.5 py-2.5 text-center font-mono font-bold text-[0.85rem] ${resultClass(a.resultadoMedio)}`}>
                    {a.resultadoMedio >= 0 ? '+' : ''}{fmtUSD(a.resultadoMedio)}
                  </td>
                  <td className="px-3.5 py-2.5 text-center font-mono font-bold text-[0.85rem] text-accent-win">+{fmtUSD(a.melhorTrade)}</td>
                  <td className="px-3.5 py-2.5 text-center font-mono font-bold text-[0.85rem] text-accent-loss">{fmtUSD(a.piorTrade)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
