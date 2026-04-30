import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Activity, DollarSign, Target, TrendingUp, TrendingDown, Calendar, ArrowRight, Wallet, BarChart2 } from 'lucide-react'
import { useAnalyticsStore } from '../../store/analyticsStore'
import { useCapitalStore } from '../../store/capitalStore'
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
  const { capital, fetchCapital } = useCapitalStore()

  useEffect(() => {
    fetchDashboard()
    if (!capital) fetchCapital()
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
    sequenciaAtualGlobal:   ind.sequenciaAtualGlobal   ?? 0,
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
          {/* Evolução de Capital Extras (Aportes/Saques) */}
          {p.capital !== undefined && (p.aportes > 0 || p.saques > 0) && (
            <div className="mt-2 pt-2 border-t border-[var(--border)] flex flex-col gap-0.5">
              {p.aportes > 0 && (
                <p className="text-xs text-[var(--text-muted)] flex justify-between items-center gap-4">
                  Aportes: <span className="font-semibold text-[var(--accent-win)]">+{formatCurrency(p.aportes)}</span>
                </p>
              )}
              {p.saques > 0 && (
                <p className="text-xs text-[var(--text-muted)] flex justify-between items-center gap-4">
                  Saques: <span className="font-semibold text-[var(--accent-loss)]">-{formatCurrency(p.saques)}</span>
                </p>
              )}
            </div>
          )}

          {isDiario && p.totalTrades > 0 && (
            <div className="mt-2 pt-2 border-t border-[var(--border)] flex flex-col gap-0.5">
              <p className="text-xs text-[var(--text-muted)] flex justify-between items-center gap-4">
                Operações: <span className="font-semibold text-[var(--text-primary)]">{p.totalTrades}</span>
              </p>
              <p className="text-xs text-[var(--text-muted)] flex justify-between items-center gap-4">
                Assertividade: <span className="font-semibold text-[var(--accent-warn)]">{(p.taxaAcerto * 100).toFixed(1)}%</span>
              </p>
            </div>
          )}
          {isSemanal && totalOpsSemanal > 0 && (
            <div className="mt-2 pt-2 border-t border-[var(--border)] flex flex-col gap-0.5">
              <p className="text-xs text-[var(--text-muted)] flex justify-between items-center gap-4">
                Operações: <span className="font-semibold text-[var(--text-primary)]">{totalOpsSemanal}</span>
              </p>
              <p className="text-xs text-[var(--text-muted)] flex justify-between items-center gap-4">
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
              ({formatDiaAndamento(diaEmAndamento.data)}) — não incluído nos resultados abaixo
            </span>
          </div>
        </div>
      )}

      {/* Indicador de Desempenho do Mês Atual (Movido para o topo a pedido) */}
      {desempenhoMesAtual && (
        <div className="mb-4">
          <IndicadorMes
            nivel={desempenhoMesAtual.nivel}
            rentabilidade={desempenhoMesAtual.rentabilidade}
            capitalInicio={desempenhoMesAtual.capitalInicio}
            capitalAtual={desempenhoMesAtual.capitalAtual}
            lucroMes={desempenhoMesAtual.lucroMes}
            diasOperados={desempenhoMesAtual.diasOperados}
            compact
          />
        </div>
      )}

      {/* Header Metrics */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        
        {/* Banca Global - HIGH HIGHLIGHT */}
        <div className="flex-[2] relative overflow-hidden rounded-2xl border border-blue-500/30 p-8 flex flex-col justify-center" style={{
          background: 'linear-gradient(135deg, rgba(8,14,33,0.8) 0%, rgba(13,25,56,0.9) 100%)',
          boxShadow: '0 0 50px rgba(59,130,246,0.15)',
        }}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 100% 0%, #3b82f6 0%, transparent 60%)' }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Wallet size={18} className="text-blue-400" />
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">Banca Total Consolidada</p>
            </div>
            <div className="flex items-center gap-4 mb-2">
              <p className="text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-0" style={{ textShadow: '0 0 40px rgba(59,130,246,0.4)' }}>
                {capital ? formatCurrency(capital.bancaGlobalUSD) : '...'}
              </p>
            </div>
            <p className="text-xs font-medium text-blue-200/60 mt-1 tracking-widest uppercase">
              BASE DE CÁLCULO PARA METAS E RISCO GLOBAL
            </p>
          </div>
        </div>

        {/* Sub-Contas Stack */}
        <div className="flex-1 flex flex-col gap-4">
          
          {/* Corretora */}
          <div className="flex-1 card relative overflow-hidden flex flex-col justify-center p-5">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <BarChart2 size={40} className="text-blue-500" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-1">Mercado (Corretora)</p>
            <p className="text-2xl font-bold text-blue-400">
              {capital ? formatCurrency(capital.capitalCorretoraUSD) : '...'}
            </p>
            <p className="text-[10px] font-medium text-[var(--text-muted)] mt-1 uppercase tracking-wide">
              Operacional em Dólar
            </p>
          </div>

          {/* Reserva */}
          <div className="flex-1 card relative overflow-hidden flex flex-col justify-center p-5">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <DollarSign size={40} className="text-emerald-500" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-1">Caixa (Reserva BRL)</p>
            <div className="flex items-center gap-3">
              <p className="text-2xl font-bold text-emerald-400">
                {capital ? formatCurrency(capital.saldoReservaBRL / capital.cambioConsiderado) : '...'}
              </p>
              <div className="h-6 w-px bg-[var(--border)]"></div>
              <p className="text-sm font-bold text-[var(--text-secondary)]">
                R$ {capital ? capital.saldoReservaBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}
              </p>
            </div>
            <p className="text-[10px] font-medium text-[var(--text-muted)] mt-1.5 uppercase tracking-wide">
              Câmbio Utilizado: <span className="text-[var(--text-primary)] font-bold">R$ {capital?.cambioConsiderado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </p>
          </div>
          
        </div>
      </div>

      {/* Stat Bar (Painel 2) - KPIs Críticos Consolidados */}
      <div className="flex flex-col md:flex-row flex-wrap gap-8 items-center bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-6 mb-6 shadow-sm">
        
        {/* Lucro Histórico */}
        <div className="flex-1 flex flex-col min-w-[200px]">
          <p className="text-[10px] font-bold uppercase tracking-[0.10em] text-[var(--text-secondary)] mb-2 flex items-center gap-1">
            <TrendingUp size={12} className="text-[var(--accent-blue)]" /> Lucro Histórico
          </p>
          <div className="flex items-end gap-3 mb-1">
            <p className={`text-3xl font-extrabold tracking-tight ${indicadores.lucroTotal >= 0 ? 'text-[var(--accent-win)]' : 'text-[var(--accent-loss)]'}`}>
              {(indicadores.lucroTotal >= 0 ? '+' : '')}{formatCurrency(indicadores.lucroTotal)}
            </p>
            {indicadores.crescimentoPct !== 0 && (
              <div className={`px-2 py-1 rounded-md text-sm font-black mb-1 flex items-center gap-1 ${
                indicadores.crescimentoPct >= 0 
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}>
                {indicadores.crescimentoPct >= 0 ? '+' : ''}{(indicadores.crescimentoPct * 100).toFixed(2)}%
              </div>
            )}
          </div>
        </div>

        <div className="hidden md:block w-px h-16 bg-[var(--border)]"></div>

        {/* Assertividade Global */}
        <div className="flex-1 flex flex-col min-w-[150px]">
          <p className="text-[10px] font-bold uppercase tracking-[0.10em] text-[var(--text-secondary)] mb-2 flex items-center gap-1">
            <Target size={12} className="text-[var(--accent-warn)]" /> Assertividade
          </p>
          <p className="text-3xl font-bold text-[var(--text-primary)]">
            {(indicadores.taxaAcertoGeral * 100).toFixed(1)}%
          </p>
        </div>

        <div className="hidden md:block w-px h-16 bg-[var(--border)]"></div>

        {/* Média por Dia */}
        <div className="flex-1 flex flex-col min-w-[150px]">
          <p className="text-[10px] font-bold uppercase tracking-[0.10em] text-[var(--text-secondary)] mb-2 flex items-center gap-1">
            <BarChart2 size={12} className="text-[var(--text-muted)]" /> Média / Dia
          </p>
          <p className={`text-3xl font-bold ${indicadores.mediaLucroDia >= 0 ? 'text-[var(--accent-win)]' : 'text-[var(--accent-loss)]'}`}>
            {formatCurrency(indicadores.mediaLucroDia)}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
            <span className={indicadores.mediaRentabilidade >= 0 ? 'text-[var(--accent-win)]' : 'text-[var(--accent-loss)]'}>
              {(indicadores.mediaRentabilidade * 100).toFixed(2)}%
            </span>
          </p>
        </div>

        <div className="hidden md:block w-px h-16 bg-[var(--border)]"></div>

        {/* Dias Operados compact */}
        <div className="flex-1 flex flex-col min-w-[180px]">
          <p className="text-[10px] font-bold uppercase tracking-[0.10em] text-[var(--text-secondary)] mb-2 flex items-center gap-1">
            <Calendar size={12} /> Dias Operados
          </p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {indicadores.diasOperados} totais
          </p>
          <div className="mt-2 flex h-1 w-full bg-[var(--bg-hover)] rounded-full overflow-hidden">
            <div className="bg-[var(--accent-win)]" style={{ width: `${indicadores.pctDiasPositivos * 100}%` }} />
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1.5 font-medium">
            <span className="text-[var(--accent-win)] font-bold">{indicadores.diasPositivos} positivos</span> ({(indicadores.pctDiasPositivos * 100).toFixed(1)}%)
          </p>
        </div>

        <div className="hidden md:block w-px h-16 bg-[var(--border)]"></div>

        {/* Sequência Atual e Recorde */}
        <div className="flex-1 flex flex-col min-w-[150px]">
          <p className="text-[10px] font-bold uppercase tracking-[0.10em] text-[var(--text-secondary)] mb-2 flex items-center gap-1">
            <Activity size={12} className={indicadores.sequenciaAtualGlobal >= 0 ? 'text-[var(--accent-win)]' : 'text-[var(--accent-loss)]'} /> Sequência Atual
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className={`text-3xl font-bold ${indicadores.sequenciaAtualGlobal > 0 ? 'text-[var(--accent-win)]' : indicadores.sequenciaAtualGlobal < 0 ? 'text-[var(--accent-loss)]' : 'text-[var(--text-muted)]'}`}>
              {Math.abs(indicadores.sequenciaAtualGlobal)}
              <span className="text-xl ml-0.5">d</span>
            </p>
            {indicadores.sequenciaAtualGlobal !== 0 && (
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                {indicadores.sequenciaAtualGlobal > 0 ? 'win' : 'loss'}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1.5 font-medium">
            Recorde: <span className="text-[var(--accent-win)] font-bold">{indicadores.maiorSequenciaPositiva}W</span> / <span className="text-[var(--accent-loss)] font-bold">{indicadores.maiorSequenciaNegativa}L</span>
          </p>
        </div>

      </div>

      {/* Painel 3: Raio-X Secundário (Tabelas) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* Recordes */}
        <div className="card p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-4">Métricas de Fundo</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <p className="text-xs text-[var(--text-secondary)] mb-1">Melhor Dia</p>
              <p className="text-sm font-bold text-[var(--accent-win)]">+{formatCurrency(indicadores.maiorGain)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] mb-1">Pior Dia</p>
              <p className="text-sm font-bold text-[var(--accent-loss)]">{formatCurrency(indicadores.maiorLoss)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] mb-1">Total Ganhos Brutos</p>
              <p className="text-sm font-bold text-[var(--accent-win)]">+{formatCurrency(indicadores.totalGanhos)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] mb-1">Total Perdas Brutas</p>
              <p className="text-sm font-bold text-[var(--accent-loss)]">-{formatCurrency(Math.abs(indicadores.totalPerdas))}</p>
            </div>
          </div>
        </div>

        {/* Movimentações de Caixa */}
        <div className="card p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-4">Fluxo de Caixa Externo (Operacional)</p>
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-[var(--bg-hover)] p-3 rounded-lg">
              <span className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2"><TrendingUp size={14} className="text-[var(--accent-win)]"/> Aportes Recebidos</span>
              <span className="text-sm font-bold text-[var(--accent-win)]">+{formatCurrency(indicadores.totalAportes)}</span>
            </div>
            <div className="flex justify-between items-center bg-[var(--bg-hover)] p-3 rounded-lg">
              <span className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2"><TrendingDown size={14} className="text-[var(--accent-loss)]"/> Saques Realizados</span>
              <span className="text-sm font-bold text-[var(--accent-loss)]">-{formatCurrency(indicadores.totalSaques)}</span>
            </div>
          </div>
        </div>
        
      </div>

      {/* Seção de Gráficos */}
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
                  {semanasComLabel.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill="var(--accent-blue)" />
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
