import { useState, useEffect, useCallback, Component, type ReactNode } from 'react'
import {
  Plus, X, CheckCircle, XCircle, ChevronRight, Loader2,
  TrendingUp, TrendingDown, Target, ShieldAlert, RefreshCw,
  DollarSign, AlertTriangle, Zap, BarChart2, Trash2, Pencil,
  ArrowDownCircle, ArrowUpCircle,
} from 'lucide-react'
import { usePainelStore, type Trade, type TradingDay } from '../../store/painelStore'
import { useConfigStore } from '../../store/configStore'
import api from '../../services/api'
import { formatUSD, formatBRL, formatPct, formatDateFull, formatTime, valueClass, statusLabel, statusClass } from '../../lib/format'

// ─── Tipos ────────────────────────────────────────────────────
interface MotivoEntrada { id: string; nome: string; ativo: boolean }
interface AtivoObj { id: string; nome: string; ativo: boolean; payout: number }
interface Movimento {
  id: string
  tipo: 'DEPOSITO' | 'SAQUE'
  valorUSD: number
  cambio: number
  valorBRL: number
  observacao: string | null
  data: string
}

// ─── StatusBadge ──────────────────────────────────────────────
function StatusBadge({ status, stopProximo, isClosed }: { status: string; stopProximo?: boolean; isClosed?: boolean }) {
  const isStop = status === 'STOP'
  const colors: Record<string, { bg: string; color: string; border: string }> = {
    OPERANDO:           { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: 'rgba(148,163,184,0.3)' },
    META_IDEAL:         { bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
    META_MAXIMA:        { bg: 'rgba(5,150,105,0.15)',  color: '#059669', border: 'rgba(5,150,105,0.3)' },
    ATENCAO:            { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
    STOP:               { bg: 'rgba(244,63,94,0.15)',  color: '#f43f5e', border: 'rgba(244,63,94,0.3)' },
    META_NAO_ATINGIDA:  { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: 'rgba(148,163,184,0.3)' },
  }
  const c = colors[status] ?? colors.OPERANDO
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span
        className={isStop ? 'animate-pulse-stop' : ''}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.35rem 1rem', borderRadius: 9999,
          background: c.bg, color: c.color, border: `1px solid ${c.border}`,
          fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.03em',
        }}
      >
        {statusLabel(status, isClosed)}
      </span>
      {stopProximo && status !== 'STOP' && (
        <span className="badge badge-warn" style={{ fontSize: '0.7rem' }}>
          <AlertTriangle size={11} /> Stop próximo
        </span>
      )}
    </div>
  )
}

// ─── Card de indicador ────────────────────────────────────────
function KpiCard({
  label, value, sub, color, icon: Icon, highlight,
}: {
  label: string; value: string; sub?: string; color?: string
  icon?: React.ElementType; highlight?: boolean
}) {
  return (
    <div className="card" style={{
      borderColor: highlight ? 'rgba(59,130,246,0.4)' : undefined,
      background: highlight ? 'rgba(59,130,246,0.05)' : undefined,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
        {Icon && <Icon size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
      </div>
      <div style={{ marginTop: '0.5rem', fontSize: '1.35rem', fontWeight: 700, color: color ?? 'var(--text-primary)', lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

// ─── Modal: Iniciar Dia ───────────────────────────────────────
function IniciarDiaModal({ temDiasAnteriores, onClose, onCreated }: {
  temDiasAnteriores: boolean; onClose: () => void; onCreated: () => void
}) {
  const { criarDia } = usePainelStore()
  const hoje = new Date()
  const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
  const [data, setData] = useState(hojeStr)
  const [capital, setCapital] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isRetroativo = data < hojeStr

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    let val: number | undefined
    if (!temDiasAnteriores) {
      val = parseFloat(capital.replace(',', '.'))
      if (isNaN(val) || val <= 0) { setError('Informe um capital válido.'); return }
    }
    setLoading(true)
    try {
      await criarDia(val, data)
      onCreated()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e?.response?.data?.error ?? 'Erro ao criar o dia')
    } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>
              {isRetroativo ? 'Registrar Dia Anterior' : 'Iniciar Novo Dia'}
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {isRetroativo ? 'Inserção retroativa de operações passadas' : new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </p>
          </div>
          <button className="btn btn-ghost" style={{ padding: '0.4rem' }} onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label" htmlFor="dia-data">Data</label>
            <input id="dia-data" className="input" type="date" value={data} max={hojeStr} onChange={e => setData(e.target.value)} required />
            {isRetroativo && (
              <div style={{ marginTop: '0.4rem', padding: '0.4rem 0.75rem', borderRadius: '0.4rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', fontSize: '0.78rem' }}>
                ⚠ Dia retroativo — você poderá inserir as operações manualmente após criá-lo.
              </div>
            )}
          </div>
          {!temDiasAnteriores && (
            <div>
              <label className="label" htmlFor="capital-input">Capital Inicial do Dia (US$)</label>
              <input id="capital-input" className="input" type="number" step="0.01" min="0.01" placeholder="0.00" value={capital} onChange={e => setCapital(e.target.value)} autoFocus required style={{ fontSize: '1.15rem', padding: '0.75rem' }} />
            </div>
          )}
          {error && <div style={{ padding: '0.6rem 0.875rem', borderRadius: '0.5rem', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: 'var(--accent-loss)', fontSize: '0.8rem' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Criando...</> : isRetroativo ? 'Registrar Dia' : 'Iniciar Dia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal: Nova Operação ─────────────────────────────────────
function NovaOperacaoModal({ dia, motivos, ativosOp, onClose, onCreated }: {
  dia: TradingDay; motivos: MotivoEntrada[]; ativosOp: AtivoObj[]
  onClose: () => void; onCreated: () => void
}) {
  const { criarTrade, fetchDiaAberto } = usePainelStore()
  const { config } = useConfigStore()

  const tradesAbertos = dia.trades.filter(t => t.status === 'ABERTA')
  const ultimoTrade = dia.trades[dia.trades.length - 1]
  const sugestaoTipo = (() => {
    if (!ultimoTrade || ultimoTrade.status === 'WIN') return 'ENTR'
    if (ultimoTrade.tipo === 'ENTR' && ultimoTrade.status === 'LOSS') return 'MG1'
    if (ultimoTrade.tipo === 'MG1' && ultimoTrade.status === 'LOSS' && config?.mg2Habilitado) return 'MG2'
    return 'ENTR'
  })()

  const getValorSugerido = (t: string) => {
    if (!config || !dia) return ''
    if (t === 'ENTR') return (dia.valorENTR ?? 0).toFixed(2)
    if (t === 'MG1') {
      if (ultimoTrade && ultimoTrade.tipo === 'ENTR') return (ultimoTrade.valor * (config.fatorMG1 ?? 2)).toFixed(2)
      return (dia.valorMG1 ?? 0).toFixed(2)
    }
    if (ultimoTrade && ultimoTrade.tipo === 'MG1') return (ultimoTrade.valor * (config.fatorMG2 ?? 2)).toFixed(2)
    return (dia.valorMG2 ?? 0).toFixed(2)
  }

  const [tipo, setTipo] = useState<'ENTR' | 'MG1' | 'MG2'>(sugestaoTipo)
  const [ativo, setAtivo] = useState('')
  const [valor, setValor] = useState(() => getValorSugerido(sugestaoTipo))
  const [motivoId, setMotivoId] = useState('')
  const [motivoOutro, setMotivoOutro] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const motivoSelecionado = motivos.find(m => m.id === motivoId)

  useEffect(() => { setValor(getValorSugerido(tipo)) }, [tipo, dia, config, ultimoTrade])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ativo.trim()) { setError('Informe o ativo'); return }
    if (!motivoId) { setError('Selecione a origem da entrada'); return }
    if (motivoSelecionado?.nome === 'Outro' && !motivoOutro.trim()) { setError('Descreva a origem'); return }
    setLoading(true)
    try {
      await criarTrade({
        tipo, ativo: ativo.trim().toUpperCase(), valor: parseFloat(valor),
        motivoId: motivoSelecionado?.nome !== 'Outro' ? motivoId : undefined,
        motivoOutro: motivoSelecionado?.nome === 'Outro' ? motivoOutro : undefined,
      })
      await fetchDiaAberto()
      onCreated()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e?.response?.data?.error ?? 'Erro ao registrar operação')
    } finally { setLoading(false) }
  }

  const tiposDisponiveis = ['ENTR', 'MG1', ...(config?.mg2Habilitado ? ['MG2'] : [])]
  const temTradeAberto = tradesAbertos.length > 0

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>Nova Operação</h2>
            {sugestaoTipo !== 'ENTR' && (
              <div style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ChevronRight size={12} style={{ color: 'var(--accent-blue)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-blue)' }}>Sugestão: {sugestaoTipo}</span>
              </div>
            )}
          </div>
          <button className="btn btn-ghost" style={{ padding: '0.4rem' }} onClick={onClose}><X size={16} /></button>
        </div>
        {temTradeAberto && (
          <div style={{ marginBottom: '1rem', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', fontSize: '0.8rem' }}>
            ⚠️ Você tem uma operação em aberto. Marque o resultado antes de registrar uma nova entrada.
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label">Tipo de Entrada</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {tiposDisponiveis.map(t => (
                <button key={t} type="button" onClick={() => setTipo(t as 'ENTR' | 'MG1' | 'MG2')}
                  style={{
                    flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', transition: 'all 0.15s',
                    background: tipo === t ? (t === 'ENTR' ? 'rgba(59,130,246,0.2)' : t === 'MG1' ? 'rgba(245,158,11,0.2)' : 'rgba(244,63,94,0.2)') : 'var(--bg-surface)',
                    borderColor: tipo === t ? (t === 'ENTR' ? '#3b82f6' : t === 'MG1' ? '#f59e0b' : '#f43f5e') : 'var(--border)',
                    color: tipo === t ? (t === 'ENTR' ? '#3b82f6' : t === 'MG1' ? '#f59e0b' : '#f43f5e') : 'var(--text-secondary)',
                  }}>
                  {t}{t === sugestaoTipo && <span style={{ fontSize: '0.6rem', marginLeft: '0.3rem' }}>★</span>}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="trade-ativo">Ativo</label>
            <select id="trade-ativo" className="input" value={ativo} onChange={e => setAtivo(e.target.value)} required autoFocus>
              <option value="">Selecione...</option>
              {ativosOp.map(a => <option key={a.id} value={a.nome}>{a.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="trade-valor">Valor de Entrada (US$)</label>
            <input id="trade-valor" className="input" type="number" step="1" min="1" value={valor} onChange={e => setValor(e.target.value)} required />
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              Sugerido: {tipo === 'ENTR' ? formatUSD(dia.valorENTR) : tipo === 'MG1' ? formatUSD(dia.valorMG1) : formatUSD(dia.valorMG2)}
            </p>
          </div>
          <div>
            <label className="label" htmlFor="trade-motivo">Origem da Entrada</label>
            <select id="trade-motivo" className="input" value={motivoId} onChange={e => setMotivoId(e.target.value)} required>
              <option value="">Selecione...</option>
              {motivos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </div>
          {motivoSelecionado?.nome === 'Outro' && (
            <div>
              <label className="label" htmlFor="trade-motivo-outro">Descreva a origem</label>
              <input id="trade-motivo-outro" className="input" placeholder="Descreva a origem da entrada..." value={motivoOutro} onChange={e => setMotivoOutro(e.target.value)} />
            </div>
          )}
          {error && <div style={{ padding: '0.6rem 0.875rem', borderRadius: '0.5rem', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: 'var(--accent-loss)', fontSize: '0.8rem' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-success" style={{ flex: 1 }} disabled={loading || temTradeAberto}>
              {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Registrando...</> : 'Confirmar Entrada'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal: Editar Trade ──────────────────────────────────────
function EditarTradeModal({ trade, motivos, ativosOp, onClose, onSaved }: {
  trade: Trade; motivos: MotivoEntrada[]; ativosOp: AtivoObj[]
  onClose: () => void; onSaved: () => void
}) {
  const { editarTrade } = usePainelStore()
  const [ativo, setAtivo] = useState(trade.ativo)
  const [valor, setValor] = useState(String(trade.valor))
  const [motivoId, setMotivoId] = useState(trade.motivo ? motivos.find(m => m.nome === trade.motivo?.nome)?.id ?? '' : '')
  const [motivoOutro, setMotivoOutro] = useState(trade.motivoOutro ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const motivoSelecionado = motivos.find(m => m.id === motivoId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ativo.trim()) { setError('Informe o ativo'); return }
    setLoading(true)
    try {
      await editarTrade(trade.id, {
        ativo: ativo.trim().toUpperCase(),
        valor: parseFloat(valor),
        motivoId: motivoSelecionado && motivoSelecionado.nome !== 'Outro' ? motivoId : null,
        motivoOutro: motivoSelecionado?.nome === 'Outro' ? motivoOutro : null,
      })
      onSaved()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e?.response?.data?.error ?? 'Erro ao editar operação')
    } finally { setLoading(false) }
  }

  const tipoColor: Record<string, string> = { ENTR: '#3b82f6', MG1: '#f59e0b', MG2: '#f43f5e' }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>Editar Operação</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
              <span style={{ fontWeight: 700, color: tipoColor[trade.tipo], fontSize: '0.85rem' }}>{trade.tipo}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>· Ciclo #{trade.ciclo?.numero}</span>
            </div>
          </div>
          <button className="btn btn-ghost" style={{ padding: '0.4rem' }} onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label" htmlFor="edit-ativo">Ativo</label>
            <select id="edit-ativo" className="input" value={ativo} onChange={e => setAtivo(e.target.value)} required autoFocus>
              <option value="">Selecione...</option>
              {ativosOp.map(a => <option key={a.id} value={a.nome}>{a.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="edit-valor">Valor (US$)</label>
            <input id="edit-valor" className="input" type="number" step="1" min="1" value={valor} onChange={e => setValor(e.target.value)} required />
            {trade.status !== 'ABERTA' && (
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                O resultado será recalculado automaticamente.
              </p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="edit-motivo">Origem da Entrada</label>
            <select id="edit-motivo" className="input" value={motivoId} onChange={e => setMotivoId(e.target.value)}>
              <option value="">Selecione...</option>
              {motivos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </div>
          {motivoSelecionado?.nome === 'Outro' && (
            <div>
              <label className="label" htmlFor="edit-motivo-outro">Descreva a origem</label>
              <input id="edit-motivo-outro" className="input" value={motivoOutro} onChange={e => setMotivoOutro(e.target.value)} />
            </div>
          )}
          {error && <div style={{ padding: '0.6rem 0.875rem', borderRadius: '0.5rem', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: 'var(--accent-loss)', fontSize: '0.8rem' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</> : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal: Fechar Dia ────────────────────────────────────────
function FecharDiaModal({ dia, onClose, onFechado }: {
  dia: TradingDay; onClose: () => void; onFechado: () => void
}) {
  const { fecharDia } = usePainelStore()
  const [emocional, setEmocional] = useState(dia.emocional ?? '')
  const [seguiuSetup, setSeguiuSetup] = useState<boolean | null>(dia.seguiuSetup ?? null)
  const [errosDia, setErrosDia] = useState<string[]>(dia.errosDia ?? [])
  const [errosDisponiveis, setErrosDisponiveis] = useState<{ id: string; nome: string; gravidade: 'LEVE' | 'GRAVE' }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const temTradeAberto = dia.trades.some(t => t.status === 'ABERTA')

  useEffect(() => {
    api.get('/erros-dia').then(r => setErrosDisponiveis(r.data)).catch(() => {})
  }, [])

  const toggleErro = (nome: string) => {
    setErrosDia(prev => prev.includes(nome) ? prev.filter(e => e !== nome) : [...prev, nome])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emocional.trim()) { setError('Descreva o estado emocional'); return }
    if (seguiuSetup === null) { setError('Informe a Disciplina'); return }
    if (temTradeAberto) { setError('Feche todas as operações abertas antes de fechar o dia'); return }
    setLoading(true)
    try {
      await fecharDia(emocional, seguiuSetup, errosDia)
      onFechado()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e?.response?.data?.error ?? 'Erro ao fechar o dia')
    } finally { setLoading(false) }
  }

  const resultado = dia.resultadoDia ?? 0
  const isPositivo = resultado > 0

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>Fechar o Dia</h2>
          <button className="btn btn-ghost" style={{ padding: '0.4rem' }} onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', marginBottom: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Resultado</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: isPositivo ? 'var(--accent-win)' : 'var(--accent-loss)' }}>{isPositivo ? '+' : ''}{formatUSD(resultado)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</div>
              <div className={statusClass(dia.status, dia.isClosed)} style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '0.15rem' }}>{statusLabel(dia.status, dia.isClosed)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Trades</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{dia.win}W / {dia.loss}L</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rentabilidade</div>
              <div style={{ fontWeight: 600, color: isPositivo ? 'var(--accent-win)' : 'var(--accent-loss)' }}>{formatPct(dia.rentabilidade)}</div>
            </div>
          </div>
        </div>
        {temTradeAberto && (
          <div style={{ marginBottom: '1rem', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: 'var(--accent-loss)', fontSize: '0.8rem' }}>
            ⚠️ Finalize todas as operações abertas antes de fechar o dia.
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label" htmlFor="emocional-input">Estado Emocional do Dia</label>
            <textarea id="emocional-input" className="input" placeholder="Como foi seu estado emocional durante as operações?" value={emocional} onChange={e => setEmocional(e.target.value)} rows={3} style={{ resize: 'vertical', fontFamily: 'inherit' }} required />
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {[
                { label: 'Tranquila', text: 'Dia tranquilo, atingi a meta com facilidade.' },
                { label: 'Ansiosa', text: 'Ansiosa em alguns momentos, mas consegui manter o controle.' },
                { label: 'Controle Bom', text: 'Bom controle emocional, segui o plano com consistência.' },
                { label: 'Dia Difícil', text: 'Dia difícil, emocional abalado e dificuldade em seguir o plano.' }
              ].map(opt => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setEmocional(opt.text)}
                  style={{
                    fontSize: '0.75rem', padding: '0.3rem 0.625rem', borderRadius: '999px',
                    background: 'var(--bg-surface)', border: '1px solid var(--border)',
                    color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Disciplina</label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {[{ label: 'Sim', value: true }, { label: 'Não', value: false }].map(opt => (
                <button key={String(opt.value)} type="button" onClick={() => setSeguiuSetup(opt.value)}
                  style={{
                    flex: 1, padding: '0.625rem', borderRadius: '0.5rem', border: '1px solid', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', transition: 'all 0.15s',
                    background: seguiuSetup === opt.value ? (opt.value ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)') : 'var(--bg-surface)',
                    borderColor: seguiuSetup === opt.value ? (opt.value ? '#10b981' : '#f43f5e') : 'var(--border)',
                    color: seguiuSetup === opt.value ? (opt.value ? '#10b981' : '#f43f5e') : 'var(--text-secondary)',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {errosDisponiveis.length > 0 && (
            <div>
              <label className="label">Erros do Dia <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.75rem' }}>(opcional)</span></label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {errosDisponiveis.map(e => (
                  <label key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid', cursor: 'pointer', transition: 'all 0.15s', borderColor: errosDia.includes(e.nome) ? 'rgba(244,63,94,0.5)' : 'var(--border)', background: errosDia.includes(e.nome) ? 'rgba(244,63,94,0.08)' : 'var(--bg-surface)' }}>
                    <input type="checkbox" checked={errosDia.includes(e.nome)} onChange={() => toggleErro(e.nome)} style={{ accentColor: '#f43f5e', width: 15, height: 15, cursor: 'pointer' }} />
                    <span style={{ fontSize: '0.875rem', color: errosDia.includes(e.nome) ? 'var(--accent-loss)' : 'var(--text-primary)', fontWeight: errosDia.includes(e.nome) ? 600 : 400 }}>{e.nome}</span>
                    <span className={`badge badge-${e.gravidade === 'GRAVE' ? 'loss' : 'warn'}`} style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem', justifySelf: 'flex-end', marginLeft: 'auto' }}>
                      {e.gravidade === 'GRAVE' ? 'Grave' : 'Leve'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {error && <div style={{ padding: '0.6rem 0.875rem', borderRadius: '0.5rem', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: 'var(--accent-loss)', fontSize: '0.8rem' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Voltar</button>
            <button type="submit" className="btn btn-danger" style={{ flex: 1 }} disabled={loading || temTradeAberto}>
              {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Fechando...</> : 'Fechar o Dia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal: Novo Depósito/Saque ───────────────────────────────
function MovimentoModal({ dataISO, onClose, onSaved }: {
  dataISO: string; onClose: () => void; onSaved: () => void
}) {
  const { config } = useConfigStore()
  const { fetchDiaAberto } = usePainelStore()
  const [tipo, setTipo] = useState<'DEPOSITO' | 'SAQUE'>('DEPOSITO')
  const [valorUSD, setValorUSD] = useState('')
  const [cambio, setCambio] = useState(() => String(config?.cambioCompra ?? ''))
  const [observacao, setObservacao] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Câmbio sugerido conforme tipo
  useEffect(() => {
    if (tipo === 'DEPOSITO') setCambio(String(config?.cambioCompra ?? ''))
    else setCambio(String(config?.cambioVenda ?? ''))
  }, [tipo, config])

  const valorBRL = parseFloat(valorUSD) > 0 && parseFloat(cambio) > 0
    ? parseFloat(valorUSD) * parseFloat(cambio)
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const usd = parseFloat(valorUSD)
    const cam = parseFloat(cambio)
    if (isNaN(usd) || usd <= 0) { setError('Informe um valor válido'); return }
    if (isNaN(cam) || cam <= 0) { setError('Informe o câmbio'); return }
    setLoading(true)
    try {
      await api.post('/movimentos', {
        tipo,
        valorUSD: usd,
        cambio: cam,
        data: dataISO,
        observacao: observacao.trim() || undefined,
      })
      await fetchDiaAberto()
      onSaved()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e?.response?.data?.error ?? 'Erro ao registrar movimentação')
    } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>Novo Depósito / Saque</h2>
          <button className="btn btn-ghost" style={{ padding: '0.4rem' }} onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label">Tipo</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['DEPOSITO', 'SAQUE'] as const).map(t => (
                <button key={t} type="button" onClick={() => setTipo(t)}
                  style={{
                    flex: 1, padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                    background: tipo === t ? (t === 'DEPOSITO' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)') : 'var(--bg-surface)',
                    borderColor: tipo === t ? (t === 'DEPOSITO' ? '#10b981' : '#f43f5e') : 'var(--border)',
                    color: tipo === t ? (t === 'DEPOSITO' ? '#10b981' : '#f43f5e') : 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  }}>
                  {t === 'DEPOSITO' ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />}
                  {t === 'DEPOSITO' ? 'Depósito' : 'Saque'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="mov-usd">Valor (US$)</label>
            <input id="mov-usd" className="input" type="number" step="0.01" min="0.01" placeholder="0.00" value={valorUSD} onChange={e => setValorUSD(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="label" htmlFor="mov-cambio">Câmbio (R$/US$)</label>
            <input id="mov-cambio" className="input" type="number" step="0.01" min="0.01" placeholder="0.00" value={cambio} onChange={e => setCambio(e.target.value)} required />
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              Sugerido: compra {formatBRL(config?.cambioCompra)} · venda {formatBRL(config?.cambioVenda)}
            </p>
          </div>
          {valorBRL !== null && (
            <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>Valor em BRL</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: tipo === 'DEPOSITO' ? 'var(--accent-win)' : 'var(--accent-loss)' }}>
                {tipo === 'SAQUE' ? '-' : '+'}{formatBRL(valorBRL)}
              </div>
            </div>
          )}
          <div>
            <label className="label" htmlFor="mov-obs">Observação (opcional)</label>
            <input id="mov-obs" className="input" placeholder="Ex: Aporte mensal..." value={observacao} onChange={e => setObservacao(e.target.value)} />
          </div>
          {error && <div style={{ padding: '0.6rem 0.875rem', borderRadius: '0.5rem', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: 'var(--accent-loss)', fontSize: '0.8rem' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
            <button type="submit" className={`btn ${tipo === 'DEPOSITO' ? 'btn-success' : 'btn-danger'}`} style={{ flex: 1 }} disabled={loading}>
              {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Registrando...</> : `Confirmar ${tipo === 'DEPOSITO' ? 'Depósito' : 'Saque'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Painel de Depósitos/Saques do Dia ───────────────────────
function DepositoSaqueDia({ dia }: { dia: TradingDay }) {
  const { fetchDiaAberto } = usePainelStore()
  const [movimentos, setMovimentos] = useState<Movimento[]>([])
  const [showModal, setShowModal] = useState(false)
  const [deletando, setDeletando] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const dataISO = dia.date.slice(0, 10)

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get(`/movimentos?data=${dataISO}`)
      setMovimentos(data)
    } catch { /* silencioso */ }
  }, [dataISO])

  useEffect(() => { carregar() }, [carregar])

  const handleDelete = async (id: string) => {
    setDeletando(id)
    try {
      await api.delete(`/movimentos/${id}`)
      await fetchDiaAberto()
      await carregar()
    } finally {
      setDeletando(null)
      setConfirmDelete(null)
    }
  }

  const net = movimentos.reduce((s, m) => s + (m.tipo === 'DEPOSITO' ? m.valorUSD : -m.valorUSD), 0)

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            Depósitos / Saques do Dia
          </div>
          {movimentos.length > 0 && (
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: net >= 0 ? 'var(--accent-win)' : 'var(--accent-loss)', marginTop: '0.1rem' }}>
              Líquido: {net >= 0 ? '+' : ''}{formatUSD(net)}
            </div>
          )}
        </div>
        <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }} onClick={() => setShowModal(true)}>
          <Plus size={13} /> Novo
        </button>
      </div>

      {movimentos.length === 0 ? (
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, textAlign: 'center', padding: '0.5rem 0' }}>
          Nenhum depósito ou saque registrado hoje.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {movimentos.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.625rem', borderRadius: '0.4rem', background: 'var(--bg-surface)' }}>
              <div style={{ flexShrink: 0 }}>
                {m.tipo === 'DEPOSITO'
                  ? <ArrowDownCircle size={14} style={{ color: 'var(--accent-win)' }} />
                  : <ArrowUpCircle size={14} style={{ color: 'var(--accent-loss)' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: m.tipo === 'DEPOSITO' ? 'var(--accent-win)' : 'var(--accent-loss)' }}>
                  {m.tipo === 'DEPOSITO' ? '+' : '-'}{formatUSD(m.valorUSD)}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                  · {formatBRL(m.valorBRL)} @ {m.cambio.toFixed(2)}
                </span>
                {m.observacao && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>{m.observacao}</span>}
              </div>
              <div>
                {confirmDelete === m.id ? (
                  <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
                    <button className="btn btn-danger" style={{ padding: '0.1rem 0.4rem', fontSize: '0.65rem' }} onClick={() => handleDelete(m.id)} disabled={deletando === m.id}>Sim</button>
                    <button className="btn btn-ghost" style={{ padding: '0.1rem 0.4rem', fontSize: '0.65rem' }} onClick={() => setConfirmDelete(null)}>Não</button>
                  </div>
                ) : (
                  <button className="btn btn-ghost" style={{ padding: '0.2rem', color: 'var(--text-muted)' }} onClick={() => setConfirmDelete(m.id)}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <MovimentoModal
          dataISO={dia.date.slice(0, 10)}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); carregar() }}
        />
      )}
    </div>
  )
}

// ─── Linha de trade na tabela ─────────────────────────────────
function TradeRow({ trade, motivos, ativosOp, onMarcar }: {
  trade: Trade; motivos: MotivoEntrada[]; ativosOp: AtivoObj[]
  onMarcar: (id: string, res: 'WIN' | 'LOSS') => void
}) {
  const [loading, setLoading] = useState(false)
  const { excluirTrade } = usePainelStore()
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showEditar, setShowEditar] = useState(false)

  const handleMarcar = async (res: 'WIN' | 'LOSS') => {
    setLoading(true)
    setErrorLocal(null)
    try { await onMarcar(trade.id, res) }
    catch { setErrorLocal('Erro ao marcar resultado.') }
    finally { setLoading(false) }
  }

  const handleExcluir = async () => {
    setLoading(true)
    setErrorLocal(null)
    try { await excluirTrade(trade.id) }
    catch { setErrorLocal('Erro ao excluir operação.'); setLoading(false) }
  }

  const tipoColor: Record<string, string> = { ENTR: '#3b82f6', MG1: '#f59e0b', MG2: '#f43f5e' }
  const statusBadge = trade.status === 'WIN' ? 'badge-win' : trade.status === 'LOSS' ? 'badge-loss' : 'badge-neutral'

  return (
    <>
      <tr className="animate-slide-in">
        <td style={{ color: 'var(--text-muted)' }}>#{trade.ciclo?.numero ?? '—'}</td>
        <td><span style={{ fontWeight: 700, color: tipoColor[trade.tipo] ?? 'var(--text-primary)' }}>{trade.tipo}</span></td>
        <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{trade.ativo}</td>
        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatUSD(trade.valor)}</td>
        <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{trade.motivo?.nome ?? trade.motivoOutro ?? '—'}</td>
        <td><span className={`badge ${statusBadge}`}>{trade.status}</span></td>
        <td style={{ fontWeight: 700 }} className={valueClass(trade.resultado)}>
          {trade.resultado != null ? (trade.resultado > 0 ? '+' : '') + formatUSD(trade.resultado) : '—'}
        </td>
        <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatTime(trade.horario)}</td>
        <td style={{ position: 'relative' }}>
          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexWrap: 'nowrap' }}>
            {trade.status === 'ABERTA' && (
              <>
                <button className="btn btn-success" style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }} onClick={() => handleMarcar('WIN')} disabled={loading} title="WIN">
                  {loading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <><CheckCircle size={12} /> WIN</>}
                </button>
                <button className="btn btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }} onClick={() => handleMarcar('LOSS')} disabled={loading} title="LOSS">
                  <XCircle size={12} /> LOSS
                </button>
              </>
            )}
            {/* Editar — disponível para todos os trades */}
            <button className="btn btn-ghost" style={{ padding: '0.3rem 0.5rem', color: 'var(--accent-blue)' }} onClick={() => setShowEditar(true)} disabled={loading} title="Editar operação">
              <Pencil size={13} />
            </button>
            {/* Excluir com confirmação */}
            {showConfirm ? (
              <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center', background: 'rgba(244,63,94,0.1)', padding: '0.15rem 0.35rem', borderRadius: '0.35rem' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--accent-loss)', fontWeight: 600 }}>Excluir?</span>
                <button className="btn btn-danger" style={{ padding: '0.1rem 0.35rem', fontSize: '0.6rem' }} onClick={handleExcluir} disabled={loading}>Sim</button>
                <button className="btn btn-ghost" style={{ padding: '0.1rem 0.35rem', fontSize: '0.6rem' }} onClick={() => setShowConfirm(false)}>Não</button>
              </div>
            ) : (
              <button className="btn btn-ghost" style={{ padding: '0.3rem 0.5rem', color: 'var(--text-muted)' }} onClick={() => setShowConfirm(true)} disabled={loading} title="Excluir operação">
                <Trash2 size={13} />
              </button>
            )}
          </div>
          {errorLocal && <div style={{ position: 'absolute', bottom: '-5px', right: 0, fontSize: '0.65rem', color: 'var(--accent-loss)', background: 'var(--bg-card)', padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--accent-loss)', zIndex: 10 }}>{errorLocal}</div>}
        </td>
      </tr>
      {showEditar && (
        <EditarTradeModal
          trade={trade}
          motivos={motivos}
          ativosOp={ativosOp}
          onClose={() => setShowEditar(false)}
          onSaved={() => setShowEditar(false)}
        />
      )}
    </>
  )
}

// ─── Error Boundary ──────────────────────────────────────────
class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  constructor(props: { children: ReactNode }) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e: Error) { return { error: e.message } }
  render() {
    if (this.state.error) return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-loss)' }}>
        <h2>Erro inesperado no Painel</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{this.state.error}</p>
        <button className="btn btn-outline" style={{ marginTop: '1rem' }} onClick={() => window.location.reload()}>Recarregar Página</button>
      </div>
    )
    return this.props.children
  }
}

// ─── Página principal ─────────────────────────────────────────
export default function PainelDia() {
  return <ErrorBoundary><PainelDiaInner /></ErrorBoundary>
}

function PainelDiaInner() {
  const { diaAberto, isLoading, fetchDiaAberto, marcarResultado, excluirDia } = usePainelStore()
  const { config, fetchConfig } = useConfigStore()
  const [motivos, setMotivos] = useState<MotivoEntrada[]>([])
  const [ativosOp, setAtivosOp] = useState<AtivoObj[]>([])
  const [temDiasAnteriores, setTemDiasAnteriores] = useState(false)
  const [showIniciar, setShowIniciar] = useState(false)
  const [showNova, setShowNova] = useState(false)
  const [showFechar, setShowFechar] = useState(false)
  const [showExcluirConfirm, setShowExcluirConfirm] = useState(false)
  const [excluindoDia, setExcluindoDia] = useState(false)
  const [scoreResume, setScoreResume] = useState<{ score: number; grade: string; totalDias: number } | null>(null)
  const [ultimoDia, setUltimoDia] = useState<{ date: string; resultadoDia?: number; win?: number; loss?: number; rentabilidade?: number } | null>(null)

  const carregarDados = useCallback(async () => {
    try {
      const [{ data: mData }, { data: aData }, { data: diasList }] = await Promise.all([
        api.get('/motivos'),
        api.get('/ativos'),
        api.get('/trading-days')
      ])
      setMotivos(mData)
      setAtivosOp(aData)
      setTemDiasAnteriores(diasList.length > 0)
      const fechados = (diasList as any[]).filter((d: any) => d.isClosed)
      if (fechados.length > 0) setUltimoDia(fechados[0])
    } catch { /* silencioso */ }
    try {
      const { data: scoreData } = await api.get('/relatorios/score')
      setScoreResume({ score: scoreData.score, grade: scoreData.grade, totalDias: scoreData.totalDias })
    } catch { /* silencioso */ }
  }, [])

  useEffect(() => {
    fetchDiaAberto()
    fetchConfig()
    carregarDados()
  }, [fetchDiaAberto, fetchConfig, carregarDados])

  const handleMarcar = async (tradeId: string, resultado: 'WIN' | 'LOSS') => {
    await marcarResultado(tradeId, resultado)
  }

  const handleExcluirDia = async () => {
    setExcluindoDia(true)
    try { await excluirDia() }
    finally { setExcluindoDia(false); setShowExcluirConfirm(false) }
  }

  const dia = diaAberto

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 size={32} style={{ color: 'var(--accent-blue)', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)' }}>Carregando painel...</p>
      </div>
    )
  }

  if (!dia) {
    const hoje = new Date()
    const dataHoje = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(hoje)
    const fmtDiaCurto = (s: string) => {
      const d = new Date(s)
      return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    }
    const gColor = scoreResume
      ? scoreResume.score >= 85 ? '#f59e0b'
        : scoreResume.score >= 70 ? '#4ade80'
        : scoreResume.score >= 55 ? '#3b82f6'
        : scoreResume.score >= 40 ? '#fb923c' : '#94a3b8'
      : '#94a3b8'

    return (
      <div className="animate-slide-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Header */}
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Painel do Dia</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.85rem', textTransform: 'capitalize' }}>
            {dataHoje} &middot; Nenhum dia em aberto
          </p>
        </div>

        {/* CTA principal */}
        <div className="card" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
          padding: '3rem 2rem', gap: '1.5rem',
          background: 'linear-gradient(135deg, rgba(59,130,246,0.07) 0%, rgba(139,92,246,0.04) 100%)',
          borderColor: 'rgba(59,130,246,0.22)',
        }}>
          <div style={{
            width: 76, height: 76, borderRadius: 24,
            background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.15))',
            border: '1px solid rgba(59,130,246,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 36px rgba(59,130,246,0.18)',
          }}>
            <Zap size={34} style={{ color: 'var(--accent-blue)' }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>Pronto para operar?</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
              Inicie um novo dia para começar a registrar suas operações
            </p>
          </div>
          <button id="btn-iniciar-dia" className="btn btn-primary"
            style={{ padding: '0.875rem 2.5rem', fontSize: '1rem', fontWeight: 700 }}
            onClick={() => setShowIniciar(true)}>
            <Plus size={18} /> Iniciar Novo Dia
          </button>
        </div>

        {/* Stats rápidos — aparecem quando há histórico */}
        {temDiasAnteriores && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem' }}>

            {/* Score do Trader */}
            <div className="card" style={{
              borderColor: `${gColor}44`,
              background: `${gColor}0a`,
            }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Score do Trader</p>
              {scoreResume ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 900, color: gColor, lineHeight: 1 }}>{scoreResume.score}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/100</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', fontWeight: 700, color: gColor, marginTop: '0.3rem' }}>{scoreResume.grade}</p>
                </>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Calculando...</span>
              )}
            </div>

            {/* Último dia fechado */}
            <div className="card">
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                Último Dia{ultimoDia ? ` (${fmtDiaCurto(ultimoDia.date)})` : ''}
              </p>
              {ultimoDia ? (
                <>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: (ultimoDia.resultadoDia ?? 0) >= 0 ? 'var(--accent-win)' : 'var(--accent-loss)', lineHeight: 1 }}>
                    {(ultimoDia.resultadoDia ?? 0) >= 0 ? '+' : ''}{formatUSD(ultimoDia.resultadoDia ?? 0)}
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                    {ultimoDia.win ?? 0}W / {ultimoDia.loss ?? 0}L &middot; {formatPct(ultimoDia.rentabilidade ?? 0)}
                  </p>
                </>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>&mdash;</span>
              )}
            </div>

            {/* Total de dias */}
            <div className="card">
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Dias Fechados</p>
              <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
                {scoreResume?.totalDias ?? '—'}
              </span>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>no histórico total</p>
            </div>
          </div>
        )}

        {showIniciar && (
          <IniciarDiaModal
            temDiasAnteriores={temDiasAnteriores}
            onClose={() => setShowIniciar(false)}
            onCreated={() => { setShowIniciar(false); fetchDiaAberto() }}
          />
        )}
      </div>
    )
  }

  const resultado = dia.resultadoDia ?? 0
  const saldoAtual = dia.capitalInicialReal + resultado
  const stopAtingido = dia.status === 'STOP'
  const todosCiclosUsados = dia.ciclosRealizados >= (config?.maxCiclosPorDia ?? 3)
  const novaOperacaoDisabled = false

  const progressoMeta = dia.metaIdeal ? Math.min(100, Math.max(0, (resultado / dia.metaIdeal) * 100)) : 0
  const progressoMetaMaxima = dia.metaMaxima ? Math.min(100, Math.max(0, (resultado / dia.metaMaxima) * 100)) : 0
  const progressoStop = dia.stopDiario ? Math.min(100, Math.max(0, (Math.abs(Math.min(0, resultado)) / dia.stopDiario) * 100)) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Painel do Dia</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{formatDateFull(dia.date)}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <StatusBadge status={dia.status} stopProximo={dia.stopProximo} isClosed={dia.isClosed} />
          <button className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={fetchDiaAberto} title="Atualizar">
            <RefreshCw size={14} />
          </button>
          {/* Excluir Dia */}
          {showExcluirConfirm ? (
            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', background: 'rgba(244,63,94,0.1)', padding: '0.35rem 0.625rem', borderRadius: '0.5rem', border: '1px solid rgba(244,63,94,0.3)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--accent-loss)', fontWeight: 600 }}>Excluir este dia?</span>
              <button className="btn btn-danger" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={handleExcluirDia} disabled={excluindoDia}>
                {excluindoDia ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : 'Sim'}
              </button>
              <button className="btn btn-ghost" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setShowExcluirConfirm(false)}>Não</button>
            </div>
          ) : (
            <button className="btn btn-ghost" style={{ fontSize: '0.8rem', color: 'var(--accent-loss)' }} onClick={() => setShowExcluirConfirm(true)} title="Excluir este dia">
              <Trash2 size={14} /> Excluir Dia
            </button>
          )}
          <button id="btn-fechar-dia" className="btn btn-outline" style={{ fontSize: '0.85rem' }} onClick={() => setShowFechar(true)}>
            Fechar Dia
          </button>
          <button id="btn-nova-operacao" className="btn btn-success" style={{ fontSize: '0.85rem' }} onClick={() => setShowNova(true)} disabled={novaOperacaoDisabled}>
            <Plus size={16} /> Nova Operação
          </button>
        </div>
      </div>

      {/* ── Alerta de Stop ── */}
      {stopAtingido && (
        <div className="animate-pulse-stop" style={{ padding: '0.875rem 1.125rem', borderRadius: '0.75rem', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.4)', color: 'var(--accent-loss)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <ShieldAlert size={18} />
          Stop diário atingido — novas entradas bloqueadas para hoje.
        </div>
      )}

      {/* ── KPIs Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.875rem' }}>
        <KpiCard label="Banca (Saldo Atual)" value={formatUSD(saldoAtual)} icon={DollarSign} highlight />
        <KpiCard
          label="Capital Inicial"
          value={formatUSD(dia.capitalInicialReal)}
          sub={dia.deposito !== 0 ? `Dep/Saque: ${dia.deposito >= 0 ? '+' : ''}${formatUSD(dia.deposito)}` : 'Sem dep./saque'}
          icon={BarChart2}
        />
        <KpiCard
          label="Resultado"
          value={(resultado >= 0 ? '+' : '') + formatUSD(resultado)}
          sub={formatPct(dia.rentabilidade)}
          color={resultado > 0 ? 'var(--accent-win)' : resultado < 0 ? 'var(--accent-loss)' : undefined}
          icon={resultado >= 0 ? TrendingUp : TrendingDown}
        />
        <KpiCard
          label="Win / Loss"
          value={`${dia.win}W   ${dia.loss}L`}
          sub={dia.taxaAcerto != null ? `Taxa: ${formatPct(dia.taxaAcerto)}` : '—'}
        />
      </div>

      {/* ── Metas e Stops ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.875rem' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Metas</span>
            <Target size={14} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Meta Ideal ({formatPct(config?.metaIdealPct)})</span>
              <span style={{ fontWeight: 700, color: '#4ade80', fontSize: '0.9rem' }}>{formatUSD(dia.metaIdeal)}</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-surface)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, background: '#4ade80', width: `${progressoMeta}%`, transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Meta Máxima ({formatPct(config?.metaMaximaPct)})</span>
              <span style={{ fontWeight: 600, color: '#16a34a', fontSize: '0.85rem' }}>{formatUSD(dia.metaMaxima)}</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-surface)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, background: '#16a34a', width: `${progressoMetaMaxima}%`, transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <div>
                Falta p/ Ideal:{' '}
                <span style={{ color: resultado >= (dia.metaIdeal ?? 0) ? '#4ade80' : 'var(--text-primary)', fontWeight: 600 }}>
                  {resultado >= (dia.metaIdeal ?? 0) ? '✓ Atingida' : formatUSD(dia.faltaParaMeta)}
                </span>
              </div>
              <div>
                Falta p/ Máxima:{' '}
                <span style={{ color: resultado >= (dia.metaMaxima ?? 0) ? '#16a34a' : 'var(--text-primary)', fontWeight: 600 }}>
                  {resultado >= (dia.metaMaxima ?? 0) ? '✓ Atingida' : formatUSD(Math.max(0, (dia.metaMaxima ?? 0) - resultado))}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="card" style={{ borderColor: progressoStop > 70 ? 'rgba(244,63,94,0.4)' : undefined }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Stop Diário</span>
            <ShieldAlert size={14} style={{ color: progressoStop > 70 ? 'var(--accent-loss)' : 'var(--text-muted)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Limite ({formatPct(config?.stopDiarioPct)})</span>
              <span style={{ fontWeight: 700, color: 'var(--accent-loss)', fontSize: '0.9rem' }}>{formatUSD(dia.stopDiario)}</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-surface)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, background: progressoStop > 70 ? 'var(--accent-loss)' : 'var(--accent-warn)', width: `${progressoStop}%`, transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Consumido: <span style={{ fontWeight: 600, color: progressoStop > 70 ? 'var(--accent-loss)' : 'var(--text-primary)' }}>{progressoStop.toFixed(0)}%</span>
              {' · '}
              Espaço restante: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatUSD(dia.espacoAntesDoStop)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Ciclos + Valores Sugeridos ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
        <div className="card">
          <div style={{ marginBottom: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Ciclos no Dia</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{dia.ciclosRealizados}</span>
            <span style={{ color: 'var(--text-muted)' }}>/ {config?.maxCiclosPorDia ?? 3}</span>
          </div>
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.375rem' }}>
            {Array.from({ length: config?.maxCiclosPorDia ?? 3 }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < dia.ciclosRealizados ? 'var(--accent-blue)' : 'var(--bg-surface)', transition: 'background 0.3s' }} />
            ))}
          </div>
          {todosCiclosUsados && <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--accent-orange)' }}>⚠ Limite de ciclos atingido</div>}
        </div>
        <div className="card">
          <div style={{ marginBottom: '0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Valores Sugeridos</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {[
              { label: 'ENTR', value: dia.valorENTR, color: '#3b82f6' },
              { label: 'MG1', value: dia.valorMG1, color: '#f59e0b' },
              ...(config?.mg2Habilitado ? [{ label: 'MG2', value: dia.valorMG2, color: '#f43f5e' }] : []),
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center', padding: '0.5rem', borderRadius: '0.5rem', background: 'var(--bg-surface)' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color, marginBottom: '0.25rem', letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{formatUSD(value)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Depósitos/Saques ── */}
      <DepositoSaqueDia dia={dia} />

      {/* ── Tabela de Operações ── */}
      <div>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Operações do Dia
          {dia.trades.length > 0 && <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)', fontWeight: 400 }}>({dia.trades.length})</span>}
        </h3>
        {dia.trades.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', borderRadius: '0.75rem', border: '1px dashed var(--border)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Nenhuma operação registrada ainda hoje.<br />
            <span style={{ fontSize: '0.8rem' }}>Clique em "Nova Operação" para começar.</span>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Ciclo</th><th>Tipo</th><th>Ativo</th><th>Valor</th>
                  <th>Origem</th><th>Status</th><th>Resultado</th><th>Hora</th><th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {dia.trades.map(trade => (
                  <TradeRow key={trade.id} trade={trade} motivos={motivos} ativosOp={ativosOp} onMarcar={handleMarcar} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modais ── */}
      {showNova && dia && (
        <NovaOperacaoModal dia={dia} motivos={motivos} ativosOp={ativosOp} onClose={() => setShowNova(false)} onCreated={() => setShowNova(false)} />
      )}
      {showFechar && dia && (
        <FecharDiaModal dia={dia} onClose={() => setShowFechar(false)} onFechado={() => setShowFechar(false)} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
