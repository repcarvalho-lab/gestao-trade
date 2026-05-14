import { useEffect, useState } from 'react'
import { Activity, Calendar, TrendingUp } from 'lucide-react'
import api from '../../../services/api'
import { PerformanceData, parseMesLabel, formatDateShort, fmtUSD, fmtPct } from './RelatoriosShared'

export default function AbaPerformance() {
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

  if (loading) return <div className="flex justify-center p-16"><Activity size={28} className="text-accent-blue animate-spin" /></div>
  if (error) return <div className="p-8 text-center text-accent-loss">{error}</div>
  if (!data) return null

  const thClass = "px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-text-muted border-b border-border whitespace-nowrap"
  const tdClass = "px-3.5 py-2.5 text-[0.82rem] font-mono font-semibold whitespace-nowrap transition-colors"

    const resultClass = (v: number) => v > 0 ? 'text-accent-win' : v < 0 ? 'text-accent-loss' : 'text-text-muted'

  return (
    <div className="flex flex-col gap-5">

      {/* Seletor de período */}
      <div className="flex gap-2">
        {([['mes', 'Por Mês', Calendar], ['semana', 'Por Semana', TrendingUp]] as const).map(([key, label, Icon]) => {
          const ativo = periodo === key
          return (
            <button key={key} onClick={() => setPeriodo(key)} className={`
              flex items-center gap-1.5 px-4 py-2 rounded-lg text-[0.85rem] font-semibold cursor-pointer transition-all
              border ${ativo ? 'border-accent-blue bg-accent-blue/10 text-accent-blue' : 'border-border bg-transparent text-text-muted hover:bg-bg-hover'}
            `}>
              <Icon size={14} />{label}
            </button>
          )
        })}
      </div>

      {/* Tabela mensal */}
      {periodo === 'mes' && (
        <div className="card p-0 overflow-hidden border border-border backdrop-blur-sm bg-bg-card/50">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
                <tr>
                  <th className={`${thClass} text-left`}>Mês</th>
                  <th className={`${thClass} text-center`}>Dias Op.</th>
                  <th className={`${thClass} text-center`}>Positivos</th>
                  <th className={`${thClass} text-center`}>Taxa Acerto</th>
                  <th className={`${thClass} text-center`}>Capital Inicial</th>
                  <th className={`${thClass} text-center`}>Resultado</th>
                  <th className={`${thClass} text-center`}>Dep./Saques</th>
                  <th className={`${thClass} text-center`}>Rentab. Total</th>
                  <th className={`${thClass} text-center`}>Capital Final</th>
                  <th className={`${thClass} text-center`}>Melhor Dia</th>
                  <th className={`${thClass} text-center`}>Pior Dia</th>
                </tr>
              </thead>
              <tbody>
                {data.meses.length === 0 && (
                  <tr><td colSpan={10} className="p-8 text-center text-text-muted">Nenhum mês fechado.</td></tr>
                )}
                {data.meses.map(m => (
                  <tr key={m.id} className="border-t border-border transition-colors hover:bg-bg-hover group">
                    <td className="px-3.5 py-2.5 text-[0.875rem] font-semibold text-text-primary group-hover:text-accent-blue transition-colors">{parseMesLabel(m.mes)}</td>
                    <td className={`${tdClass} text-center text-text-primary`}>{m.diasOperados}</td>
                    <td className={`${tdClass} text-center text-text-primary`}>
                      {m.diasPositivos} <span className="text-text-muted font-normal">({m.diasOperados > 0 ? ((m.diasPositivos / m.diasOperados) * 100).toFixed(0) : 0}%)</span>
                    </td>
                    <td className={`${tdClass} text-center text-text-primary`}>{fmtPct(m.taxaAcertoMedia)}</td>
                    <td className={`${tdClass} text-center text-text-primary`}>{fmtUSD(m.capitalInicial)}</td>
                    <td className={`${tdClass} text-center ${resultClass(m.lucroTotal)}`}>{m.lucroTotal >= 0 ? '+' : ''}{fmtUSD(m.lucroTotal)}</td>
                    <td className={`${tdClass} text-center ${resultClass(m.vlDepositadoSacado)}`}>{m.vlDepositadoSacado >= 0 ? '+' : ''}{fmtUSD(m.vlDepositadoSacado)}</td>
                    <td className={`${tdClass} text-center ${resultClass(m.rentabTotal)}`}>{m.rentabTotal >= 0 ? '+' : ''}{fmtPct(m.rentabTotal)}</td>
                    <td className={`${tdClass} text-center text-text-primary`}>{fmtUSD(m.capitalFinal)}</td>
                    <td className={`${tdClass} text-center text-accent-win`}>+{fmtUSD(m.maiorGain)}</td>
                    <td className={`${tdClass} text-center text-accent-loss`}>{fmtUSD(m.maiorLoss)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabela semanal */}
      {periodo === 'semana' && (
        <div className="card p-0 overflow-hidden border border-border backdrop-blur-sm bg-bg-card/50">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
                <tr>
                  <th className={`${thClass} text-left`}>Semana</th>
                  <th className={`${thClass} text-center`}>Dias Op.</th>
                  <th className={`${thClass} text-center`}>Positivos</th>
                  <th className={`${thClass} text-center`}>Taxa Acerto</th>
                  <th className={`${thClass} text-center`}>Capital Inicial</th>
                  <th className={`${thClass} text-center`}>Resultado</th>
                  <th className={`${thClass} text-center`}>Dep./Saques</th>
                  <th className={`${thClass} text-center`}>Rentab. Total</th>
                  <th className={`${thClass} text-center`}>Capital Final</th>
                  <th className={`${thClass} text-center`}>Melhor Dia</th>
                  <th className={`${thClass} text-center`}>Pior Dia</th>
                </tr>
              </thead>
              <tbody>
                {data.semanas.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-text-muted">Nenhuma semana registrada.</td></tr>
                )}
                {[...data.semanas].reverse().map(s => (
                  <tr key={s.id} className="border-t border-border transition-colors hover:bg-bg-hover group">
                    <td className="px-3.5 py-2.5 text-[0.875rem] font-semibold text-text-primary whitespace-nowrap group-hover:text-accent-blue transition-colors">
                      {formatDateShort(s.dataInicial)} – {formatDateShort(s.dataFinal)}
                    </td>
                    <td className={`${tdClass} text-center text-text-primary`}>{s.diasOperados}</td>
                    <td className={`${tdClass} text-center text-text-primary`}>
                      {s.diasPositivos} <span className="text-text-muted font-normal">({s.diasOperados > 0 ? ((s.diasPositivos / s.diasOperados) * 100).toFixed(0) : 0}%)</span>
                    </td>
                    <td className={`${tdClass} text-center text-text-primary`}>{fmtPct(s.taxaAcerto)}</td>
                    <td className={`${tdClass} text-center text-text-primary`}>{fmtUSD(s.capitalInicial)}</td>
                    <td className={`${tdClass} text-center ${resultClass(s.lucroTotal)}`}>{s.lucroTotal >= 0 ? '+' : ''}{fmtUSD(s.lucroTotal)}</td>
                    <td className={`${tdClass} text-center ${resultClass(s.vlDepositadoSacado)}`}>{s.vlDepositadoSacado >= 0 ? '+' : ''}{fmtUSD(s.vlDepositadoSacado)}</td>
                    <td className={`${tdClass} text-center ${resultClass(s.rentabTotal)}`}>{s.rentabTotal >= 0 ? '+' : ''}{fmtPct(s.rentabTotal)}</td>
                    <td className={`${tdClass} text-center text-text-primary`}>{fmtUSD(s.capitalFinal)}</td>
                    <td className={`${tdClass} text-center text-accent-win`}>+{fmtUSD(s.melhorDia)}</td>
                    <td className={`${tdClass} text-center text-accent-loss`}>{fmtUSD(s.piorDia)}</td>
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
