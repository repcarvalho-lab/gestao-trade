import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import api from '../../../services/api'
import { Filtro, ScoreData, buildParams } from './RelatoriosShared'

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

export default function ScoreCard({ filtro }: { filtro: Filtro }) {
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
    <div className="card h-[116px] flex items-center justify-center backdrop-blur-sm bg-bg-card/80">
      <Activity size={22} className="text-accent-blue animate-spin" />
    </div>
  )
  if (!data) return null

  const g   = GRADE_CONFIG[data.grade] ?? GRADE_CONFIG['Sem dados']
  const deg = Math.min(data.score, 100) * 3.6

  return (
    <div className="card grid grid-cols-[130px_1fr_auto] gap-8 items-center px-7 py-5 backdrop-blur-md shadow-lg transition-all hover:shadow-xl" style={{
      borderColor: g.border,
      background: g.bg,
    }}>
      <div className="flex justify-center">
        <div className="w-[108px] h-[108px] rounded-full shrink-0 flex items-center justify-center relative shadow-lg transition-all duration-700" style={{
          background: `conic-gradient(${g.color} ${deg}deg, rgba(255,255,255,0.07) ${deg}deg)`,
          boxShadow: `0 0 28px ${g.color}40`,
        }}>
          <div className="w-20 h-20 rounded-full flex flex-col items-center justify-center relative z-10 shadow-inner" style={{ background: 'var(--bg-surface)' }}>
            <span className="text-[1.65rem] font-black leading-none" style={{ color: g.color }}>{data.score}</span>
            <span className="text-[0.58rem] text-text-muted tracking-wider mt-0.5">/100</span>
          </div>
        </div>
      </div>

      {/* Grade + info */}
      <div className="flex flex-col justify-center">
        <p className="text-[0.68rem] text-text-muted uppercase tracking-[0.09em] mb-1.5 font-semibold">Score do Trader</p>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xl drop-shadow-md">{g.emoji}</span>
          <span className="text-xl font-extrabold tracking-tight" style={{ color: g.color }}>{data.grade}</span>
        </div>
        <p className="text-[0.78rem] text-text-secondary mb-1">{g.desc}</p>
        <p className="text-[0.72rem] text-text-muted">
          Baseado em <span className="text-text-primary font-semibold">{data.totalDias} dia{data.totalDias !== 1 ? 's' : ''}</span> fechados
        </p>
        {data.totalDias < 10 && (
          <p className="text-[0.68rem] text-accent-warn mt-1 bg-accent-warn/10 inline-block px-2 py-0.5 rounded border border-accent-warn/20">
            ⚠️ Score mais representativo com 10+ dias
          </p>
        )}
      </div>

      {/* Pilares */}
      {data.pilares && (
        <div className="flex flex-col gap-2.5 min-w-[220px]">
          {PILARES_CFG.map(p => {
            const s = data.pilares![p.key].score
            return (
              <div key={p.key} className="group">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[0.75rem] text-text-secondary font-medium">
                    {p.label} <span className="text-[0.65rem] text-text-muted">({p.peso})</span>
                  </span>
                  <span className="text-[0.75rem] font-bold font-mono" style={{ color: p.color }}>{s}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden ring-1 ring-inset ring-white/5">
                  <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${s}%`, background: p.color }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
