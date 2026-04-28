import React, { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../../../services/api'
import { Filtro, buildParams, fmtUSD, TooltipEscuro } from './RelatoriosShared'

interface ErroItem2 {
  nome: string
  gravidade: 'LEVE' | 'GRAVE'
  ocorrencias: number
  pctDias: number
  mediaResultadoCom: number
  mediaResultadoSem: number
  impactoPorOcorrencia: number
  impactoTotal: number
}

interface ErrosData {
  erros: ErroItem2[]
  totalDias: number
  mediaGeral: number
}

export default function AbaErros({ filtro }: { filtro: Filtro }) {
  const [data, setData]     = useState<ErrosData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    setLoading(true); setData(null); setError('')
    api.get('/relatorios/erros', { params: buildParams(filtro) })
      .then(r => setData(r.data))
      .catch(() => setError('Erro ao carregar relatório.'))
      .finally(() => setLoading(false))
  }, [filtro])

  if (loading) return <div className="flex justify-center p-16"><Activity size={28} className="text-accent-blue animate-spin" /></div>
  if (error)   return <div className="p-8 text-center text-accent-loss">{error}</div>
  if (!data || data.erros.length === 0) return (
    <div className="p-16 text-center text-text-muted">
      Nenhum erro registrado nos dias fechados.
    </div>
  )

  const { erros, mediaGeral } = data
  const maisFrequente  = erros.reduce((a, b) => b.ocorrencias > a.ocorrencias ? b : a)
  const maisImpactante = erros[0] // já ordenado por impactoTotal desc
  const impactoTotalGeral = erros.reduce((s, e) => s + e.impactoTotal, 0)

  // Para o gráfico: top 8 por impacto
  const chartData = erros.slice(0, 8).map(e => ({
    nome: e.nome.length > 18 ? e.nome.slice(0, 16) + '…' : e.nome,
    nomeCompleto: e.nome,
    impacto: parseFloat(e.impactoTotal.toFixed(2)),
    ocorrencias: e.ocorrencias,
  }))

  return (
    <div className="flex flex-col gap-6">

      {/* Cards resumo */}
      <div className="grid grid-cols-3 gap-3.5">
        <div className="card border-[#f43f5e]/30 bg-[#f43f5e]/5 backdrop-blur-sm">
          <p className="text-[0.72rem] text-text-muted font-bold uppercase tracking-wider mb-1.5">Impacto Total Estimado</p>
          <p className="text-2xl font-extrabold text-[#f43f5e] m-0 tracking-tight">
            {impactoTotalGeral >= 0 ? '+' : ''}{fmtUSD(impactoTotalGeral)}
          </p>
          <p className="text-[0.72rem] text-text-muted mt-1">soma do custo estimado de todos os erros</p>
        </div>
        <div className="card border-border backdrop-blur-sm bg-bg-card/80">
          <p className="text-[0.72rem] text-text-muted font-bold uppercase tracking-wider mb-1.5">Erro Mais Frequente</p>
          <p className="text-[1.1rem] font-bold text-text-primary m-0 truncate">{maisFrequente.nome}</p>
          <p className="text-[0.78rem] text-text-muted mt-1">
            <span className="font-bold text-text-primary">{maisFrequente.ocorrencias}x</span> — {(maisFrequente.pctDias * 100).toFixed(0)}% dos dias
          </p>
        </div>
        <div className="card border-[#fb923c]/30 bg-[#fb923c]/5 backdrop-blur-sm">
          <p className="text-[0.72rem] text-text-muted font-bold uppercase tracking-wider mb-1.5">Erro Mais Custoso</p>
          <p className="text-[1.1rem] font-bold text-[#fb923c] m-0 truncate">{maisImpactante.nome}</p>
          <p className="text-[0.78rem] text-text-muted mt-1">
            <span className="font-bold text-[#fb923c]">{fmtUSD(maisImpactante.impactoPorOcorrencia)}</span> por ocorrência
          </p>
        </div>
      </div>

      {/* Gráfico + tabela */}
      <div className="grid grid-cols-2 gap-5">

        {/* Gráfico: impacto por erro */}
        <div className="card border border-border backdrop-blur-sm bg-bg-card/80">
          <h2 className="text-sm font-bold text-text-primary m-0 mb-5">
            Impacto Total por Erro (Top 8)
          </h2>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} opacity={0.5} />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickFormatter={v => fmtUSD(v)} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="nome" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} width={120} />
                <Tooltip
                  content={<TooltipEscuro labelKey="nomeCompleto" />}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Bar dataKey="impacto" name="Impacto (US$)" fill="#f43f5e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico: frequência */}
        <div className="card border border-border backdrop-blur-sm bg-bg-card/80">
          <h2 className="text-sm font-bold text-text-primary m-0 mb-5">
            Frequência por Erro (Top 8)
          </h2>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} opacity={0.5} />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="nome" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} width={120} />
                <Tooltip
                  content={<TooltipEscuro labelKey="nomeCompleto" />}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Bar dataKey="ocorrencias" name="Ocorrências" fill="var(--accent-warn)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabela detalhada */}
      <div className="card p-0 overflow-hidden border border-border backdrop-blur-sm bg-bg-card/50">
        <div className="px-5 py-3.5 border-b border-border bg-bg-surface/50 flex justify-between items-center flex-wrap gap-2">
          <h2 className="text-sm font-bold text-text-primary m-0">Detalhamento por Erro</h2>
          <span className="text-xs text-text-muted">
            Média geral dos dias: <span className={`font-bold ml-1 ${mediaGeral >= 0 ? 'text-accent-win' : 'text-accent-loss'}`}>{mediaGeral >= 0 ? '+' : ''}{fmtUSD(mediaGeral)}</span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
              <tr>
                {['Erro', 'Ocorrências', '% dos dias', 'Média c/ erro', 'Média s/ erro', 'Custo/ocorrência', 'Impacto Total'].map((h, i) => (
                  <th key={h} className={`px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-text-muted border-b border-border whitespace-nowrap ${i === 0 ? 'text-left' : 'text-center'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {erros.map((e, i) => (
                <tr key={i} className="border-t border-border transition-colors hover:bg-bg-hover group">
                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[0.85rem] text-text-primary font-medium group-hover:text-accent-blue transition-colors">{e.nome}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[0.6rem] font-bold uppercase tracking-wider ${e.gravidade === 'GRAVE' ? 'bg-[#f43f5e]/15 text-[#f43f5e] border border-[#f43f5e]/30' : 'bg-accent-warn/15 text-accent-warn border border-accent-warn/30'}`}>
                        {e.gravidade === 'GRAVE' ? 'Grave' : 'Leve'}
                      </span>
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5 text-center text-[0.85rem] font-mono font-bold text-text-primary">{e.ocorrencias}x</td>
                  <td className="px-3.5 py-2.5 text-center text-[0.85rem] font-mono text-text-secondary">{(e.pctDias * 100).toFixed(0)}%</td>
                  <td className={`px-3.5 py-2.5 text-center text-[0.85rem] font-mono font-bold ${e.mediaResultadoCom >= 0 ? 'text-accent-win' : 'text-accent-loss'}`}>
                    {e.mediaResultadoCom >= 0 ? '+' : ''}{fmtUSD(e.mediaResultadoCom)}
                  </td>
                  <td className={`px-3.5 py-2.5 text-center text-[0.85rem] font-mono font-bold ${e.mediaResultadoSem >= 0 ? 'text-accent-win' : 'text-accent-loss'}`}>
                    {e.mediaResultadoSem >= 0 ? '+' : ''}{fmtUSD(e.mediaResultadoSem)}
                  </td>
                  <td className="px-3.5 py-2.5 text-center text-[0.85rem] font-mono font-bold text-[#fb923c]">
                    {e.impactoPorOcorrencia >= 0 ? '+' : ''}{fmtUSD(e.impactoPorOcorrencia)}
                  </td>
                  <td className="px-3.5 py-2.5 text-center text-[0.85rem] font-mono font-bold text-[#f43f5e]">
                    {e.impactoTotal >= 0 ? '+' : ''}{fmtUSD(e.impactoTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
