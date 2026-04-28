import { useEffect, useMemo, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp, Activity, ShieldCheck, Zap, Pencil, Check, X, Loader2 } from 'lucide-react'
import { useAnalyticsStore } from '../../store/analyticsStore'
import IndicadorMes from '../../components/IndicadorMes/IndicadorMes'
import api from '../../services/api'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' }).format(val)

const parseMesAno = (mesAno: string) => {
  const [ano, mes] = mesAno.split('-')
  const date = new Date(parseInt(ano), parseInt(mes) - 1)
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(date)
}

const formatMesAnoExtenso = (mesAno: string) => {
  const [ano, mes] = mesAno.split('-')
  const date = new Date(parseInt(ano), parseInt(mes) - 1)
  const nomeMes = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date)
  return `${nomeMes.charAt(0).toUpperCase()}${nomeMes.slice(1)}/${ano}`
}

export default function ProjecaoAnual() {
  const { projecaoData, dashboardData, isLoading, error, fetchProjecao, fetchDashboard } = useAnalyticsStore()

  // ── Todos os hooks aqui em cima, ANTES de qualquer early return ──
  useEffect(() => {
    fetchProjecao()
    fetchDashboard()
  }, [])

  const [mesesExibir, setMesesExibir] = useState<number>(12)
  type CenarioSaque = 'conservador' | 'realista' | 'agressivo'
  const [cenarioSaque, setCenarioSaque] = useState<CenarioSaque>('conservador')

  // ── Edição inline de aporte/saque ──
  type EditTipo = 'aporte' | 'saque'
  const [editando, setEditando] = useState<{ mes: string; tipo: EditTipo } | null>(null)
  const [editandoValor, setEditandoValor] = useState('')
  const [editandoDia, setEditandoDia] = useState('1')
  const [salvandoEdit, setSalvandoEdit] = useState(false)

  const salvarPlanejado = async (mes: string, tipo: EditTipo, valor: string, diaStr: string) => {
    const endpoint = tipo === 'aporte' ? '/aportes' : '/saques'
    const val = parseFloat(valor)
    const dia = parseInt(diaStr, 10) || 1
    const lista = tipo === 'aporte'
      ? projecaoData?.aportesPlanejados
      : projecaoData?.saquesPlanejados
    const existente = lista?.find(i => i.mes === mes)

    setSalvandoEdit(true)
    try {
      if (isNaN(val) || val <= 0) {
        // Zerar = remover o registro se existir
        if (existente) await api.delete(`${endpoint}/${existente.id}`)
      } else if (existente) {
        await api.patch(`${endpoint}/${existente.id}`, { valor: val, dia })
      } else {
        await api.post(endpoint, { mes, valor: val, dia })
      }
      setEditando(null)
      fetchProjecao()
    } catch (e) {
      console.error('Erro ao salvar planejado', e)
    } finally {
      setSalvandoEdit(false)
    }
  }

  const chartData = useMemo(() => {
    if (!projecaoData?.projecao) return []
    const { conservador, realista, agressivo } = projecaoData.projecao
    if (!conservador?.length) return []
    const fonteViavel = { conservador, realista, agressivo }[cenarioSaque]
    
    // Mapear dias para o tooltip e tabela
    const diasAporte = Object.fromEntries((projecaoData.aportesPlanejados || []).map(a => [a.mes, a.dia]))
    const diasSaque = Object.fromEntries((projecaoData.saquesPlanejados || []).map(a => [a.mes, a.dia]))

    return conservador.map((cons, i) => ({
      mesAno: cons.mes,
      aporte: cons.aporte,
      aporteDia: diasAporte[cons.mes] || 1,
      saquePlanejado: cons.saquePlanejado,
      saqueDia: diasSaque[cons.mes] || 1,
      saqueViavel: fonteViavel[i]?.saqueViavel ?? 0,
      capital_CONS: cons.capitalFinal,
      capital_REAL: realista[i]?.capitalFinal ?? 0,
      capital_AGR: agressivo[i]?.capitalFinal ?? 0,
    }))
  }, [projecaoData, cenarioSaque])

  const dadosFiltrados = useMemo(() => {
    return chartData.slice(0, mesesExibir)
  }, [chartData, mesesExibir])

  // ── Early returns depois dos hooks ──
  if (isLoading && !chartData.length) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin text-[var(--accent-blue)]">
          <Activity size={32} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-red-900/20 rounded-xl border border-red-900/50">
        <p className="text-[var(--accent-loss)] mb-4">{error}</p>
        <button className="btn btn-outline" onClick={() => fetchProjecao()}>Tentar Novamente</button>
      </div>
    )
  }

  if (!projecaoData || !chartData.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-[var(--bg-card)] rounded-xl border border-[var(--border)]">
        <p className="text-[var(--text-muted)] mb-4">Métricas insuficientes para gerar a projeção.</p>
      </div>
    )
  }

  
  const ultimoMes = dadosFiltrados[dadosFiltrados.length - 1] ?? chartData[chartData.length - 1]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const data = payload[0].payload
    return (
      <div className="card shadow-xl p-4 border border-[var(--border-light)] bg-[var(--bg-card)]/90 backdrop-blur-md w-72">
        <p className="text-[var(--text-secondary)] text-sm mb-3 border-b border-[var(--border)] pb-2 font-semibold">
          {parseMesAno(label)}
        </p>

        {/* Capitais */}
        <div className="space-y-1.5 text-sm mb-3">
          <div className="flex justify-between items-center text-[var(--accent-blue)]">
            <span>Conservador:</span>
            <span className="font-bold">{formatCurrency(data.capital_CONS)}</span>
          </div>
          <div className="flex justify-between items-center text-[var(--accent-win)]">
            <span>Realista:</span>
            <span className="font-bold">{formatCurrency(data.capital_REAL)}</span>
          </div>
          <div className="flex justify-between items-center text-[#8b5cf6]">
            <span>Agressivo:</span>
            <span className="font-bold">{formatCurrency(data.capital_AGR)}</span>
          </div>
        </div>

        {/* Movimentações — sempre visível */}
        <div className="pt-2 border-t border-[var(--border)] text-xs space-y-1.5">
          <p className="text-[var(--text-muted)] uppercase tracking-wider mb-1" style={{ fontSize: '10px' }}>
            Movimentações
          </p>
          <div className="flex justify-between items-center">
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              <span style={{ color: 'var(--text-muted)' }}>Aporte (Dia {data.aporteDia}):</span>
            </span>
            <span style={{ color: data.aporte > 0 ? '#4ade80' : 'var(--text-muted)', fontWeight: data.aporte > 0 ? 600 : 400 }}>
              {data.aporte > 0 ? `+${formatCurrency(data.aporte)}` : '—'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f97316', display: 'inline-block' }} />
              <span style={{ color: 'var(--text-muted)' }}>Saque Planejado (Dia {data.saqueDia}):</span>
            </span>
            <span style={{ color: data.saquePlanejado > 0 ? '#fb923c' : 'var(--text-muted)', fontWeight: data.saquePlanejado > 0 ? 600 : 400 }}>
              {data.saquePlanejado > 0 ? `-${formatCurrency(data.saquePlanejado)}` : '—'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#64748b', display: 'inline-block' }} />
              <span style={{ color: 'var(--text-muted)' }}>Saque Viável:</span>
            </span>
            <span style={{ color: data.saqueViavel > 0 ? 'var(--text-secondary)' : 'var(--text-muted)', fontWeight: data.saqueViavel > 0 ? 500 : 400 }}>
              {data.saqueViavel > 0 ? formatCurrency(data.saqueViavel) : '—'}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-slide-in space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400">
          Projeção Anual
        </h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          Simulação de crescimento com base nas taxas de retorno configuradas.
        </p>
      </div>

      {/* Indicador de Desempenho do Mês Atual */}
      {dashboardData?.desempenhoMesAtual && (
        <IndicadorMes
          nivel={dashboardData.desempenhoMesAtual.nivel}
          rentabilidade={dashboardData.desempenhoMesAtual.rentabilidade}
          capitalInicio={dashboardData.desempenhoMesAtual.capitalInicio}
          capitalAtual={dashboardData.desempenhoMesAtual.capitalAtual}
          diasOperados={dashboardData.desempenhoMesAtual.diasOperados}
        />
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Conservador */}
        <div className="card" style={{ borderColor: 'rgba(59,130,246,0.2)', background: 'var(--bg-surface)', position: 'relative', overflow: 'hidden', padding: '1.25rem' }}>
          <div style={{ position: 'relative', zIndex: 10 }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', margin: '0 0 0.5rem', fontWeight: 600 }}>
              Conservador ({formatMesAnoExtenso(ultimoMes.mesAno)})
            </p>
            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-blue)', margin: 0, lineHeight: 1 }}>
              {formatCurrency(ultimoMes.capital_CONS)}
            </p>
          </div>
          <ShieldCheck size={100} strokeWidth={1.5} style={{ position: 'absolute', right: '-15px', bottom: '-20px', color: 'var(--accent-blue)', opacity: 0.1, zIndex: 0 }} />
        </div>

        {/* Realista */}
        <div className="card" style={{ borderColor: 'rgba(74,222,128,0.2)', background: 'var(--bg-surface)', position: 'relative', overflow: 'hidden', padding: '1.25rem' }}>
          <div style={{ position: 'relative', zIndex: 10 }}>
            <p style={{ fontSize: '0.85rem', color: '#4ade80', margin: '0 0 0.5rem', fontWeight: 600 }}>
              Realista ({formatMesAnoExtenso(ultimoMes.mesAno)})
            </p>
            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#4ade80', margin: 0, lineHeight: 1 }}>
              {formatCurrency(ultimoMes.capital_REAL)}
            </p>
          </div>
          <TrendingUp size={100} strokeWidth={1.5} style={{ position: 'absolute', right: '-15px', bottom: '-20px', color: '#4ade80', opacity: 0.1, zIndex: 0 }} />
        </div>

        {/* Agressivo */}
        <div className="card" style={{ borderColor: 'rgba(139,92,246,0.2)', background: 'var(--bg-surface)', position: 'relative', overflow: 'hidden', padding: '1.25rem' }}>
          <div style={{ position: 'relative', zIndex: 10 }}>
            <p style={{ fontSize: '0.85rem', color: '#8b5cf6', margin: '0 0 0.5rem', fontWeight: 600 }}>
              Agressivo ({formatMesAnoExtenso(ultimoMes.mesAno)})
            </p>
            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#8b5cf6', margin: 0, lineHeight: 1 }}>
              {formatCurrency(ultimoMes.capital_AGR)}
            </p>
          </div>
          <Zap size={100} strokeWidth={1.5} style={{ position: 'absolute', right: '-15px', bottom: '-20px', color: '#8b5cf6', opacity: 0.1, zIndex: 0 }} />
        </div>

      </div>

      {/* Resumo de movimentações do período filtrado */}
      {(() => {
        const totalAportes = dadosFiltrados.reduce((s, r) => s + r.aporte, 0)
        const totalSaques  = dadosFiltrados.reduce((s, r) => s + r.saquePlanejado, 0)
        if (totalAportes === 0 && totalSaques === 0) return null
        return (
          <div style={{
            display: 'flex', gap: '0.75rem', flexWrap: 'wrap',
            padding: '0.75rem 1rem', borderRadius: '0.75rem',
            border: '1px solid var(--border)', background: 'var(--bg-card)',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: '0.25rem' }}>
              Nos próximos {mesesExibir} meses
            </span>
            {totalAportes > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '13px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                <span style={{ color: 'var(--text-muted)' }}>Aportes:</span>
                <span style={{ fontWeight: 700, color: '#4ade80' }}>+{formatCurrency(totalAportes)}</span>
              </span>
            )}
            {totalAportes > 0 && totalSaques > 0 && (
              <span style={{ color: 'var(--border)', fontSize: '16px' }}>·</span>
            )}
            {totalSaques > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '13px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316', display: 'inline-block' }} />
                <span style={{ color: 'var(--text-muted)' }}>Saques:</span>
                <span style={{ fontWeight: 700, color: '#fb923c' }}>-{formatCurrency(totalSaques)}</span>
              </span>
            )}
          </div>
        )
      })()}

      {/* Gráfico */}
      <div className="card shadow-2xl">
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Activity size={18} className="text-[var(--text-secondary)]" />
          Comparativo de Cenários
        </h2>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dadosFiltrados} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCons" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-win)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--accent-win)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAgr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="mesAno" tickFormatter={parseMesAno} stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => `$${v}`} tickLine={false} axisLine={false} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} iconType="circle" content={() => (
                <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', fontSize: '0.78rem', paddingBottom: '0.5rem' }}>
                  {[
                    { name: 'Conservador', color: 'var(--accent-blue)' },
                    { name: 'Realista',    color: 'var(--accent-win)' },
                    { name: 'Agressivo',   color: '#8b5cf6' },
                  ].map(item => (
                    <span key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: item.color }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                      {item.name}
                    </span>
                  ))}
                </div>
              )} />
              <Area type="monotone" dataKey="capital_CONS" name="Conservador" stroke="var(--accent-blue)" strokeWidth={2} fillOpacity={1} fill="url(#colorCons)" />
              <Area type="monotone" dataKey="capital_REAL" name="Realista" stroke="var(--accent-win)" strokeWidth={2} fillOpacity={1} fill="url(#colorReal)" />
              <Area type="monotone" dataKey="capital_AGR" name="Agressivo" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorAgr)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden p-0">
        <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-surface)] flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-base font-semibold">Previsão Mensal</h2>
          <div className="flex items-center gap-4 flex-wrap">

            {/* Seletor de cenário para saque viável */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                title="Define o cenário base para cálculo do saque viável."
                style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', cursor: 'help', borderBottom: '1px dashed var(--text-muted)' }}
              >
                Base do Saque
              </span>
              {(['conservador', 'realista', 'agressivo'] as const).map((c) => {
                const cor = c === 'conservador' ? 'var(--accent-blue)' : c === 'realista' ? 'var(--accent-win)' : '#8b5cf6'
                const ativo = cenarioSaque === c
                return (
                  <button key={c} onClick={() => setCenarioSaque(c)} style={{
                    padding: '4px 10px', fontSize: '11px', fontWeight: 600, borderRadius: '6px',
                    border: `1px solid ${ativo ? cor : 'var(--border)'}`,
                    background: ativo ? `${cor}22` : 'transparent',
                    color: ativo ? cor : 'var(--text-muted)',
                    cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize',
                  }}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </button>
                )
              })}
            </div>

            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

            {([3, 6, 12] as const).map((n) => (
              <button
                key={n}
                onClick={() => setMesesExibir(n)}
                style={{
                  padding: '5px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: `1px solid ${mesesExibir === n ? 'var(--accent-blue)' : 'var(--border)'}`,
                  background: mesesExibir === n ? 'var(--accent-blue)' : 'transparent',
                  color: mesesExibir === n ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {n === 3 ? 'Próximos 3 meses' : n === 6 ? 'Próximos 6 meses' : 'Próximos 12 meses'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '13%' }} />
              <col style={{ width: '27%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
            <thead style={{ background: 'var(--bg-surface)' }}>
              <tr>
                {(['Mês', 'Movimentação', 'Conservador', 'Realista', 'Agressivo'] as const).map((label, i) => (
                  <th
                    key={label}
                    style={{
                      padding: '12px 16px',
                      textAlign: i >= 2 ? 'right' : 'left',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: i === 2 ? 'var(--accent-blue)' : i === 3 ? 'var(--accent-win)' : i === 4 ? '#8b5cf6' : 'var(--text-muted)',
                      verticalAlign: 'top',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dadosFiltrados.map((row) => (
                <tr
                  key={row.mesAno}
                  style={{ borderTop: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '12px 16px', verticalAlign: 'top', color: 'var(--text-primary)', fontWeight: 500, fontSize: '14px' }}>
                    {parseMesAno(row.mesAno)}
                  </td>
                  <td style={{ padding: '8px 16px', verticalAlign: 'top', fontSize: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>

                      {/* Aporte editável */}
                      {editando?.mes === row.mesAno && editando.tipo === 'aporte' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', flexShrink: 0, display: 'inline-block' }} />
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Dia:</span>
                          <input
                            type="number" min="1" max="31"
                            value={editandoDia}
                            onChange={e => setEditandoDia(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') salvarPlanejado(row.mesAno, 'aporte', editandoValor, editandoDia)
                              if (e.key === 'Escape') setEditando(null)
                            }}
                            style={{ width: 45, fontSize: '11px', padding: '2px 4px', borderRadius: 4, border: '1px solid var(--accent-blue)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                          />
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>US$:</span>
                          <input
                            type="number" step="0.01" min="0" autoFocus
                            value={editandoValor}
                            onChange={e => setEditandoValor(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') salvarPlanejado(row.mesAno, 'aporte', editandoValor, editandoDia)
                              if (e.key === 'Escape') setEditando(null)
                            }}
                            style={{ width: 80, fontSize: '11px', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--accent-blue)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                          />
                          <button onClick={() => salvarPlanejado(row.mesAno, 'aporte', editandoValor, editandoDia)} disabled={salvandoEdit}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4ade80', padding: 0 }}>
                            {salvandoEdit ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={11} />}
                          </button>
                          <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}><X size={11} /></button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                          className="group" role="button"
                          onClick={() => { setEditando({ mes: row.mesAno, tipo: 'aporte' }); setEditandoValor(row.aporte > 0 ? String(row.aporte) : ''); setEditandoDia(String(row.aporteDia)) }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', flexShrink: 0, display: 'inline-block' }} />
                          <span style={{ color: 'var(--text-muted)' }}>Aporte (Dia {row.aporteDia}):</span>
                          <span style={{ color: row.aporte > 0 ? '#4ade80' : 'var(--text-muted)', fontWeight: row.aporte > 0 ? 600 : 400 }}>
                            {row.aporte > 0 ? `+${formatCurrency(row.aporte)}` : '—'}
                          </span>
                          <Pencil size={9} style={{ color: 'var(--text-muted)', opacity: 0.5, cursor: 'pointer' }} />
                        </div>
                      )}

                      {/* Saque Planejado editável */}
                      {editando?.mes === row.mesAno && editando.tipo === 'saque' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f97316', flexShrink: 0, display: 'inline-block' }} />
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Dia:</span>
                          <input
                            type="number" min="1" max="31"
                            value={editandoDia}
                            onChange={e => setEditandoDia(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') salvarPlanejado(row.mesAno, 'saque', editandoValor, editandoDia)
                              if (e.key === 'Escape') setEditando(null)
                            }}
                            style={{ width: 45, fontSize: '11px', padding: '2px 4px', borderRadius: 4, border: '1px solid #f97316', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                          />
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>US$:</span>
                          <input
                            type="number" step="0.01" min="0" autoFocus
                            value={editandoValor}
                            onChange={e => setEditandoValor(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') salvarPlanejado(row.mesAno, 'saque', editandoValor, editandoDia)
                              if (e.key === 'Escape') setEditando(null)
                            }}
                            style={{ width: 80, fontSize: '11px', padding: '2px 6px', borderRadius: 4, border: '1px solid #f97316', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                          />
                          <button onClick={() => salvarPlanejado(row.mesAno, 'saque', editandoValor, editandoDia)} disabled={salvandoEdit}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fb923c', padding: 0 }}>
                            {salvandoEdit ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={11} />}
                          </button>
                          <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}><X size={11} /></button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                          role="button"
                          onClick={() => { setEditando({ mes: row.mesAno, tipo: 'saque' }); setEditandoValor(row.saquePlanejado > 0 ? String(row.saquePlanejado) : ''); setEditandoDia(String(row.saqueDia)) }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f97316', flexShrink: 0, display: 'inline-block' }} />
                          <span style={{ color: 'var(--text-muted)' }}>Saque (Dia {row.saqueDia}):</span>
                          <span style={{ color: row.saquePlanejado > 0 ? '#fb923c' : 'var(--text-muted)', fontWeight: row.saquePlanejado > 0 ? 600 : 400 }}>
                            {row.saquePlanejado > 0 ? `-${formatCurrency(row.saquePlanejado)}` : '—'}
                          </span>
                          <Pencil size={9} style={{ color: 'var(--text-muted)', opacity: 0.5, cursor: 'pointer' }} />
                        </div>
                      )}

                      {/* Saque Viável — somente leitura */}
                      {row.saqueViavel > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#64748b', flexShrink: 0, display: 'inline-block' }} />
                          <span style={{ color: 'var(--text-muted)' }}>Saque Viável:</span>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{formatCurrency(row.saqueViavel)}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  <td style={{ padding: '12px 16px', verticalAlign: 'top', textAlign: 'right', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '14px' }}>{formatCurrency(row.capital_CONS)}</td>
                  <td style={{ padding: '12px 16px', verticalAlign: 'top', textAlign: 'right', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '14px' }}>{formatCurrency(row.capital_REAL)}</td>
                  <td style={{ padding: '12px 16px', verticalAlign: 'top', textAlign: 'right', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '14px' }}>{formatCurrency(row.capital_AGR)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
