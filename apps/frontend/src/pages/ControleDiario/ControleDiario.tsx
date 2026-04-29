import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  X, Loader2, CheckCircle, XCircle, Search, SlidersHorizontal, Trash2,
  RotateCcw,
} from 'lucide-react'
import api from '../../services/api'
import {
  formatUSD, formatPct, formatDate, formatTime,
  valueClass, statusLabel, statusClass,
} from '../../lib/format'
import { useCapitalStore } from '../../store/capitalStore'

// ─── Tipos ────────────────────────────────────────────────────
interface DiaResumo {
  id: string
  date: string
  capitalInicialReal: number
  bancaGlobal: number | null
  capitalFinal: number | null
  resultadoDia: number | null
  rentabilidade: number | null
  deposito: number
  status: string
  win: number
  loss: number
  ciclosRealizados: number
  isClosed: boolean
  seguiuSetup: boolean | null
  emocional: string | null
  errosDia: string[]
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
  bancaGlobal: number | null
  capitalFinal: number | null
  resultadoDia: number | null
  rentabilidade: number | null
  deposito: number
  status: string
  win: number
  loss: number
  ciclosRealizados: number
  isClosed: boolean
  seguiuSetup: boolean | null
  emocional: string | null
  errosDia: string[]
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
function DetalheModal({ diaId, onClose, onUpdate }: {
  diaId: string; onClose: () => void; onUpdate: () => void
}) {
  const navigate = useNavigate()
  const [dia, setDia] = useState<DiaDetalhe | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [reabrindo, setReabrindo] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [confirmExcluir, setConfirmExcluir] = useState(false)

  const carregar = useCallback(() => {
    setLoading(true)
    api.get(`/trading-days/${diaId}`)
      .then(r => setDia(r.data))
      .finally(() => setLoading(false))
  }, [diaId])

  useEffect(() => { carregar() }, [carregar])

  const handleExcluirTrade = async (tradeId: string) => {
    setLoading(true)
    setErrorLocal(null)
    try {
      await api.delete(`/trades/${tradeId}`)
      carregar()
      onUpdate()
    } catch {
      setErrorLocal('Erro ao excluir operação.')
      setLoading(false)
    } finally { setConfirmId(null) }
  }

  const handleReabrir = async () => {
    setReabrindo(true)
    setErrorLocal(null)
    try {
      await api.post(`/trading-days/${diaId}/reabrir`)
      onUpdate()
      navigate('/painel')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setErrorLocal(e?.response?.data?.error ?? 'Erro ao reabrir o dia.')
    } finally { setReabrindo(false) }
  }

  const handleExcluirDia = async () => {
    setExcluindo(true)
    setErrorLocal(null)
    try {
      await api.delete(`/trading-days/${diaId}`)
      onUpdate()
      onClose()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setErrorLocal(e?.response?.data?.error ?? 'Erro ao excluir o dia.')
    } finally { setExcluindo(false); setConfirmExcluir(false) }
  }

  const resultado = dia?.resultadoDia ?? 0
  const isPos = resultado > 0
  const tipoColor: Record<string, string> = { ENTR: '#3b82f6', MG1: '#f59e0b', MG2: '#f43f5e' }

  // Regras de negócio para os botões
  const hoje = new Date()
  const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
  // diaStr extrai a data UTC do campo (que bate com o calendário armazenado no banco)
  const diaStr = dia ? new Date(dia.date).toISOString().slice(0, 10) : ''
  const podeReabrir = diaStr === hojeStr
  const podeExcluir = dia ? dia.trades.length === 0 : false

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 680, maxHeight: '88vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>
              {dia ? formatDate(dia.date) : 'Carregando...'}
            </h2>
            {dia && (
              <span className={statusClass(dia.status, dia.isClosed)} style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '0.25rem', display: 'inline-block' }}>
                {statusLabel(dia.status, dia.isClosed)}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {/* Ações do dia fechado */}
            {dia?.isClosed && (
              <>
                <button
                  className="btn btn-outline"
                  style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', color: podeReabrir ? 'var(--accent-blue)' : 'var(--text-muted)', borderColor: podeReabrir ? 'var(--accent-blue)' : 'var(--border)' }}
                  onClick={handleReabrir}
                  disabled={reabrindo || !podeReabrir}
                  title={podeReabrir ? 'Reabrir este dia para edições' : 'Só é possível reabrir o dia de hoje'}
                >
                  {reabrindo
                    ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    : <><RotateCcw size={13} /> Reabrir Dia</>}
                </button>
                {confirmExcluir ? (
                  <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', background: 'rgba(244,63,94,0.1)', padding: '0.3rem 0.5rem', borderRadius: '0.4rem', border: '1px solid rgba(244,63,94,0.3)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--accent-loss)', fontWeight: 600 }}>Excluir dia?</span>
                    <button className="btn btn-danger" style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem' }} onClick={handleExcluirDia} disabled={excluindo}>
                      {excluindo ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : 'Sim'}
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem' }} onClick={() => setConfirmExcluir(false)}>Não</button>
                  </div>
                ) : (
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem', color: podeExcluir ? 'var(--accent-loss)' : 'var(--text-muted)' }}
                    onClick={() => setConfirmExcluir(true)}
                    disabled={!podeExcluir}
                    title={podeExcluir ? 'Excluir este dia' : 'Só é possível excluir um dia sem operações'}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </>
            )}
            <button className="btn btn-ghost" style={{ padding: '0.4rem' }} onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : dia ? (
          <>
            {errorLocal && (
              <div style={{ marginBottom: '1rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: 'var(--accent-loss)', fontSize: '0.8rem' }}>
                {errorLocal}
              </div>
            )}

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.625rem', marginBottom: '1.25rem' }}>
              {[
                { label: 'Banca Global', value: formatUSD(dia.bancaGlobal || dia.capitalInicialReal), color: 'var(--text-primary)' },
                { label: 'Cap. Corretora', value: formatUSD(dia.capitalInicialReal), color: 'var(--text-primary)' },
                { label: 'Resultado', value: (isPos ? '+' : '') + formatUSD(resultado), color: isPos ? 'var(--accent-win)' : 'var(--accent-loss)' },
                { label: 'Rentab. Global', value: formatPct(dia.rentabilidade), color: isPos ? 'var(--accent-win)' : 'var(--accent-loss)' },
                { label: 'Win / Loss', value: `${dia.win}W  ${dia.loss}L`, color: 'var(--text-primary)' },
                { 
                  label: 'Dep./Saque', 
                  value: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      {dia.deposito !== 0 && (
                        <div style={{ color: dia.deposito > 0 ? 'var(--accent-win)' : 'var(--accent-loss)', fontSize: '0.8rem' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>CORR:</span> {(dia.deposito >= 0 ? '+' : '') + formatUSD(dia.deposito)}
                        </div>
                      )}
                      {((dia as any).depositoReserva || 0) !== 0 && (
                        <div style={{ color: (dia as any).depositoReserva > 0 ? 'var(--accent-win)' : 'var(--accent-loss)', fontSize: '0.8rem' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>RES:</span> {((dia as any).depositoReserva >= 0 ? '+' : '') + formatUSD((dia as any).depositoReserva)}
                        </div>
                      )}
                      {dia.deposito === 0 && ((dia as any).depositoReserva || 0) === 0 && '—'}
                    </div>
                  ),
                  color: 'inherit' 
                },
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
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>Disciplina</div>
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
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{dia.emocional ?? '—'}</div>
              </div>
            </div>

            {/* Erros do Dia */}
            {dia.errosDia?.length > 0 && (
              <div style={{ marginBottom: '1.25rem', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.2)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--accent-loss)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem', fontWeight: 600 }}>Erros do Dia</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {dia.errosDia.map((e, i) => (
                    <span key={i} style={{ padding: '0.2rem 0.625rem', borderRadius: 9999, background: 'rgba(244,63,94,0.12)', color: 'var(--accent-loss)', fontSize: '0.78rem', fontWeight: 500, border: '1px solid rgba(244,63,94,0.25)' }}>{e}</span>
                  ))}
                </div>
              </div>
            )}

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
                        <th>Ciclo</th><th>Tipo</th><th>Ativo</th><th>Valor</th>
                        <th>Origem</th><th>Status</th><th>Resultado</th><th>Hora</th>
                        <th style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {dia.trades.map(t => (
                        <tr key={t.id}>
                          <td style={{ color: 'var(--text-muted)' }}>#{t.ciclo?.numero ?? '—'}</td>
                          <td><span style={{ fontWeight: 700, color: tipoColor[t.tipo] ?? 'var(--text-primary)' }}>{t.tipo}</span></td>
                          <td style={{ fontWeight: 500 }}>{t.ativo}</td>
                          <td>{formatUSD(t.valor)}</td>
                          <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{t.motivo?.nome ?? t.motivoOutro ?? '—'}</td>
                          <td>
                            <span className={`badge ${t.status === 'WIN' ? 'badge-win' : t.status === 'LOSS' ? 'badge-loss' : 'badge-neutral'}`}>{t.status}</span>
                          </td>
                          <td className={valueClass(t.resultado)} style={{ fontWeight: 600 }}>
                            {t.resultado != null ? (t.resultado > 0 ? '+' : '') + formatUSD(t.resultado) : '—'}
                          </td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatTime(t.horario)}</td>
                          <td style={{ position: 'relative' }}>
                            {!dia.isClosed && (confirmId === t.id ? (
                              <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center', background: 'rgba(244,63,94,0.1)', padding: '0.1rem 0.3rem', borderRadius: '0.3rem', position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
                                <button className="btn btn-danger" style={{ padding: '0.1rem 0.3rem', fontSize: '0.6rem' }} onClick={() => handleExcluirTrade(t.id)} disabled={loading}>Sim</button>
                                <button className="btn btn-ghost" style={{ padding: '0.1rem 0.3rem', fontSize: '0.6rem' }} onClick={() => setConfirmId(null)}>Não</button>
                              </div>
                            ) : (
                              <button className="btn btn-ghost" style={{ padding: '0.2rem', color: 'var(--text-muted)' }} onClick={() => setConfirmId(t.id)} title="Excluir operação">
                                <Trash2 size={13} />
                              </button>
                            ))}
                          </td>
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
  const navigate = useNavigate()
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

  const diasFiltrados = dias.filter(d => {
    const noMes = d.date.slice(0, 7) === mes
    const naBusca = !busca || d.date.includes(busca) || d.status.includes(busca.toUpperCase())
    const noStatus = filtroStatus === 'TODOS' || d.status === filtroStatus
    return noMes && naBusca && noStatus
  })

  // KPIs do mês
  const totalDias = diasFiltrados.length
  const diasPositivos = diasFiltrados.filter(d => (d.resultadoDia ?? 0) > 0).length
  const diasNegativos = diasFiltrados.filter(d => (d.resultadoDia ?? 0) < 0).length
  const resultadoAcumulado = diasFiltrados.reduce((s, d) => s + (d.resultadoDia ?? 0), 0)
  const totalWin = diasFiltrados.reduce((s, d) => s + d.win, 0)
  const totalLoss = diasFiltrados.reduce((s, d) => s + d.loss, 0)
  const taxaAcerto = totalWin + totalLoss > 0 ? totalWin / (totalWin + totalLoss) : null
  const seguiuSetupCount = diasFiltrados.filter(d => d.seguiuSetup === true).length

  // Banca Global real-time
  const { capital } = useCapitalStore()
  const bancaAtual = capital?.bancaGlobalUSD ?? null

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
            <input className="input" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} style={{ paddingLeft: '2rem', width: 140, fontSize: '0.82rem' }} />
          </div>
          <select className="input" style={{ fontSize: '0.82rem', width: 150 }} value={mes} onChange={e => setMes(e.target.value)}>
            {meses.map(m => <option key={m} value={m}>{mesLabel(m)}</option>)}
          </select>
          <select className="input" style={{ fontSize: '0.82rem', width: 160 }} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
            <option value="TODOS">Todos os status</option>
            <option value="META_IDEAL">Meta Ideal</option>
            <option value="META_MAXIMA">Meta Máxima</option>
            <option value="META_NAO_ATINGIDA">Meta não atingida</option>
            <option value="OPERANDO">Operando</option>
            <option value="ATENCAO">Atenção</option>
            <option value="STOP">Stop</option>
          </select>
        </div>
      </div>

      {/* KPIs do mês enxutos (Stat Bar) */}
      {totalDias > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Main Banner: Banca Global atual desvinculada do Mês */}
          <div className="card shadow-lg" style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
            padding: '1.25rem 1.5rem', background: 'var(--bg-surface)' 
          }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Patrimônio Consolidado</p>
              <h2 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                {bancaAtual != null ? formatUSD(bancaAtual) : '—'}
              </h2>
            </div>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-end' }}>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Composição</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ background: 'var(--bg-hover)', padding: '0.3rem 0.6rem', borderRadius: '0.4rem', border: '1px solid var(--border)', textAlign: 'right' }}>
                  <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Corretora</p>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{capital ? formatUSD(capital.capitalCorretoraUSD) : '—'}</p>
                </div>
                <div style={{ background: 'var(--bg-hover)', padding: '0.3rem 0.6rem', borderRadius: '0.4rem', border: '1px solid var(--border)', textAlign: 'right' }}>
                  <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Reserva</p>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{capital ? formatUSD(capital.bancaGlobalUSD - capital.capitalCorretoraUSD) : '—'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stat Bar (Filtros do mês) */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', padding: '0.875rem 1.25rem', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <SlidersHorizontal size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Mês Atual: {mesLabel(mes)}</span>
            </div>

            <div style={{ width: '1px', height: '24px', background: 'var(--border)' }}></div>
            
            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>Dias Operados</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', justifyContent: 'center' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{totalDias}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}><span style={{ color: 'var(--accent-win)' }}>+{diasPositivos}</span> / <span style={{ color: 'var(--accent-loss)' }}>-{diasNegativos}</span></span>
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>Resultado</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: resultadoAcumulado >= 0 ? 'var(--accent-win)' : 'var(--accent-loss)' }}>
                  {resultadoAcumulado >= 0 ? '+' : ''}{formatUSD(resultadoAcumulado)}
                </p>
              </div>

              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>Operações</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  <span style={{ color: 'var(--accent-win)' }}>{totalWin}W</span>{' / '}<span style={{ color: 'var(--accent-loss)' }}>{totalLoss}L</span>
                </p>
              </div>

              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>Assertividade</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: taxaAcerto != null && taxaAcerto >= 0.6 ? 'var(--accent-win)' : 'var(--accent-loss)' }}>
                  {taxaAcerto != null ? formatPct(taxaAcerto, 0) : '—'}
                </p>
              </div>

              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>Disciplina</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', justifyItems: 'center' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-blue)' }}>{seguiuSetupCount}/{totalDias}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{totalDias > 0 ? `${Math.round(seguiuSetupCount / totalDias * 100)}%` : '—'}</span>
                </div>
              </div>
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
                <th title="Banca Global no início do dia">Banca Global</th>
                <th title="Capital da Corretora no início do dia">Corretora</th>
                <th>Resultado</th>
                <th>Rent.</th>
                <th>Dep./Saque</th>
                <th>Ops</th>
                <th>Ciclos</th>
                <th>Status</th>
                <th>Disciplina</th>
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
                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatUSD(d.bancaGlobal || d.capitalInicialReal)}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{formatUSD(d.capitalInicialReal)}</td>
                    <td className={valueClass(res)} style={{ fontWeight: 700 }}>
                      {d.resultadoDia != null ? (isPos ? '+' : '') + formatUSD(d.resultadoDia) : '—'}
                    </td>
                    <td className={valueClass(d.rentabilidade)} style={{ fontWeight: 600 }}>
                      {d.rentabilidade != null ? formatPct(d.rentabilidade) : '—'}
                    </td>
                    {/* Coluna Dep./Saque */}
                    <td style={{ fontWeight: 600, fontSize: '0.83rem', padding: '0.4rem' }}>
                      {d.deposito === 0 && ((d as any).depositoReserva || 0) === 0 ? (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', alignItems: 'flex-start' }}>
                          {d.deposito !== 0 && (
                            <span className={valueClass(d.deposito)} style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, padding: '0 0.15rem', border: '1px solid var(--border)', borderRadius: '3px' }}>C</span>
                              {(d.deposito > 0 ? '+' : '') + formatUSD(d.deposito)}
                            </span>
                          )}
                          {((d as any).depositoReserva || 0) !== 0 && (
                            <span className={valueClass((d as any).depositoReserva)} style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, padding: '0 0.15rem', border: '1px solid var(--border)', borderRadius: '3px' }}>R</span>
                              {((d as any).depositoReserva > 0 ? '+' : '') + formatUSD((d as any).depositoReserva)}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--accent-win)', fontWeight: 600 }}>{d.win}W</span>{' '}
                      <span style={{ color: 'var(--accent-loss)', fontWeight: 600 }}>{d.loss}L</span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>{d.ciclosRealizados}</td>
                    <td>
                      <span className={`badge ${statusClass(d.status, d.isClosed)}`} style={{ fontSize: '0.7rem' }}>
                        {statusLabel(d.status, d.isClosed)}
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
                    <td>
                      <button className="btn btn-ghost" style={{ padding: '0.3rem 0.625rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }} onClick={() => d.isClosed ? setDetalheId(d.id) : navigate('/painel')}>
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
            <span>Assertividade: <strong>{formatPct(taxaAcerto, 0)}</strong></span>
          )}
        </div>
      )}

      {/* Modal detalhe */}
      {detalheId && (
        <DetalheModal diaId={detalheId} onClose={() => setDetalheId(null)} onUpdate={carregar} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
