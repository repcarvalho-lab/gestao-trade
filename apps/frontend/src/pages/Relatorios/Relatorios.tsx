import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import { Activity, CheckCircle, XCircle, AlertTriangle, TrendingUp, Calendar, Crosshair, AlertOctagon, Target, Flame, Award, BarChart2, Clock } from 'lucide-react'
import api from '../../services/api'

// ─── Tipos ────────────────────────────────────────────────────

interface Metricas {
  total: number
  diasPositivos: number
  pctPositivos: number
  resultadoTotal: number
  resultadoMedio: number
  rentabilidadeMedia: number
  taxaAcertoMedia: number
}

interface ErroItem { nome: string; ocorrencias: number }

interface DisciplinaData {
  totalDias: number
  comDisciplina: Metricas
  semDisciplina: Metricas
  semInfo: Metricas
  principaisErros: ErroItem[]
  errosComDisciplina: ErroItem[]
}

interface SemanaReport {
  id: string; semana: number; ano: number
  dataInicial: string; dataFinal: string
  diasOperados: number; diasPositivos: number; diasNegativos: number
  totalWin: number; totalLoss: number
  taxaAcerto: number; lucroTotal: number
  melhorDia: number; piorDia: number
}

interface MesReport {
  id: string; mes: string; dataBase: string
  diasOperados: number; diasPositivos: number; diasNegativos: number
  capitalInicial: number; vlDepositadoSacado: number
  lucroTotal: number; capitalFinal: number
  rentabMedia: number; rentabTotal: number
  taxaAcertoMedia: number; maiorGain: number; maiorLoss: number
}

interface PerformanceData { semanas: SemanaReport[]; meses: MesReport[] }

interface ScorePilarData {
  score: number
  pctComDisciplina?: number
  diasAnalisados?: number
  pctPositivos?: number
  taxaEficiencia?: number
  taxaAcertoMedia?: number
  pctSemErros?: number
}

interface ScoreData {
  score: number
  grade: string
  totalDias: number
  pilares: {
    disciplina: ScorePilarData
    resultado: ScorePilarData
    consistencia: ScorePilarData
  } | null
}

// ─── Filtro de Período ────────────────────────────────────────

type Preset = 'all' | 'mes' | '3m' | '6m' | 'ano'
type Filtro = { inicio: string; fim: string } | null

const PRESETS: { label: string; value: Preset }[] = [
  { label: 'Tudo',       value: 'all' },
  { label: 'Este mês',   value: 'mes' },
  { label: '3 meses',    value: '3m'  },
  { label: '6 meses',    value: '6m'  },
  { label: 'Este ano',   value: 'ano' },
]

function computeFiltro(preset: Preset): Filtro {
  if (preset === 'all') return null
  const hoje = new Date()
  const ano  = hoje.getFullYear()
  const mes  = hoje.getMonth() // 0-indexed
  const iso  = (d: Date) => d.toISOString().slice(0, 10)
  const lastDay = (y: number, m: number) => new Date(y, m + 1, 0)
  if (preset === 'mes') return { inicio: `${ano}-${String(mes + 1).padStart(2, '0')}-01`, fim: iso(lastDay(ano, mes)) }
  if (preset === '3m')  return { inicio: iso(new Date(ano, mes - 2, 1)), fim: iso(lastDay(ano, mes)) }
  if (preset === '6m')  return { inicio: iso(new Date(ano, mes - 5, 1)), fim: iso(lastDay(ano, mes)) }
  if (preset === 'ano') return { inicio: `${ano}-01-01`, fim: `${ano}-12-31` }
  return null
}

function buildParams(filtro: Filtro) {
  if (!filtro) return {}
  return { inicio: filtro.inicio, fim: filtro.fim }
}

// ─── Helpers ──────────────────────────────────────────────────

const fmtUSD = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' }).format(v)
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`

function TooltipEscuro({ active, payload, label, labelKey, formatter }: any) {
  if (!active || !payload?.length) return null
  const titulo = labelKey
    ? payload[0]?.payload?.[labelKey] ?? label
    : label
  return (
    <div style={{
      background: '#1a2234',
      border: '1px solid #2a3a55',
      borderRadius: '0.5rem',
      padding: '0.6rem 0.85rem',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    }}>
      {titulo && (
        <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem' }}>{titulo}</p>
      )}
      {payload.map((e: any, i: number) => (
        <div key={i} style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{e.name}</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: e.color ?? e.fill ?? '#e2e8f0' }}>
            {formatter ? formatter(e.value) : (typeof e.value === 'number' ? `${e.value.toFixed(1)}%` : e.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function parseMesLabel(mes: string) {
  const [ano, m] = mes.split('-')
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${nomes[Number(m) - 1]}/${ano.slice(2)}`
}

function formatDateShort(dateStr: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(dateStr))
}

// ─── Componente MetricRow ──────────────────────────────────────

function MetricRow({ label, com, sem, fmt, inverter = false }: {
  label: string; com: number; sem: number; fmt: (v: number) => string; inverter?: boolean
}) {
  const comMelhor = inverter ? com < sem : com > sem
  const semMelhor = inverter ? sem < com : sem > com
  return (
    <tr className="border-t border-[var(--border)]"
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <td style={{ padding: '10px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{label}</td>
      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, fontSize: '0.85rem', fontFamily: 'monospace',
        color: comMelhor ? 'var(--accent-win)' : semMelhor ? 'var(--accent-loss)' : 'var(--text-primary)' }}>
        {fmt(com)}
      </td>
      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, fontSize: '0.85rem', fontFamily: 'monospace',
        color: semMelhor ? 'var(--accent-win)' : comMelhor ? 'var(--accent-loss)' : 'var(--text-primary)' }}>
        {fmt(sem)}
      </td>
    </tr>
  )
}

// ─── Score Card (fixo no topo) ──────────────────────────────────

const GRADE_CONFIG: Record<string, { color: string; bg: string; border: string; emoji: string; desc: string }> = {
  'Elite':              { color: '#f59e0b', bg: 'rgba(245,158,11,0.06)',  border: 'rgba(245,158,11,0.35)',  emoji: '🏆', desc: 'Performance excepcionalmente consistente' },
  'Avançado':           { color: '#4ade80', bg: 'rgba(74,222,128,0.06)',  border: 'rgba(74,222,128,0.35)',  emoji: '💪', desc: 'Disciplina e resultados acima da média' },
  'Intermediário':      { color: '#3b82f6', bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.35)', emoji: '📈', desc: 'Evolução consistente — continue assim' },
  'Em Desenvolvimento': { color: '#fb923c', bg: 'rgba(251,146,60,0.06)',  border: 'rgba(251,146,60,0.35)',  emoji: '🔧', desc: 'Foco em disciplina e controle de erros' },
  'Iniciante':          { color: '#94a3b8', bg: 'rgba(148,163,184,0.06)', border: 'rgba(148,163,184,0.25)', emoji: '🌱', desc: 'Acumule mais dias para um score fiel' },
  'Sem dados':          { color: '#94a3b8', bg: 'rgba(148,163,184,0.04)', border: 'rgba(148,163,184,0.15)', emoji: '—',  desc: 'Feche dias para calcular o score' },
}

const PILARES_CFG = [
  { key: 'disciplina'   as const, label: 'Disciplina',   peso: '30%', color: '#a78bfa' },
  { key: 'resultado'    as const, label: 'Resultado',    peso: '40%', color: '#4ade80' },
  { key: 'consistencia' as const, label: 'Consistência', peso: '30%', color: '#38bdf8' },
]

function ScoreCard({ filtro }: { filtro: Filtro }) {
  const [data, setData]       = useState<ScoreData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/relatorios/score', { params: buildParams(filtro) })
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filtro])

  if (loading) return (
    <div className="card" style={{ height: 116, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Activity size={22} style={{ color: 'var(--accent-blue)', animation: 'spin 1s linear infinite' }} />
    </div>
  )
  if (!data) return null

  const g   = GRADE_CONFIG[data.grade] ?? GRADE_CONFIG['Sem dados']
  const deg = Math.min(data.score, 100) * 3.6

  return (
    <div className="card" style={{
      display: 'grid',
      gridTemplateColumns: '130px 1fr auto',
      gap: '2rem',
      alignItems: 'center',
      padding: '1.375rem 1.75rem',
      borderColor: g.border,
      background: g.bg,
    }}>

      {/* Gauge circular */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: 108, height: 108, borderRadius: '50%', flexShrink: 0,
          background: `conic-gradient(${g.color} ${deg}deg, rgba(255,255,255,0.07) ${deg}deg)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 28px ${g.color}40`,
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--bg-surface)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '1.65rem', fontWeight: 900, color: g.color, lineHeight: 1 }}>{data.score}</span>
            <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', letterSpacing: '0.05em', marginTop: 1 }}>/100</span>
          </div>
        </div>
      </div>

      {/* Grade + info */}
      <div>
        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '0.3rem' }}>Score do Trader</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
          <span style={{ fontSize: '1.25rem' }}>{g.emoji}</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: g.color }}>{data.grade}</span>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{g.desc}</p>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Baseado em <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{data.totalDias} dia{data.totalDias !== 1 ? 's' : ''}</span> fechados
        </p>
        {data.totalDias < 10 && (
          <p style={{ fontSize: '0.68rem', color: 'var(--accent-warn)', marginTop: '0.2rem' }}>
            ⚠️ Score mais representativo com 10+ dias
          </p>
        )}
      </div>

      {/* Pilares */}
      {data.pilares && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', minWidth: 220 }}>
          {PILARES_CFG.map(p => {
            const s = data.pilares![p.key].score
            return (
              <div key={p.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.18rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {p.label} <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>({p.peso})</span>
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: p.color, fontFamily: 'monospace' }}>{s}</span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 3, width: `${s}%`, background: p.color, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Aba Disciplina ───────────────────────────────────────────

function AbaDisciplina({ filtro }: { filtro: Filtro }) {
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

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Activity size={28} style={{ color: 'var(--accent-blue)', animation: 'spin 1s linear infinite' }} /></div>
  if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-loss)' }}>{error}</div>
  if (!data || data.totalDias === 0) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum dia fechado encontrado.</div>

  const { comDisciplina: com, semDisciplina: sem, principaisErros, errosComDisciplina } = data
  const maxErros = principaisErros[0]?.ocorrencias ?? 1

  const comparativoData = [
    { label: '% Dias Positivos', com: com.pctPositivos * 100, sem: sem.pctPositivos * 100 },
    { label: 'Assertividade',   com: com.taxaAcertoMedia * 100, sem: sem.taxaAcertoMedia * 100 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Cards resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem' }}>
        <div className="card" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Total de Dias Fechados</p>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{data.totalDias}</p>
          {data.semInfo.total > 0 && (
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{data.semInfo.total} sem informação de disciplina</p>
          )}
        </div>
        <div className="card" style={{ borderColor: 'rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
            <CheckCircle size={14} color="#4ade80" />
            <p style={{ fontSize: '0.75rem', color: '#4ade80', margin: 0 }}>Com Disciplina</p>
          </div>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#4ade80', margin: 0 }}>{com.total}</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {data.totalDias > 0 ? `${((com.total / data.totalDias) * 100).toFixed(0)}% dos dias` : '—'}
          </p>
        </div>
        <div className="card" style={{ borderColor: 'rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
            <XCircle size={14} color="#f43f5e" />
            <p style={{ fontSize: '0.75rem', color: '#f43f5e', margin: 0 }}>Sem Disciplina</p>
          </div>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f43f5e', margin: 0 }}>{sem.total}</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {data.totalDias > 0 ? `${((sem.total / data.totalDias) * 100).toFixed(0)}% dos dias` : '—'}
          </p>
        </div>
      </div>

      {/* Tabela + gráfico */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Comparativo de Métricas</h2>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--bg-surface)' }}>
              <tr>
                <th style={{ padding: '8px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Métrica</th>
                <th style={{ padding: '8px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#4ade80', borderBottom: '1px solid var(--border)' }}>Com Disciplina</th>
                <th style={{ padding: '8px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#f43f5e', borderBottom: '1px solid var(--border)' }}>Sem Disciplina</th>
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

        <div className="card">
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 1.25rem' }}>Comparativo Visual</h2>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparativoData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={v => `${v.toFixed(0)}%`} tickLine={false} axisLine={false} />
                <Tooltip content={<TooltipEscuro />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="com" name="Com Disciplina" fill="#4ade80" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sem" name="Sem Disciplina" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', marginTop: '0.75rem' }}>
            {[{ label: 'Com Disciplina', color: '#4ade80' }, { label: 'Sem Disciplina', color: '#f43f5e' }].map(i => (
              <span key={i.label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: i.color }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: i.color, display: 'inline-block' }} />{i.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Principais erros */}
      {principaisErros.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={15} color="var(--accent-warn)" />
            <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Principais Erros — Dias Sem Disciplina</h2>
          </div>
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {principaisErros.map((erro, i) => {
              const pct = erro.ocorrencias / Math.max(sem.total, 1)
              const comCount = errosComDisciplina.find(e => e.nome === erro.nome)?.ocorrencias ?? 0
              return (
                <div key={erro.nome} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(244,63,94,0.15)', color: '#f43f5e', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>{erro.nome}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {comCount > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>também {comCount}× c/ disciplina</span>}
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f43f5e', minWidth: 60, textAlign: 'right' }}>{erro.ocorrencias}× ({(pct * 100).toFixed(0)}% dos dias)</span>
                    </div>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: 'var(--bg-surface)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, width: `${(erro.ocorrencias / maxErros) * 100}%`, background: 'linear-gradient(90deg, #f43f5e, #fb7185)' }} />
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

// ─── Aba Performance ──────────────────────────────────────────

function AbaPerformance() {
  const [data, setData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [periodo, setPeriodo] = useState<'semana' | 'mes'>('mes')

  useEffect(() => {
    api.get('/relatorios/performance')
      .then(r => setData(r.data))
      .catch(() => setError('Erro ao carregar dados.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Activity size={28} style={{ color: 'var(--accent-blue)', animation: 'spin 1s linear infinite' }} /></div>
  if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-loss)' }}>{error}</div>
  if (!data) return null

  const thStyle = (align: 'left' | 'right' = 'right'): React.CSSProperties => ({
    padding: '8px 14px', textAlign: align, fontSize: '11px', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)',
    borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
  })

  const tdStyle = (color?: string): React.CSSProperties => ({
    padding: '9px 14px', textAlign: 'right', fontSize: '0.82rem',
    fontFamily: 'monospace', color: color ?? 'var(--text-primary)', fontWeight: 600,
    whiteSpace: 'nowrap',
  })

  const resultColor = (v: number) => v > 0 ? 'var(--accent-win)' : v < 0 ? 'var(--accent-loss)' : 'var(--text-muted)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Seletor de período */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {([['mes', 'Por Mês', Calendar], ['semana', 'Por Semana', TrendingUp]] as const).map(([key, label, Icon]) => {
          const ativo = periodo === key
          return (
            <button key={key} onClick={() => setPeriodo(key)} style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.45rem 1rem', borderRadius: '0.5rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${ativo ? 'var(--accent-blue)' : 'var(--border)'}`,
              background: ativo ? 'rgba(59,130,246,0.12)' : 'transparent',
              color: ativo ? 'var(--accent-blue)' : 'var(--text-muted)',
            }}>
              <Icon size={14} />{label}
            </button>
          )
        })}
      </div>

      {/* Tabela mensal */}
      {periodo === 'mes' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--bg-surface)' }}>
                <tr>
                  <th style={{ ...thStyle('left') }}>Mês</th>
                  <th style={thStyle()}>Dias Op.</th>
                  <th style={thStyle()}>Positivos</th>
                  <th style={thStyle()}>Taxa Acerto</th>
                  <th style={thStyle()}>Capital Inicial</th>
                  <th style={thStyle()}>Resultado</th>
                  <th style={thStyle()}>Rentab. Total</th>
                  <th style={thStyle()}>Capital Final</th>
                  <th style={thStyle()}>Maior Gain</th>
                  <th style={thStyle()}>Maior Loss</th>
                </tr>
              </thead>
              <tbody>
                {data.meses.length === 0 && (
                  <tr><td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum mês fechado.</td></tr>
                )}
                {data.meses.map(m => (
                  <tr key={m.id} style={{ borderTop: '1px solid var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '9px 14px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{parseMesLabel(m.mes)}</td>
                    <td style={tdStyle()}>{m.diasOperados}</td>
                    <td style={tdStyle()}>{m.diasPositivos} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({m.diasOperados > 0 ? ((m.diasPositivos / m.diasOperados) * 100).toFixed(0) : 0}%)</span></td>
                    <td style={tdStyle()}>{fmtPct(m.taxaAcertoMedia)}</td>
                    <td style={tdStyle()}>{fmtUSD(m.capitalInicial)}</td>
                    <td style={{ ...tdStyle(resultColor(m.lucroTotal)) }}>{m.lucroTotal >= 0 ? '+' : ''}{fmtUSD(m.lucroTotal)}</td>
                    <td style={{ ...tdStyle(resultColor(m.rentabTotal)) }}>{m.rentabTotal >= 0 ? '+' : ''}{fmtPct(m.rentabTotal)}</td>
                    <td style={tdStyle()}>{fmtUSD(m.capitalFinal)}</td>
                    <td style={{ ...tdStyle('var(--accent-win)') }}>+{fmtUSD(m.maiorGain)}</td>
                    <td style={{ ...tdStyle('var(--accent-loss)') }}>{fmtUSD(m.maiorLoss)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabela semanal */}
      {periodo === 'semana' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--bg-surface)' }}>
                <tr>
                  <th style={{ ...thStyle('left') }}>Semana</th>
                  <th style={thStyle()}>Dias Op.</th>
                  <th style={thStyle()}>Positivos</th>
                  <th style={thStyle()}>Taxa Acerto</th>
                  <th style={thStyle()}>Resultado</th>
                  <th style={thStyle()}>Melhor Dia</th>
                  <th style={thStyle()}>Pior Dia</th>
                </tr>
              </thead>
              <tbody>
                {data.semanas.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma semana registrada.</td></tr>
                )}
                {[...data.semanas].reverse().map(s => (
                  <tr key={s.id} style={{ borderTop: '1px solid var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '9px 14px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                      {formatDateShort(s.dataInicial)} – {formatDateShort(s.dataFinal)}
                    </td>
                    <td style={tdStyle()}>{s.diasOperados}</td>
                    <td style={tdStyle()}>{s.diasPositivos} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({s.diasOperados > 0 ? ((s.diasPositivos / s.diasOperados) * 100).toFixed(0) : 0}%)</span></td>
                    <td style={tdStyle()}>{fmtPct(s.taxaAcerto)}</td>
                    <td style={{ ...tdStyle(resultColor(s.lucroTotal)) }}>{s.lucroTotal >= 0 ? '+' : ''}{fmtUSD(s.lucroTotal)}</td>
                    <td style={{ ...tdStyle('var(--accent-win)') }}>+{fmtUSD(s.melhorDia)}</td>
                    <td style={{ ...tdStyle('var(--accent-loss)') }}>{fmtUSD(s.piorDia)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Aba Estratégias ──────────────────────────────────────────

interface EstrategiaItem {
  nome: string; total: number; wins: number; losses: number
  taxaAcerto: number; resultadoTotal: number; resultadoMedio: number
  melhorTrade: number; piorTrade: number
}

type OrdemEstrategia = 'taxaAcerto' | 'resultadoTotal' | 'resultadoMedio' | 'total'

function AbaEstrategias({ filtro }: { filtro: Filtro }) {
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

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Activity size={28} style={{ color: 'var(--accent-blue)', animation: 'spin 1s linear infinite' }} /></div>
  if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-loss)' }}>{error}</div>
  if (!data || data.estrategias.length === 0) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma operação com origem registrada.</div>

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

  const resultColor = (v: number) => v > 0 ? 'var(--accent-win)' : v < 0 ? 'var(--accent-loss)' : 'var(--text-muted)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Cards destaque */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem' }}>
        <div className="card" style={{ borderColor: 'rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.04)' }}>
          <p style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Maior Assertividade</p>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.2rem' }}>{melhorTaxa.nome}</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4ade80', margin: 0 }}>{fmtPct(melhorTaxa.taxaAcerto)}</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{melhorTaxa.wins}W / {melhorTaxa.losses}L em {melhorTaxa.total} trades</p>
        </div>
        <div className="card" style={{ borderColor: 'rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.04)' }}>
          <p style={{ fontSize: '0.72rem', color: 'var(--accent-blue)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Maior Resultado Total</p>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.2rem' }}>{melhorResultado.nome}</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-blue)', margin: 0 }}>{fmtUSD(melhorResultado.resultadoTotal)}</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Média {fmtUSD(melhorResultado.resultadoMedio)}/trade</p>
        </div>
        <div className="card" style={{ borderColor: 'rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.04)' }}>
          <p style={{ fontSize: '0.72rem', color: 'var(--accent-warn)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Mais Utilizada</p>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.2rem' }}>{maisUsada.nome}</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-warn)', margin: 0 }}>{maisUsada.total} trades</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{fmtPct(maisUsada.taxaAcerto)} de acerto</p>
        </div>
      </div>

      {/* Gráficos: pizza + barras */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.25rem' }}>

        {/* Pizza — distribuição de trades por origem */}
        <div className="card">
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 1rem' }}>Distribuição de Trades</h2>
          <div style={{ position: 'relative', height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={74} dataKey="value" paddingAngle={2}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => active && payload?.length ? (
                    <div className="card" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', border: '1px solid var(--border-light)' }}>
                      <span style={{ color: payload[0].payload.color, fontWeight: 700 }}>{payload[0].payload.name}</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{payload[0].value} trades · {payload[0].payload.pct.toFixed(0)}%</span>
                    </div>
                  ) : null}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{data.totalTrades}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>trades</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.75rem' }}>
            {pieData.map((entry, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: entry.color, flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>{entry.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: entry.color }}>{entry.value}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: 28, textAlign: 'right' }}>{entry.pct.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Barras — métrica selecionável */}
        <div className="card">
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 1.25rem' }}>{mainMetric.nome} por Origem</h2>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
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
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Todas as Origens</h2>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {ORDENS.map(o => {
              const ativo = ordem === o.key
              return (
                <button key={o.key} onClick={() => setOrdem(o.key)} style={{
                  padding: '0.3rem 0.7rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: '0.375rem', cursor: 'pointer',
                  border: `1px solid ${ativo ? 'var(--accent-blue)' : 'var(--border)'}`,
                  background: ativo ? 'rgba(59,130,246,0.12)' : 'transparent',
                  color: ativo ? 'var(--accent-blue)' : 'var(--text-muted)',
                }}>{o.label}</button>
              )
            })}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--bg-surface)' }}>
              <tr>
                {['Origem', 'Trades', 'Win', 'Loss', 'Taxa Acerto', 'Resultado Total', 'Resultado Médio', 'Melhor Trade', 'Pior Trade'].map((h, i) => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: i === 0 ? 'left' : 'right', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((e, i) => (
                <tr key={e.nome} style={{ borderTop: '1px solid var(--border)' }}
                  onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '9px 14px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                      {e.nome}
                    </div>
                  </td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600 }}>{e.total}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: '0.82rem', color: 'var(--accent-win)', fontWeight: 600 }}>{e.wins}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: '0.82rem', color: 'var(--accent-loss)', fontWeight: 600 }}>{e.losses}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: '0.82rem', fontWeight: 700, fontFamily: 'monospace', color: e.taxaAcerto >= 0.6 ? 'var(--accent-win)' : e.taxaAcerto >= 0.4 ? 'var(--accent-warn)' : 'var(--accent-loss)' }}>{fmtPct(e.taxaAcerto)}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: '0.82rem', fontWeight: 700, fontFamily: 'monospace', color: resultColor(e.resultadoTotal) }}>{e.resultadoTotal >= 0 ? '+' : ''}{fmtUSD(e.resultadoTotal)}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: '0.82rem', fontWeight: 700, fontFamily: 'monospace', color: resultColor(e.resultadoMedio) }}>{e.resultadoMedio >= 0 ? '+' : ''}{fmtUSD(e.resultadoMedio)}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--accent-win)', fontWeight: 600 }}>+{fmtUSD(e.melhorTrade)}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--accent-loss)', fontWeight: 600 }}>{fmtUSD(e.piorTrade)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Aba Erros & Impacto ──────────────────────────────────────

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

function AbaErros({ filtro }: { filtro: Filtro }) {
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

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Activity size={28} style={{ color: 'var(--accent-blue)', animation: 'spin 1s linear infinite' }} /></div>
  if (error)   return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-loss)' }}>{error}</div>
  if (!data || data.erros.length === 0) return (
    <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Cards resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem' }}>
        <div className="card" style={{ borderColor: 'rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.04)' }}>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>Impacto Total Estimado</p>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f43f5e', margin: 0 }}>
            {impactoTotalGeral >= 0 ? '+' : ''}{fmtUSD(impactoTotalGeral)}
          </p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            soma do custo estimado de todos os erros
          </p>
        </div>
        <div className="card">
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>Erro Mais Frequente</p>
          <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{maisFrequente.nome}</p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {maisFrequente.ocorrencias}x — {(maisFrequente.pctDias * 100).toFixed(0)}% dos dias
          </p>
        </div>
        <div className="card" style={{ borderColor: 'rgba(251,146,60,0.3)', background: 'rgba(251,146,60,0.04)' }}>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>Erro Mais Custoso</p>
          <p style={{ fontSize: '1rem', fontWeight: 700, color: '#fb923c', margin: 0 }}>{maisImpactante.nome}</p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {fmtUSD(maisImpactante.impactoPorOcorrencia)} por ocorrência
          </p>
        </div>
      </div>

      {/* Gráfico + tabela */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

        {/* Gráfico: impacto por erro */}
        <div className="card">
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 1.25rem' }}>
            Impacto Total por Erro (Top 8)
          </h2>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
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
        <div className="card">
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 1.25rem' }}>
            Frequência por Erro (Top 8)
          </h2>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
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
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Detalhamento por Erro</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Média geral dos dias: <span style={{ color: mediaGeral >= 0 ? 'var(--accent-win)' : 'var(--accent-loss)', fontWeight: 600 }}>{mediaGeral >= 0 ? '+' : ''}{fmtUSD(mediaGeral)}</span>
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--bg-surface)' }}>
              <tr>
                {['Erro', 'Ocorrências', '% dos dias', 'Média c/ erro', 'Média s/ erro', 'Custo/ocorrência', 'Impacto Total'].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: h === 'Erro' ? 'left' : 'right', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {erros.map((e, i) => (
                <tr key={i}
                  style={{ borderTop: '1px solid var(--border)', transition: 'background 0.1s' }}
                  onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>{e.nome}</span>
                      <span className={`badge badge-${e.gravidade === 'GRAVE' ? 'loss' : 'warn'}`} style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem' }}>
                        {e.gravidade === 'GRAVE' ? 'Grave' : 'Leve'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{e.ocorrencias}x</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{(e.pctDias * 100).toFixed(0)}%</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'monospace', color: e.mediaResultadoCom >= 0 ? 'var(--accent-win)' : 'var(--accent-loss)' }}>
                    {e.mediaResultadoCom >= 0 ? '+' : ''}{fmtUSD(e.mediaResultadoCom)}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'monospace', color: e.mediaResultadoSem >= 0 ? 'var(--accent-win)' : 'var(--accent-loss)' }}>
                    {e.mediaResultadoSem >= 0 ? '+' : ''}{fmtUSD(e.mediaResultadoSem)}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace', color: '#fb923c' }}>
                    {e.impactoPorOcorrencia >= 0 ? '+' : ''}{fmtUSD(e.impactoPorOcorrencia)}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace', color: '#f43f5e' }}>
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

// ─── Aba Eficiência de Meta ──────────────────────────────────────


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
  META_MAXIMA:       { label: 'Meta Máxima',  color: '#3b82f6' },
  META_IDEAL:        { label: 'Meta Ideal',   color: '#4ade80' },
  META_NAO_ATINGIDA: { label: 'Não Atingida', color: '#fbbf24' },
  STOP:              { label: 'Stop',         color: '#f43f5e' },
} as const

const STATUS_META_ORDER = ['META_MAXIMA', 'META_IDEAL', 'META_NAO_ATINGIDA', 'STOP'] as const


function TooltipSemana({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1a2234', border: '1px solid #2a3a55', borderRadius: '0.5rem',
      padding: '0.6rem 0.85rem', boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    }}>
      <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem' }}>{label}</p>
      {[...payload].reverse().map((e: any, i: number) => (
        <div key={i} style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#94a3b8' }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: e.fill, display: 'inline-block' }} />
            {e.name}
          </span>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: e.fill }}>{e.value}d</span>
        </div>
      ))}
    </div>
  )
}

const TENDENCIA_WINDOW = 8

function AbaEficienciaMeta({ filtro }: { filtro: Filtro }) {
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

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Activity size={28} style={{ color: 'var(--accent-blue)', animation: 'spin 1s linear infinite' }} /></div>
  if (error)   return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-loss)' }}>{error}</div>

  if (!data || data.totalDias === 0) return (
    <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
      Nenhum dia fechado encontrado para o período selecionado.
    </div>
  )

  const { distribuicao: d, taxaEficiencia, tendencia, sequencias } = data
  const efPct = taxaEficiencia * 100
  const efColor = efPct >= 70 ? '#4ade80' : efPct >= 50 ? '#fbbf24' : '#f43f5e'
  const efBorder = efPct >= 70 ? 'rgba(74,222,128,0.3)' : efPct >= 50 ? 'rgba(251,191,36,0.3)' : 'rgba(244,63,94,0.3)'
  const efBg     = efPct >= 70 ? 'rgba(74,222,128,0.04)' : efPct >= 50 ? 'rgba(251,191,36,0.04)' : 'rgba(244,63,94,0.04)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Cards resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.875rem' }}>

        {/* Taxa de eficiência */}
        <div className="card" style={{ borderColor: efBorder, background: efBg }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
            <Target size={14} color={efColor} />
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Taxa de Eficiência</p>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 800, color: efColor, margin: 0 }}>{efPct.toFixed(0)}%</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>dias que bateram alguma meta</p>
        </div>

        {/* Total de dias */}
        <div className="card">
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Dias Analisados</p>
          <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{data.totalDias}</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {d.META_IDEAL.count + d.META_MAXIMA.count} com meta · {d.META_NAO_ATINGIDA.count + d.STOP.count} sem meta
          </p>
        </div>

        {/* Maior sequência */}
        <div className="card" style={{ borderColor: 'rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
            <Award size={14} color="var(--accent-blue)" />
            <p style={{ fontSize: '0.72rem', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Maior Sequência</p>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-blue)', margin: 0 }}>
            {sequencias.maiorSequenciaMeta}d
          </p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>dias consecutivos com meta</p>
        </div>

        {/* Sequência atual */}
        <div className="card" style={{
          borderColor: sequencias.sequenciaAtual > 0 ? 'rgba(74,222,128,0.3)' : 'rgba(244,63,94,0.3)',
          background:  sequencias.sequenciaAtual > 0 ? 'rgba(74,222,128,0.04)' : 'rgba(244,63,94,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
            <Flame size={14} color={sequencias.sequenciaAtual > 0 ? '#4ade80' : '#f43f5e'} />
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Sequência Atual</p>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 800, color: sequencias.sequenciaAtual > 0 ? '#4ade80' : '#f43f5e', margin: 0 }}>
            {Math.abs(sequencias.sequenciaAtual)}d
          </p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {sequencias.sequenciaAtual > 0 ? '🔥 consecutivos com meta' : '⚠️ consecutivos sem meta'}
          </p>
        </div>
      </div>

      {/* Distribuição + Tendência */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '1.25rem' }}>

        {/* Donut — Distribuição por Status */}
        <div className="card">
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 1rem' }}>Distribuição por Status</h2>
          <div style={{ position: 'relative', height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={STATUS_META_ORDER.filter(k => d[k].count > 0).map(k => ({ name: STATUS_META_CFG[k].label, value: d[k].count, color: STATUS_META_CFG[k].color }))}
                  cx="50%" cy="50%"
                  innerRadius={52} outerRadius={78}
                  dataKey="value" paddingAngle={2}
                >
                  {STATUS_META_ORDER.filter(k => d[k].count > 0).map((k, i) => (
                    <Cell key={i} fill={STATUS_META_CFG[k].color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => active && payload?.length ? (
                    <div className="card" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', border: '1px solid var(--border-light)' }}>
                      <span style={{ color: payload[0].payload.color, fontWeight: 700 }}>{payload[0].name}</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{payload[0].value}d · {((payload[0].value as number / data!.totalDias) * 100).toFixed(0)}%</span>
                    </div>
                  ) : null}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Label central */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: efColor, lineHeight: 1 }}>{efPct.toFixed(0)}%</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>eficiência</div>
            </div>
          </div>
          {/* Legenda com média */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
            {STATUS_META_ORDER.map(key => {
              const cfg = STATUS_META_CFG[key]
              const item = d[key]
              if (item.count === 0) return null
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: cfg.color, flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{cfg.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: cfg.color }}>{item.count}d</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: 28, textAlign: 'right' }}>{(item.pct * 100).toFixed(0)}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tendência Semanal */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Tendência Semanal</h2>
            {tendencia.length > TENDENCIA_WINDOW && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => setTendStart(s => Math.max(0, s - TENDENCIA_WINDOW))}
                  disabled={tendStart === 0}
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px', cursor: tendStart === 0 ? 'not-allowed' : 'pointer', opacity: tendStart === 0 ? 0.35 : 1, color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.6 }}
                >‹</button>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: 80, textAlign: 'center' }}>
                  {tendStart + 1}–{Math.min(tendStart + TENDENCIA_WINDOW, tendencia.length)} de {tendencia.length}
                </span>
                <button
                  onClick={() => setTendStart(s => Math.min(tendencia.length - TENDENCIA_WINDOW, s + TENDENCIA_WINDOW))}
                  disabled={tendStart + TENDENCIA_WINDOW >= tendencia.length}
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px', cursor: tendStart + TENDENCIA_WINDOW >= tendencia.length ? 'not-allowed' : 'pointer', opacity: tendStart + TENDENCIA_WINDOW >= tendencia.length ? 0.35 : 1, color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.6 }}
                >›</button>
              </div>
            )}
          </div>
          {tendencia.length === 0 ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Sem dados de semanas completas para exibir.
            </div>
          ) : (
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tendencia.slice(tendStart, tendStart + TENDENCIA_WINDOW)} margin={{ top: 5, right: 8, left: -14, bottom: 5 }} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="semana" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<TooltipSemana />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="metaIdeal"   name="Meta Ideal"   stackId="a" fill="#4ade80" />
                  <Bar dataKey="metaMaxima"  name="Meta Máxima"  stackId="a" fill="#3b82f6" />
                  <Bar dataKey="naoAtingida" name="Não Atingida" stackId="a" fill="#fbbf24" />
                  <Bar dataKey="stop"        name="Stop"         stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            {STATUS_META_ORDER.map(key => (
              <span key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: STATUS_META_CFG[key].color }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_META_CFG[key].color, display: 'inline-block' }} />
                {STATUS_META_CFG[key].label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela por status */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Resultado por Status</h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'var(--bg-surface)' }}>
            <tr>
              {['Status', 'Dias', '% do Total', 'Resultado Total', 'Resultado Médio/Dia'].map((h, i) => (
                <th key={h} style={{ padding: '8px 16px', textAlign: i === 0 ? 'left' : 'right', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STATUS_META_ORDER.map(key => {
              const cfg  = STATUS_META_CFG[key]
              const item = d[key]
              if (item.count === 0) return null
              return (
                <tr key={key} style={{ borderTop: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '10px 16px', fontSize: '0.875rem', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: cfg.color, display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ color: cfg.color }}>{cfg.label}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{item.count}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{(item.pct * 100).toFixed(1)}%</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: '0.875rem', fontWeight: 700, fontFamily: 'monospace', color: item.resultadoTotal >= 0 ? 'var(--accent-win)' : 'var(--accent-loss)' }}>
                    {item.resultadoTotal >= 0 ? '+' : ''}{fmtUSD(item.resultadoTotal)}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: '0.875rem', fontWeight: 700, fontFamily: 'monospace', color: item.resultadoMedio >= 0 ? 'var(--accent-win)' : 'var(--accent-loss)' }}>
                    {item.resultadoMedio >= 0 ? '+' : ''}{fmtUSD(item.resultadoMedio)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

    </div>
  )
}

// ─── Aba Ativos ───────────────────────────────────────────────

interface AtivoItem {
  nome: string; total: number; wins: number; losses: number
  taxaAcerto: number; resultadoTotal: number; resultadoMedio: number
  melhorTrade: number; piorTrade: number
}

function AbaAtivos({ filtro }: { filtro: Filtro }) {
  const [data, setData] = useState<{ ativos: AtivoItem[]; totalTrades: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [ordem, setOrdem] = useState<'taxaAcerto' | 'resultadoTotal' | 'total'>('resultadoTotal')

  useEffect(() => {
    setLoading(true); setData(null)
    api.get('/relatorios/ativos', { params: buildParams(filtro) })
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [filtro])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Activity size={28} style={{ color: 'var(--accent-blue)', animation: 'spin 1s linear infinite' }} /></div>
  if (!data || data.ativos.length === 0) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma operação com ativo registrado.</div>

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Destaques */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem' }}>
        <div className="card" style={{ borderColor: 'rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.04)' }}>
          <p style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Melhor Ativo</p>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.2rem' }}>{melhor.nome}</p>
          <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4ade80', margin: 0 }}>{fmtUSD(melhor.resultadoTotal)}</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{melhor.wins}W / {melhor.losses}L · {fmtPct(melhor.taxaAcerto)} acerto</p>
        </div>
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.04)' }}>
          <p style={{ fontSize: '0.72rem', color: 'var(--accent-loss)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Pior Ativo</p>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.2rem' }}>{pior.nome}</p>
          <p style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-loss)', margin: 0 }}>{fmtUSD(pior.resultadoTotal)}</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{pior.wins}W / {pior.losses}L · {fmtPct(pior.taxaAcerto)} acerto</p>
        </div>
        <div className="card" style={{ borderColor: 'rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.04)' }}>
          <p style={{ fontSize: '0.72rem', color: 'var(--accent-warn)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Mais Operado</p>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.2rem' }}>{maisUsado.nome}</p>
          <p style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-warn)', margin: 0 }}>{maisUsado.total} trades</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{fmtPct(maisUsado.taxaAcerto)} acerto · {fmtUSD(maisUsado.resultadoTotal)}</p>
        </div>
      </div>

      {/* Donut + Gráfico de barras */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '1.25rem' }}>

        {/* Donut — distribuição de trades por ativo */}
        {(() => {
          const CORES = ['#3b82f6','#4ade80','#fbbf24','#f43f5e','#8b5cf6','#06b6d4','#f97316','#ec4899']
          const donutData = data.ativos.slice(0, 8).map((a, i) => ({
            nome: a.nome, value: a.total, color: CORES[i % CORES.length],
          }))
          const total = donutData.reduce((s, d) => s + d.value, 0)
          return (
            <div className="card">
              <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.75rem' }}>Distribuição de Trades</h2>
              <div style={{ position: 'relative', height: 170 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" paddingAngle={2}>
                      {donutData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="transparent" />)}
                    </Pie>
                    <Tooltip content={({ active, payload }) => active && payload?.length ? (
                      <div className="card" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', border: '1px solid var(--border-light)' }}>
                        <span style={{ color: payload[0].payload.color, fontWeight: 700 }}>{payload[0].payload.nome}</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{payload[0].value} trades · {((payload[0].value as number / total) * 100).toFixed(0)}%</span>
                      </div>
                    ) : null} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{total}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>trades</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                {donutData.map((a) => (
                  <div key={a.nome} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: a.color, flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>{a.nome}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.value} · {((a.value / total) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Gráfico de barras */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              {ordem === 'resultadoTotal' ? 'Resultado por Ativo' : ordem === 'taxaAcerto' ? 'Assertividade por Ativo' : 'Trades por Ativo'}
            </h2>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {ORDENS.map(o => {
                const ativo = ordem === o.key
                return (
                  <button key={o.key} onClick={() => setOrdem(o.key)} style={{
                    padding: '0.3rem 0.7rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: '0.375rem', cursor: 'pointer',
                    border: `1px solid ${ativo ? 'var(--accent-blue)' : 'var(--border)'}`,
                    background: ativo ? 'rgba(59,130,246,0.12)' : 'transparent',
                    color: ativo ? 'var(--accent-blue)' : 'var(--text-muted)',
                  }}>{o.label}</button>
                )
              })}
            </div>
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
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
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Todos os Ativos</h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--bg-surface)' }}>
              <tr>
                {['Ativo', 'Trades', 'Win', 'Loss', 'Assertividade', 'Resultado Total', 'Resultado Médio', 'Melhor Trade', 'Pior Trade'].map((h, i) => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: i === 0 ? 'left' : 'right', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(a => (
                <tr key={a.nome} style={{ borderTop: '1px solid var(--border)' }}
                  onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={ev => (ev.currentTarget.style.background = '')}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{a.nome}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{a.total}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--accent-win)', fontSize: '0.85rem', fontWeight: 600 }}>{a.wins}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--accent-loss)', fontSize: '0.85rem', fontWeight: 600 }}>{a.losses}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600, color: a.taxaAcerto >= 0.6 ? 'var(--accent-win)' : a.taxaAcerto >= 0.4 ? 'var(--accent-warn)' : 'var(--accent-loss)' }}>{fmtPct(a.taxaAcerto)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, color: a.resultadoTotal >= 0 ? 'var(--accent-win)' : 'var(--accent-loss)' }}>{fmtUSD(a.resultadoTotal)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.85rem', color: a.resultadoMedio >= 0 ? 'var(--accent-win)' : 'var(--accent-loss)' }}>{fmtUSD(a.resultadoMedio)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.85rem', color: 'var(--accent-win)' }}>{fmtUSD(a.melhorTrade)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.85rem', color: 'var(--accent-loss)' }}>{fmtUSD(a.piorTrade)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Aba Dias da Semana ────────────────────────────────────────

interface DiaSemanaItem {
  dow: number; nome: string; diasOperados: number; diasPositivos: number
  pctPositivos: number; resultadoTotal: number; resultadoMedio: number
  taxaAcertoMedia: number; totalWins: number; totalLosses: number
}

function AbaDiaSemana({ filtro }: { filtro: Filtro }) {
  const [data, setData] = useState<{ diasSemana: DiaSemanaItem[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [metrica, setMetrica] = useState<'resultadoMedio' | 'pctPositivos' | 'taxaAcertoMedia'>('resultadoMedio')

  useEffect(() => {
    setLoading(true); setData(null)
    api.get('/relatorios/dias-semana', { params: buildParams(filtro) })
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [filtro])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Activity size={28} style={{ color: 'var(--accent-blue)', animation: 'spin 1s linear infinite' }} /></div>
  if (!data || data.diasSemana.every(d => d.diasOperados === 0)) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum dado disponível.</div>

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Destaques */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem' }}>
        <div className="card" style={{ borderColor: 'rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.04)' }}>
          <p style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Melhor Dia</p>
          <p style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.2rem' }}>{melhorDia.nome}</p>
          <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4ade80', margin: 0 }}>{fmtUSD(melhorDia.resultadoMedio)}</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>média/dia · {melhorDia.diasOperados} dias operados</p>
        </div>
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.04)' }}>
          <p style={{ fontSize: '0.72rem', color: 'var(--accent-loss)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Pior Dia</p>
          <p style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.2rem' }}>{piorDia.nome}</p>
          <p style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-loss)', margin: 0 }}>{fmtUSD(piorDia.resultadoMedio)}</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>média/dia · {piorDia.diasOperados} dias operados</p>
        </div>
        <div className="card" style={{ borderColor: 'rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.04)' }}>
          <p style={{ fontSize: '0.72rem', color: 'var(--accent-blue)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Maior Assertividade</p>
          <p style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.2rem' }}>{maisAcerto.nome}</p>
          <p style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-blue)', margin: 0 }}>{fmtPct(maisAcerto.taxaAcertoMedia)}</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{maisAcerto.totalWins}W / {maisAcerto.totalLosses}L</p>
        </div>
      </div>

      {/* Gráfico */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Desempenho por Dia da Semana</h2>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {METRICAS.map(m => {
              const ativo = metrica === m.key
              return (
                <button key={m.key} onClick={() => setMetrica(m.key)} style={{
                  padding: '0.3rem 0.7rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: '0.375rem', cursor: 'pointer',
                  border: `1px solid ${ativo ? 'var(--accent-blue)' : 'var(--border)'}`,
                  background: ativo ? 'rgba(59,130,246,0.12)' : 'transparent',
                  color: ativo ? 'var(--accent-blue)' : 'var(--text-muted)',
                }}>{m.label}</button>
              )
            })}
          </div>
        </div>
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
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
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Detalhamento por Dia</h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--bg-surface)' }}>
              <tr>
                {['Dia', 'Dias Op.', 'Dias +', '% Positivos', 'Resultado Total', 'Resultado Médio', 'Assertividade', 'Wins', 'Losses'].map((h, i) => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: i === 0 ? 'left' : 'right', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.diasSemana.map(d => (
                <tr key={d.dow} style={{ borderTop: '1px solid var(--border)', opacity: d.diasOperados === 0 ? 0.4 : 1 }}
                  onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={ev => (ev.currentTarget.style.background = '')}>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{d.nome}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{d.diasOperados}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--accent-win)', fontSize: '0.85rem' }}>{d.diasPositivos}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600, color: d.pctPositivos >= 0.6 ? 'var(--accent-win)' : d.pctPositivos >= 0.4 ? 'var(--accent-warn)' : 'var(--accent-loss)' }}>{d.diasOperados > 0 ? `${(d.pctPositivos * 100).toFixed(1)}%` : '—'}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, color: d.resultadoTotal >= 0 ? 'var(--accent-win)' : 'var(--accent-loss)' }}>{d.diasOperados > 0 ? fmtUSD(d.resultadoTotal) : '—'}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.85rem', color: d.resultadoMedio >= 0 ? 'var(--accent-win)' : 'var(--accent-loss)' }}>{d.diasOperados > 0 ? fmtUSD(d.resultadoMedio) : '—'}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600, color: d.taxaAcertoMedia >= 0.6 ? 'var(--accent-win)' : d.taxaAcertoMedia >= 0.4 ? 'var(--accent-warn)' : 'var(--accent-loss)' }}>{d.diasOperados > 0 ? fmtPct(d.taxaAcertoMedia) : '—'}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--accent-win)', fontSize: '0.85rem', fontWeight: 600 }}>{d.totalWins}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--accent-loss)', fontSize: '0.85rem', fontWeight: 600 }}>{d.totalLosses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────

const TABS = [
  { key: 'disciplina',   label: 'Disciplina',               icon: CheckCircle },
  { key: 'meta',         label: 'Eficiência de Meta',       icon: Target },
  { key: 'erros',        label: 'Erros & Impacto',          icon: AlertOctagon },
  { key: 'dias-semana',  label: 'Dias da Semana',           icon: Clock },
  { key: 'ativos',       label: 'Ativos',                   icon: BarChart2 },
  { key: 'estrategias',  label: 'Origem da Entrada',        icon: Crosshair },
  { key: 'performance',  label: 'Performance por Período',  icon: TrendingUp },
]

export default function Relatorios() {
  const [aba, setAba]       = useState('disciplina')
  const [preset, setPreset] = useState<Preset>('all')
  const filtro = computeFiltro(preset)

  return (
    <div className="animate-slide-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Relatórios</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Análise de disciplina operacional e performance por período.
          </p>
        </div>

        {/* Filtro de período */}
        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          {PRESETS.map(p => {
            const ativo = preset === p.value
            return (
              <button key={p.value} onClick={() => setPreset(p.value)} style={{
                padding: '0.4rem 0.85rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${ativo ? 'var(--accent-blue)' : 'var(--border)'}`,
                background: ativo ? 'rgba(59,130,246,0.12)' : 'transparent',
                color: ativo ? 'var(--accent-blue)' : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}>{p.label}</button>
            )
          })}
        </div>
      </div>

      {/* Score Card */}
      <ScoreCard filtro={filtro} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(({ key, label, icon: Icon }) => {
          const ativo = aba === key
          return (
            <button key={key} onClick={() => setAba(key)} style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.6rem 1.1rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
              border: 'none', borderBottom: `2px solid ${ativo ? 'var(--accent-blue)' : 'transparent'}`,
              background: 'transparent', color: ativo ? 'var(--accent-blue)' : 'var(--text-muted)',
              marginBottom: '-1px', transition: 'color 0.15s',
            }}>
              <Icon size={15} />{label}
            </button>
          )
        })}
      </div>

      {/* Conteúdo da aba */}
      {aba === 'disciplina'  && <AbaDisciplina filtro={filtro} />}
      {aba === 'performance' && <AbaPerformance />}
      {aba === 'estrategias' && <AbaEstrategias filtro={filtro} />}
      {aba === 'erros'       && <AbaErros filtro={filtro} />}
      {aba === 'meta'        && <AbaEficienciaMeta filtro={filtro} />}
      {aba === 'ativos'      && <AbaAtivos filtro={filtro} />}
      {aba === 'dias-semana' && <AbaDiaSemana filtro={filtro} />}
    </div>
  )
}
