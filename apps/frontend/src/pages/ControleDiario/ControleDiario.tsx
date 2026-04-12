import { useState, useEffect, useCallback } from 'react'
import {
  Calendar, ChevronRight,
  X, Loader2, CheckCircle, XCircle, Search, SlidersHorizontal,
} from 'lucide-react'
import api from '../../services/api'
import {
  formatUSD, formatPct, formatDate, formatTime,
  valueClass, statusLabel, statusClass,
} from '../../lib/format'

// ─── Tipos ────────────────────────────────────────────────────
interface DiaResumo {
  id: string
  date: string
  capitalInicialReal: number
  capitalFinal: number | null
  resultadoDia: number | null
  rentabilidade: number | null
  status: string
  win: number
  loss: number
  ciclosRealizados: number
  isClosed: boolean
  seguiuSetup: boolean | null
  emocional: string | null
  _count: { trades: number }
}

interface TradeDetalhe {
  id: string
  tipo: string
  ativo: string
  valor: number
  status: string
  resultado: number | null
  horario: string
  motivo: { nome: string } | null
  motivoOutro: string | null
  ciclo: { numero: number }
}

interface DiaDetalhe {
  id: string
  date: string
  capitalInicialReal: number
  capitalFinal: number | null
  resultadoDia: number | null
  rentabilidade: number | null
  status: string
  win: number
  loss: number
  ciclosRealizados: number
  isClosed: boolean
  seguiuSetup: boolean | null
  emocional: string | null
  trades: TradeDetalhe[]
}

// ─── Helpers ─────────────────────────────────────────────────
function mesAtualStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function gerarMesesDisponiveis(dias: DiaResumo[]): string[] {
  const meses = new Set<string>()
  meses.add(mesAtualStr())
  for (const d of dias) {
    const m = d.date.slice(0, 7)
    meses.add(m)
  }
  return Array.from(meses).sort((a, b) => b.localeCompare(a))
}

function mesLabel(mes: string): string {
  const [ano, m] = mes.split('-')
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${nomes[Number(m) - 1]}/${ano}`
}

// ─── Modal: Detalhe do Dia ────────────────────────────────────
function DetalheModal({ diaId, onClose }: { diaId: string; onClose: () => void }) {
  const [dia, setDia] = useState<DiaDetalhe | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/trading-days/${diaId}`)
      .then(r => setDia(r.data))
      .finally(() => setLoading(false))
  }, [diaId])

  const resultado = dia?.resultadoDia ?? 0
  const isPos = resultado > 0

  const tipoColor: Record<string, string> = { ENTR: '#3b82f6', MG1: '#f59e0b', MG2: '#f43f5e' }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: '85vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>
              {dia ? formatDate(dia.date) : 'Carregando...'}
            </h2>
            {dia && (
              <span className={statusClass(dia.status)} style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '0.25rem', display: 'inline-block' }}>
                {statusLabel(dia.status)}
              </span>
            )}
          </div>
          <button className="btn btn-ghost" style={{ padding: '0.4rem' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : dia ? (
          <>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.625rem', marginBottom: '1.25rem' }}>
              {[
                { label: 'Capital Inicial', value: formatUSD(dia.capitalInicialReal), color: 'var(--text-primary)' },
                { label: 'Capital Final', value: formatUSD(dia.capitalFinal), color: 'var(--text-primary)' },
                { label: 'Resultado', value: (isPos ? '+' : '') + formatUSD(resultado), color: isPos ? 'var(--accent-win)' : 'var(--accent-loss)' },
                { label: 'Rentabilidade', value: formatPct(dia.rentabilidade), color: isPos ? 'var(--accent-win)' : 'var(--accent-loss)' },
                { label: 'Win / Loss', value: `${dia.win}W  ${dia.loss}L`, color: 'var(--text-primary)' },
                { label: 'Ciclos', value: String(dia.ciclosRealizados), color: 'var(--text-primary)' },
              ].map(k => (
                <div key={k.label} style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>{k.label}</div>
                  <div style={{ fontWeight: 700, color: k.color, fontSize: '0.95rem' }}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* Setup + Emocional */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '1.25rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>Seguiu o Setup</div>
                {dia.seguiuSetup === null ? (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                ) : dia.seguiuSetup ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-win)', fontWeight: 600, fontSize: '0.875rem' }}>
                    <CheckCircle size={14} /> Sim
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-loss)', fontWeight: 600, fontSize: '0.875rem' }}>
                    <XCircle size={14} /> Não
                  </div>
                )}
              </div>
              <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>Emocional</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {dia.emocional ?? '—'}
                </div>
              </div>
            </div>

            {/* Trades */}
            <div>
              <h3 style={{ margin: '0 0 0.625rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Operações ({dia.trades.length})
              </h3>
              {dia.trades.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.82rem', border: '1px dashed var(--border)', borderRadius: '0.5rem' }}>
                  Nenhuma operação registrada.
                </div>
              ) : (
                <div className="table-container" style={{ maxHeight: 280, overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Ciclo</th>
                        <th>Tipo</th>
                        <th>Ativo</th>
                        <th>Valor</th>
                        <th>Motivo</th>
                        <th>Status</th>
                        <th>Resultado</th>
                        <th>Hora</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dia.trades.map(t => (
                        <tr key={t.id}>
                          <td style={{ color: 'var(--text-muted)' }}>#{t.ciclo.numero}</td>
                          <td><span style={{ fontWeight: 700, color: tipoColor[t.tipo] ?? 'var(--text-primary)' }}>{t.tipo}</span></td>
                          <td style={{ fontWeight: 500 }}>{t.ativo}</td>
                          <td>{formatUSD(t.valor)}</td>
                          <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {t.motivo?.nome ?? t.motivoOutro ?? '—'}
                          </td>
                          <td>
                            <span className={`badge ${t.status === 'WIN' ? 'badge-win' : t.status === 'LOSS' ? 'badge-loss' : 'badge-neutral'}`}>
                              {t.status}
                            </span>
                          </td>
                          <td className={valueClass(t.resultado)} style={{ fontWeight: 600 }}>
                            {t.resultado != null ? (t.resultado > 0 ? '+' : '') + formatUSD(t.resultado) : '—'}
                          </td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatTime(t.horario)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Dia não encontrado.</div>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────
export default function ControleDiario() {
  const [dias, setDias] = useState<DiaResumo[]>([])
  const [loading, setLoading] = useState(true)
  const [mes, setMes] = useState(mesAtualStr())
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS')
  const [detalheId, setDetalheId] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/trading-days')
      setDias(data)
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const meses = gerarMesesDisponiveis(dias)

  // Filtra por mês, busca e status
  const diasFiltrados = dias.filter(d => {
    const noMes = d.date.slice(0, 7) === mes
    const naBusca = !busca || d.date.includes(busca) || d.status.includes(busca.toUpperCase())
    const noStatus = filtroStatus === 'TODOS' || d.status === filtroStatus
    return noMes && naBusca && noStatus
  })

  // KPIs do mês filtrado
  const totalDias = diasFiltrados.length
  const diasPositivos = diasFiltrados.filter(d => (d.resultadoDia ?? 0) > 0).length
  const diasNegativos = diasFiltrados.filter(d => (d.resultadoDia ?? 0) < 0).length
  const resultadoAcumulado = diasFiltrados.reduce((s, d) => s + (d.resultadoDia ?? 0), 0)
  const totalWin = diasFiltrados.reduce((s, d) => s + d.win, 0)
  const totalLoss = diasFiltrados.reduce((s, d) => s + d.loss, 0)
  const taxaAcerto = totalWin + totalLoss > 0 ? totalWin / (totalWin + totalLoss) : null
  const seguiuSetupCount = diasFiltrados.filter(d => d.seguiuSetup === true).length

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 size={28} style={{ color: 'var(--accent-blue)', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)' }}>Carregando histórico...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={18} style={{ color: 'var(--accent-blue)' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Controle Diário</h1>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {dias.length} dia{dias.length !== 1 ? 's' : ''} registrado{dias.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input"
              placeholder="Buscar..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={{ paddingLeft: '2rem', width: 140, fontSize: '0.82rem' }}
            />
          </div>
          <select className="input" style={{ fontSize: '0.82rem', width: 150 }}
            value={mes} onChange={e => setMes(e.target.value)}>
            {meses.map(m => <option key={m} value={m}>{mesLabel(m)}</option>)}
          </select>
          <select className="input" style={{ fontSize: '0.82rem', width: 150 }}
            value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
            <option value="TODOS">Todos os status</option>
            <option value="META_IDEAL">Meta Ideal</option>
            <option value="META_MAXIMA">Meta Máxima</option>
            <option value="OPERANDO">Operando</option>
            <option value="ATENCAO">Atenção</option>
            <option value="STOP">Stop</option>
          </select>
        </div>
      </div>

      {/* KPIs do mês */}
      {totalDias > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
          <div className="card" style={{ textAlign: 'center', padding: '0.875rem' }}>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              <SlidersHorizontal size={10} style={{ display: 'inline', marginRight: 4 }} />Dias
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalDias}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              <span style={{ color: 'var(--accent-win)' }}>+{diasPositivos}</span>
              {' / '}
              <span style={{ color: 'var(--accent-loss)' }}>-{diasNegativos}</span>
            </div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '0.875rem' }}>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Resultado</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: resultadoAcumulado >= 0 ? 'var(--accent-win)' : 'var(--accent-loss)' }}>
              {resultadoAcumulado >= 0 ? '+' : ''}{formatUSD(resultadoAcumulado)}
            </div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '0.875rem' }}>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Operações</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              <span style={{ color: 'var(--accent-win)' }}>{totalWin}W</span>
              {' / '}
              <span style={{ color: 'var(--accent-loss)' }}>{totalLoss}L</span>
            </div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '0.875rem' }}>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Taxa de Acerto</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: taxaAcerto != null && taxaAcerto >= 0.6 ? 'var(--accent-win)' : 'var(--accent-loss)' }}>
              {taxaAcerto != null ? formatPct(taxaAcerto, 0) : '—'}
            </div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '0.875rem' }}>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Seguiu Setup</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-blue)' }}>
              {seguiuSetupCount}/{totalDias}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {totalDias > 0 ? `${Math.round(seguiuSetupCount / totalDias * 100)}%` : '—'}
            </div>
          </div>
        </div>
      )}

      {/* Tabela */}
      {diasFiltrados.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', borderRadius: '0.75rem', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
          {dias.length === 0
            ? 'Nenhum dia registrado ainda. Inicie um dia no Painel para começar.'
            : 'Nenhum dia encontrado para os filtros selecionados.'}
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Capital Inicial</th>
                <th>Capital Final</th>
                <th>Resultado</th>
                <th>Rent.</th>
                <th>Ops</th>
                <th>Ciclos</th>
                <th>Status</th>
                <th>Setup</th>
                <th style={{ minWidth: 180 }}>Emocional</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {diasFiltrados.map(d => {
                const res = d.resultadoDia ?? 0
                const isPos = res > 0
                return (
                  <tr key={d.id} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {formatDate(d.date)}
                        {!d.isClosed && <span className="badge badge-warn" style={{ fontSize: '0.6rem' }}>Aberto</span>}
                      </div>
                    </td>
                    <td>{formatUSD(d.capitalInicialReal)}</td>
                    <td>{d.capitalFinal != null ? formatUSD(d.capitalFinal) : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td className={valueClass(res)} style={{ fontWeight: 700 }}>
                      {d.resultadoDia != null ? (isPos ? '+' : '') + formatUSD(d.resultadoDia) : '—'}
                    </td>
                    <td className={valueClass(d.rentabilidade)} style={{ fontWeight: 600 }}>
                      {d.rentabilidade != null ? formatPct(d.rentabilidade) : '—'}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--accent-win)', fontWeight: 600 }}>{d.win}W</span>
                      {' '}
                      <span style={{ color: 'var(--accent-loss)', fontWeight: 600 }}>{d.loss}L</span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>{d.ciclosRealizados}</td>
                    <td>
                      <span className={`badge ${statusClass(d.status)}`} style={{ fontSize: '0.7rem' }}>
                        {statusLabel(d.status)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {d.seguiuSetup === null ? (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      ) : d.seguiuSetup ? (
                        <CheckCircle size={14} style={{ color: 'var(--accent-win)' }} />
                      ) : (
                        <XCircle size={14} style={{ color: 'var(--accent-loss)' }} />
                      )}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: 200 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.emocional ?? '—'}
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '0.3rem 0.625rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                        onClick={() => setDetalheId(d.id)}
                      >
                        <ChevronRight size={13} /> Ver
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Totais de rodapé */}
      {diasFiltrados.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '2rem', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <span>{diasFiltrados.length} dias em {mesLabel(mes)}</span>
          <span>
            Resultado acumulado:{' '}
            <strong className={valueClass(resultadoAcumulado)} style={{ fontWeight: 700 }}>
              {resultadoAcumulado >= 0 ? '+' : ''}{formatUSD(resultadoAcumulado)}
            </strong>
          </span>
          {taxaAcerto != null && (
            <span>Taxa de acerto: <strong>{formatPct(taxaAcerto, 0)}</strong></span>
          )}
        </div>
      )}

      {/* Modal detalhe */}
      {detalheId && (
        <DetalheModal diaId={detalheId} onClose={() => setDetalheId(null)} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
