import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Activity, DollarSign, Target, TrendingUp, TrendingDown, Calendar, ArrowRight, Wallet, BarChart2 } from 'lucide-react'
import { useAnalyticsStore } from '../../store/analyticsStore'
import IndicadorMes from '../../components/IndicadorMes/IndicadorMes'

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' }).format(val)
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  // timeZone: 'UTC' evita que datas armazenadas como UTC midnight virem
  // o dia anterior no fuso de Brasília (-3h)
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date)
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { dashboardData, isLoading, error, fetchDashboard } = useAnalyticsStore()

  useEffect(() => {
    fetchDashboard()
  }, [])

  if (isLoading && !dashboardData) {
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
        <button className="btn btn-outline" onClick={() => fetchDashboard()}>Tentar Novamente</button>
      </div>
    )
  }

  if (!dashboardData) return null

  const { indicadores: _ind, desempenhoMesAtual, diaEmAndamento, evolucaoCapital, semanas } = dashboardData

  // Garante fallback para campos novos — usa ?? para proteger inclusive contra undefined explícito
  const ind = (_ind ?? {}) as any
  const indicadores = {
    ..._ind,
    crescimentoPct:        ind.crescimentoPct        ?? 0,
    mediaLucroDia:         ind.mediaLucroDia         ?? 0,
    mediaRentabilidade:    ind.mediaRentabilidade     ?? 0,
    totalAportes:          ind.totalAportes           ?? 0,
    totalSaques:           ind.totalSaques            ?? 0,
    pctDiasPositivos:      ind.pctDiasPositivos       ?? 0,
    maiorSequenciaPositiva: ind.maiorSequenciaPositiva ?? 0,
    maiorSequenciaNegativa: ind.maiorSequenciaNegativa ?? 0,
    totalGanhos:           ind.totalGanhos            ?? 0,
    totalPerdas:           ind.totalPerdas            ?? 0,
    ultimoCapital:         ind.ultimoCapital          ?? 0,
    lucroTotal:            ind.lucroTotal             ?? 0,
    taxaAcertoGeral:       ind.taxaAcertoGeral        ?? 0,
    diasOperados:          ind.diasOperados           ?? 0,
    diasPositivos:         ind.diasPositivos          ?? 0,
    maiorGain:             ind.maiorGain              ?? 0,
    maiorLoss:             ind.maiorLoss              ?? 0,
  }

  const formatDateShort = (dateStr: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d)
  }

  const semanasComLabel = (semanas ?? []).map((s: any) => ({
    ...s,
    label: s.dataInicial && s.dataFinal
      ? `${formatDateShort(s.dataInicial)} a ${formatDateShort(s.dataFinal)}`
      : '',
  }))

  const formatDiaAndamento = (data: string) => {
    const [ano, mes, dia] = data.split('T')[0].split('-').map(Number)
    const d = new Date(ano, mes - 1, dia)
    return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(d)
  }

  // Tooltip customizado Recharts
  const CustomTooltipContent = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0]?.payload
      const isDiario  = p?.totalTrades != null
      const isSemanal = p?.totalWin != null
      const totalOpsSemanal = isSemanal ? (p.totalWin ?? 0) + (p.totalLoss ?? 0) : 0
      return (
        <div className="card shadow-xl p-3 border border-[var(--border-light)] bg-[var(--bg-card)]/90 backdrop-blur-md" style={{ minWidth: 160 }}>
          <p className="text-[var(--text-secondary)] text-sm mb-2">{isSemanal ? label : formatDate(label)}</p>
          {payload.map((entry: any, i: number) => (
            <div key={i}>
              <p className="text-sm font-semibold" style={{ color: entry.color || entry.fill }}>
                {entry.name === 'Capital' || entry.name === 'Resultado'
                  ? formatCurrency(entry.value)
                  : entry.name === 'Assertividade'
                    ? `${(entry.value * 100).toFixed(1)}%`
                    : entry.value}
              </p>
              {entry.name === 'Resultado' && p?.rentabilidade != null && p.rentabilidade !== 0 && (
                <p className="text-xs" style={{ color: entry.color || entry.fill, opacity: 0.75, marginTop: '2px' }}>
                  {(p.rentabilidade * 100).toFixed(2)}% do capital
                </p>
              )}
            </div>
          ))}
          {isDiario && p.totalTrades > 0 && (
            <div className="mt-2 pt-2 border-t border-[var(--border)] flex flex-col gap-0.5">
              <p className="text-xs text-[var(--text-muted)]">
                Operações: <span className="font-semibold text-[var(--text-primary)]">{p.totalTrades}</span>
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Assertividade: <span className="font-semibold text-[var(--accent-warn)]">{(p.taxaAcerto * 100).toFixed(1)}%</span>
              </p>
            </div>
          )}
          {isSemanal && totalOpsSemanal > 0 && (
            <div className="mt-2 pt-2 border-t border-[var(--border)] flex flex-col gap-0.5">
              <p className="text-xs text-[var(--text-muted)]">
                Operações: <span className="font-semibold text-[var(--text-primary)]">{totalOpsSemanal}</span>
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Assertividade: <span className="font-semibold text-[var(--accent-warn)]">{(p.taxaAcerto * 100).toFixed(1)}%</span>
              </p>
            </div>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div className="animate-slide-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400">
            Dashboard
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Acompanhamento consolidado de dias fechados.</p>
        </div>
        <button className="btn btn-primary bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg shadow-blue-500/20" onClick={() => navigate('/painel-dia')}>
          <span>Ir para Painel do Dia</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Banner: Dia em andamento */}
      {diaEmAndamento && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.625rem 1rem', borderRadius: '0.625rem',
          background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)',
          fontSize: '0.82rem', color: 'var(--text-secondary)',
        }}>
          <span style={{ fontSize: '1rem' }}>🕐</span>
          <div>
            <span style={{ fontWeight: 600, color: '#fbbf24' }}>Dia atual em andamento </span>
            <span style={{ color: 'var(--text-muted)' }}>
              ({formatDiaAndamento(diaEmAndamento.data)}) — não incluído nos resultados acima
            </span>
          </div>
        </div>
      )}

      {/* Card de destaque: Banca Atual */}

      <div className="relative overflow-hidden rounded-2xl border border-[var(--border-light)] p-6" style={{
        background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(16,185,129,0.08) 100%)',
        boxShadow: '0 0 40px rgba(59,130,246,0.08)',
      }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #3b82f6 0%, transparent 60%)' }} />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-1">Banca Atual</p>
            <p className="text-4xl font-extrabold tracking-tight" style={{ color: 'var(--accent-win)', textShadow: '0 0 30px rgba(16,185,129,0.3)' }}>
              {formatCurrency(indicadores.ultimoCapital)}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Capital do último dia fechado
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[var(--text-muted)]">Lucro total:</span>
              <span className={`font-bold ${indicadores.lucroTotal >= 0 ? 'text-[var(--accent-win)]' : 'text-[var(--accent-loss)]'}`}>
                {indicadores.lucroTotal >= 0 ? '+' : ''}{formatCurrency(indicadores.lucroTotal)}
              </span>
              {indicadores.crescimentoPct !== 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${indicadores.crescimentoPct >= 0 ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                  {indicadores.crescimentoPct >= 0 ? '+' : ''}{(indicadores.crescimentoPct * 100).toFixed(1)}%
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[var(--text-muted)]">Assertividade:</span>
              <span className="font-bold text-[var(--text-primary)]">{(indicadores.taxaAcertoGeral * 100).toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[var(--text-muted)]">Dias operados:</span>
              <span className="font-bold text-[var(--text-primary)]">{indicadores.diasOperados} ({indicadores.diasPositivos} positivos)</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card: Lucro Total */}
        <div className="card card-hover relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign size={48} className="text-[var(--accent-blue)]" />
          </div>
          <p className="text-[var(--text-secondary)] text-sm font-medium mb-1">Lucro Total</p>
          <p className={`text-2xl font-bold ${indicadores.lucroTotal >= 0 ? 'text-[var(--accent-win)]' : 'text-[var(--accent-loss)]'}`}>
            {formatCurrency(indicadores.lucroTotal)}
          </p>
          {indicadores.crescimentoPct !== 0 && (
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Crescimento:{' '}
              <span className={indicadores.crescimentoPct >= 0 ? 'text-[var(--accent-win)]' : 'text-[var(--accent-loss)]'}>
                {indicadores.crescimentoPct >= 0 ? '+' : ''}{(indicadores.crescimentoPct * 100).toFixed(1)}% sobre capital inicial
              </span>
            </p>
          )}
        </div>

        {/* Card: Dias Operados */}
        <div className="card card-hover relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Calendar size={48} className="text-[var(--text-primary)]" />
          </div>
          <p className="text-[var(--text-secondary)] text-sm font-medium mb-1">Dias Operados</p>
          <div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {indicadores.diasOperados}
              <span className="text-sm font-normal text-[var(--text-muted)] ml-2 border-l border-[var(--border)] pl-2">
                {indicadores.diasPositivos} positivos ({(indicadores.pctDiasPositivos * 100).toFixed(1)}%)
              </span>
            </p>
            <div className="mt-2 flex h-1.5 w-full bg-[var(--bg-surface)] rounded-full overflow-hidden">
              <div className="bg-[var(--accent-win)]" style={{ width: `${indicadores.pctDiasPositivos * 100}%` }} />
            </div>
            {indicadores.maiorSequenciaPositiva > 0 && (
              <p className="text-xs text-[var(--text-muted)] mt-1.5">
                Maior seq. positiva: <span className="text-[var(--accent-win)] font-semibold">{indicadores.maiorSequenciaPositiva}d</span>
                {indicadores.maiorSequenciaNegativa > 0 && (
                  <> · Maior seq. negativa: <span className="text-[var(--accent-loss)] font-semibold">{indicadores.maiorSequenciaNegativa}d</span></>
                )}
              </p>
            )}
          </div>

        </div>

        {/* Card: Recordes e Totais */}
        <div className="card card-hover flex flex-col justify-center">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-[var(--text-secondary)]">Melhor Dia</span>
            <span className="text-sm font-bold text-[var(--accent-win)] flex items-center gap-1">
              <TrendingUp size={14} />
              {formatCurrency(indicadores.maiorGain)}
            </span>
          </div>
          <div className="flex justify-between items-center border-t border-[var(--border)] pt-2 mb-2">
            <span className="text-sm text-[var(--text-secondary)]">Pior Dia</span>
            <span className={`text-sm font-bold flex items-center gap-1 ${indicadores.maiorLoss >= 0 ? 'text-[var(--accent-win)]' : 'text-[var(--accent-loss)]'}`}>
              <TrendingDown size={14} />
              {formatCurrency(indicadores.maiorLoss)}
            </span>
          </div>
          <div className="flex justify-between items-center border-t border-[var(--border)] pt-2 mb-2">
            <span className="text-sm text-[var(--text-secondary)]">Total Ganhos</span>
            <span className="text-sm font-bold text-[var(--accent-win)]">+{formatCurrency(indicadores.totalGanhos)}</span>
          </div>
          <div className="flex justify-between items-center border-t border-[var(--border)] pt-2">
            <span className="text-sm text-[var(--text-secondary)]">Total Perdas</span>
            <span className="text-sm font-bold text-[var(--accent-loss)]">{formatCurrency(indicadores.totalPerdas)}</span>
          </div>
        </div>

        {/* Card: Taxa de Acerto Geral */}
        <div className="card card-hover relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Target size={48} className="text-[var(--accent-warn)]" />
          </div>
          <p className="text-[var(--text-secondary)] text-sm font-medium mb-1">Assertividade (Global)</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {(indicadores.taxaAcertoGeral * 100).toFixed(1)}%
          </p>
        </div>

        {/* Card: Média de Lucro por Dia */}
        <div className="card card-hover relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <BarChart2 size={48} className="text-[var(--accent-blue)]" />
          </div>
          <p className="text-[var(--text-secondary)] text-sm font-medium mb-1">Média por Dia</p>
          <p className={`text-2xl font-bold ${indicadores.mediaLucroDia >= 0 ? 'text-[var(--accent-win)]' : 'text-[var(--accent-loss)]'}`}>
            {formatCurrency(indicadores.mediaLucroDia)}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Rentabilidade média:{' '}
            <span className={indicadores.mediaRentabilidade >= 0 ? 'text-[var(--accent-win)]' : 'text-[var(--accent-loss)]'}>
              {(indicadores.mediaRentabilidade * 100).toFixed(2)}% / dia
            </span>
          </p>
        </div>

        {/* Card: Aportes e Saques */}
        <div className="card card-hover relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet size={48} className="text-[var(--accent-warn)]" />
          </div>
          <p className="text-[var(--text-secondary)] text-sm font-medium mb-2">Movimentações Realizadas</p>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-[var(--text-muted)]">Aportes</span>
            <span className="text-sm font-bold text-[var(--accent-win)]">+{formatCurrency(indicadores.totalAportes)}</span>
          </div>
          <div className="flex justify-between items-center border-t border-[var(--border)] pt-1">
            <span className="text-sm text-[var(--text-muted)]">Saques</span>
            <span className="text-sm font-bold text-[var(--accent-loss)]">-{formatCurrency(indicadores.totalSaques)}</span>
          </div>
        </div>
      </div>

      {/* Indicador de Desempenho do Mês Atual */}
      {desempenhoMesAtual && (
        <IndicadorMes
          nivel={desempenhoMesAtual.nivel}
          rentabilidade={desempenhoMesAtual.rentabilidade}
          capitalInicio={desempenhoMesAtual.capitalInicio}
          capitalAtual={desempenhoMesAtual.capitalAtual}
          diasOperados={desempenhoMesAtual.diasOperados}
          compact
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico: Evolução do Capital */}
        <div className="card col-span-1 lg:col-span-2 shadow-lg">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-[var(--accent-blue)]" />
            Evolução do Capital
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolucaoCapital ?? []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis 
                  dataKey="data" 
                  tickFormatter={formatDate}
                  stroke="var(--text-muted)" 
                  fontSize={12} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="var(--text-muted)" 
                  fontSize={12}
                  tickFormatter={(val) => `$${val}`}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                />
                <Tooltip content={<CustomTooltipContent />} />
                <Area 
                  type="monotone" 
                  dataKey="capital" 
                  name="Capital"
                  stroke="var(--accent-blue)" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorCapital)" 
                  activeDot={{ r: 6, strokeWidth: 0, fill: "var(--accent-blue)" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico: Resultado Diário */}
        <div className="card shadow-lg">
          <h2 className="text-lg font-semibold mb-4">Desempenho Diário</h2>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(evolucaoCapital ?? []).slice(-10)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="data" tickFormatter={formatDate} stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(val) => `$${val}`} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltipContent />} cursor={{ fill: 'var(--bg-hover)' }} />
                <Bar dataKey="resultado" name="Resultado" radius={[4, 4, 0, 0]}>
                  {(evolucaoCapital ?? []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.resultado >= 0 ? 'var(--accent-win)' : 'var(--accent-loss)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico: Desempenho Semanal */}
        <div className="card shadow-lg">
          <h2 className="text-lg font-semibold mb-4">Desempenho Semanal</h2>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={semanasComLabel.slice(-8)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickFormatter={(v) => v}
                  stroke="var(--text-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={12}
                  tickFormatter={(val) => `$${val}`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltipContent />} cursor={{ fill: 'var(--bg-hover)' }} />
                <Bar dataKey="lucroTotal" name="Resultado" radius={[4, 4, 0, 0]}>
                  {semanasComLabel.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.lucroTotal >= 0 ? 'var(--accent-win)' : 'var(--accent-loss)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
