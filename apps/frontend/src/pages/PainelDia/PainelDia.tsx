import { useState, useEffect, useCallback } from 'react'
import {
  Plus, X, CheckCircle, XCircle, ChevronRight, Loader2,
  TrendingUp, TrendingDown, Target, ShieldAlert, RefreshCw,
  DollarSign, AlertTriangle, Zap, BarChart2,
} from 'lucide-react'
import { usePainelStore, type Trade, type TradingDay } from '../../store/painelStore'
import { useConfigStore } from '../../store/configStore'
import api from '../../services/api'
import { formatUSD, formatPct, formatDateFull, formatTime, valueClass, statusLabel, statusClass } from '../../lib/format'

// ─── Tipos ────────────────────────────────────────────────────
interface MotivoEntrada { id: string; nome: string; ativo: boolean }

// ─── StatusBadge ──────────────────────────────────────────────
function StatusBadge({ status, stopProximo }: { status: string; stopProximo?: boolean }) {
  const isStop = status === 'STOP'
  const colors: Record<string, { bg: string; color: string; border: string }> = {
    OPERANDO:    { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: 'rgba(148,163,184,0.3)' },
    META_IDEAL:  { bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
    META_MAXIMA: { bg: 'rgba(5,150,105,0.15)',  color: '#059669', border: 'rgba(5,150,105,0.3)' },
    ATENCAO:     { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
    STOP:        { bg: 'rgba(244,63,94,0.15)',  color: '#f43f5e', border: 'rgba(244,63,94,0.3)' },
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
        {statusLabel(status)}
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
  label: string
  value: string
  sub?: string
  color?: string
  icon?: React.ElementType
  highlight?: boolean
}) {
  return (
    <div
      className="card"
      style={{
        borderColor: highlight ? 'rgba(59,130,246,0.4)' : undefined,
        background: highlight ? 'rgba(59,130,246,0.05)' : undefined,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {label}
        </span>
        {Icon && <Icon size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
      </div>
      <div style={{ marginTop: '0.5rem', fontSize: '1.35rem', fontWeight: 700, color: color ?? 'var(--text-primary)', lineHeight: 1.2 }}>
        {value}
      </div>
      {sub && <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

// ─── Modal: Iniciar Dia ───────────────────────────────────────
function IniciarDiaModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { criarDia } = usePainelStore()

  const hojeStr = new Date().toISOString().split('T')[0]
  const [data, setData] = useState(hojeStr)
  const [capital, setCapital] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isRetroativo = data < hojeStr

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseFloat(capital.replace(',', '.'))
    if (isNaN(val) || val <= 0) { setError('Informe um capital válido.'); return }
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
              {isRetroativo
                ? 'Inserção retroativa de operações passadas'
                : new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </p>
          </div>
          <button className="btn btn-ghost" style={{ padding: '0.4rem' }} onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Data */}
          <div>
            <label className="label" htmlFor="dia-data">Data</label>
            <input
              id="dia-data"
              className="input"
              type="date"
              value={data}
              max={hojeStr}
              onChange={e => setData(e.target.value)}
              required
            />
            {isRetroativo && (
              <div style={{ marginTop: '0.4rem', padding: '0.4rem 0.75rem', borderRadius: '0.4rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', fontSize: '0.78rem' }}>
                ⚠ Dia retroativo — você poderá inserir as operações manualmente após criá-lo.
              </div>
            )}
          </div>

          {/* Capital */}
          <div>
            <label className="label" htmlFor="capital-input">Capital Inicial do Dia (US$)</label>
            <input
              id="capital-input"
              className="input"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={capital}
              onChange={e => setCapital(e.target.value)}
              autoFocus
              required
              style={{ fontSize: '1.15rem', padding: '0.75rem' }}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              {isRetroativo
                ? 'Capital que você tinha disponível neste dia.'
                : 'Capital disponível na sua conta hoje.'}
            </p>
          </div>

          {error && (
            <div style={{ padding: '0.6rem 0.875rem', borderRadius: '0.5rem', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: 'var(--accent-loss)', fontSize: '0.8rem' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading
                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Criando...</>
                : isRetroativo ? 'Registrar Dia' : 'Iniciar Dia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal: Nova Operação ─────────────────────────────────────
function NovaOperacaoModal({
  dia, motivos, onClose, onCreated,
}: {
  dia: TradingDay
  motivos: MotivoEntrada[]
  onClose: () => void
  onCreated: () => void
}) {
  const { criarTrade, fetchDiaAberto } = usePainelStore()
  const { config } = useConfigStore()

  // Detecta sugestão de tipo baseada no último trade
  const tradesAbertos = dia.trades.filter(t => t.status === 'ABERTA')
  const ultimoTrade = dia.trades[dia.trades.length - 1]
  const sugestaoTipo = (() => {
    if (!ultimoTrade || ultimoTrade.status === 'WIN') return 'ENTR'
    if (ultimoTrade.tipo === 'ENTR' && ultimoTrade.status === 'LOSS') return 'MG1'
    if (ultimoTrade.tipo === 'MG1' && ultimoTrade.status === 'LOSS' && config?.mg2Habilitado) return 'MG2'
    return 'ENTR'
  })()

  const [tipo, setTipo] = useState<'ENTR' | 'MG1' | 'MG2'>(sugestaoTipo)
  const [ativo, setAtivo] = useState('')
  const [valor, setValor] = useState(() => {
    if (!config) return ''
    if (tipo === 'ENTR') return (dia.valorENTR ?? 0).toFixed(2)
    if (tipo === 'MG1') return (dia.valorMG1 ?? 0).toFixed(2)
    return (dia.valorMG2 ?? 0).toFixed(2)
  })
  const [motivoId, setMotivoId] = useState('')
  const [motivoOutro, setMotivoOutro] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const motivoSelecionado = motivos.find(m => m.id === motivoId)

  // Atualiza valor ao mudar tipo
  useEffect(() => {
    if (!dia) return
    if (tipo === 'ENTR') setValor((dia.valorENTR ?? 0).toFixed(2))
    else if (tipo === 'MG1') setValor((dia.valorMG1 ?? 0).toFixed(2))
    else setValor((dia.valorMG2 ?? 0).toFixed(2))
  }, [tipo, dia])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ativo.trim()) { setError('Informe o ativo'); return }
    if (!motivoId) { setError('Selecione o motivo de entrada'); return }
    if (motivoSelecionado?.nome === 'Outro' && !motivoOutro.trim()) { setError('Descreva o motivo'); return }
    setLoading(true)
    try {
      await criarTrade({
        tipo,
        ativo: ativo.trim().toUpperCase(),
        valor: parseFloat(valor),
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
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-blue)' }}>
                  Sugestão: {sugestaoTipo}
                </span>
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
          {/* Tipo */}
          <div>
            <label className="label">Tipo de Entrada</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {tiposDisponiveis.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t as 'ENTR' | 'MG1' | 'MG2')}
                  style={{
                    flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid',
                    cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', transition: 'all 0.15s',
                    background: tipo === t ? (t === 'ENTR' ? 'rgba(59,130,246,0.2)' : t === 'MG1' ? 'rgba(245,158,11,0.2)' : 'rgba(244,63,94,0.2)') : 'var(--bg-surface)',
                    borderColor: tipo === t ? (t === 'ENTR' ? '#3b82f6' : t === 'MG1' ? '#f59e0b' : '#f43f5e') : 'var(--border)',
                    color: tipo === t ? (t === 'ENTR' ? '#3b82f6' : t === 'MG1' ? '#f59e0b' : '#f43f5e') : 'var(--text-secondary)',
                  }}
                >
                  {t}
                  {t === sugestaoTipo && <span style={{ fontSize: '0.6rem', marginLeft: '0.3rem' }}>★</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Ativo */}
          <div>
            <label className="label" htmlFor="trade-ativo">Ativo</label>
            <input
              id="trade-ativo"
              className="input"
              placeholder="Ex: ETH/USDT, BTC/USDT"
              value={ativo}
              onChange={e => setAtivo(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Valor */}
          <div>
            <label className="label" htmlFor="trade-valor">Valor de Entrada (US$)</label>
            <input
              id="trade-valor"
              className="input"
              type="number"
              step="0.01"
              min="0.01"
              value={valor}
              onChange={e => setValor(e.target.value)}
              required
            />
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              Sugerido: {tipo === 'ENTR' ? formatUSD(dia.valorENTR) : tipo === 'MG1' ? formatUSD(dia.valorMG1) : formatUSD(dia.valorMG2)}
            </p>
          </div>

          {/* Motivo */}
          <div>
            <label className="label" htmlFor="trade-motivo">Motivo de Entrada</label>
            <select
              id="trade-motivo"
              className="input"
              value={motivoId}
              onChange={e => setMotivoId(e.target.value)}
              required
            >
              <option value="">Selecione...</option>
              {motivos.map(m => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </select>
          </div>

          {/* Campo livre se "Outro" */}
          {motivoSelecionado?.nome === 'Outro' && (
            <div>
              <label className="label" htmlFor="trade-motivo-outro">Descreva o motivo</label>
              <input
                id="trade-motivo-outro"
                className="input"
                placeholder="Descreva o motivo da entrada..."
                value={motivoOutro}
                onChange={e => setMotivoOutro(e.target.value)}
              />
            </div>
          )}

          {error && (
            <div style={{ padding: '0.6rem 0.875rem', borderRadius: '0.5rem', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: 'var(--accent-loss)', fontSize: '0.8rem' }}>
              {error}
            </div>
          )}

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

// ─── Modal: Fechar Dia ────────────────────────────────────────
function FecharDiaModal({
  dia, onClose, onFechado,
}: { dia: TradingDay; onClose: () => void; onFechado: () => void }) {
  const { fecharDia } = usePainelStore()
  const [emocional, setEmocional] = useState('')
  const [seguiuSetup, setSeguiuSetup] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const temTradeAberto = dia.trades.some(t => t.status === 'ABERTA')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emocional.trim()) { setError('Descreva o estado emocional'); return }
    if (seguiuSetup === null) { setError('Informe se seguiu o setup'); return }
    if (temTradeAberto) { setError('Feche todas as operações abertas antes de fechar o dia'); return }
    setLoading(true)
    try {
      await fecharDia(emocional, seguiuSetup)
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

        {/* Resumo */}
        <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', marginBottom: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Resultado</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: isPositivo ? 'var(--accent-win)' : 'var(--accent-loss)' }}>
                {isPositivo ? '+' : ''}{formatUSD(resultado)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</div>
              <div className={statusClass(dia.status)} style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '0.15rem' }}>
                {statusLabel(dia.status)}
              </div>
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
            <textarea
              id="emocional-input"
              className="input"
              placeholder="Como foi seu estado emocional durante as operações?"
              value={emocional}
              onChange={e => setEmocional(e.target.value)}
              rows={3}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
              required
            />
          </div>

          <div>
            <label className="label">Seguiu o Setup?</label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {[{ label: 'Sim', value: true }, { label: 'Não', value: false }].map(opt => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setSeguiuSetup(opt.value)}
                  style={{
                    flex: 1, padding: '0.625rem', borderRadius: '0.5rem', border: '1px solid', cursor: 'pointer',
                    fontWeight: 600, fontSize: '0.875rem', transition: 'all 0.15s',
                    background: seguiuSetup === opt.value ? (opt.value ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)') : 'var(--bg-surface)',
                    borderColor: seguiuSetup === opt.value ? (opt.value ? '#10b981' : '#f43f5e') : 'var(--border)',
                    color: seguiuSetup === opt.value ? (opt.value ? '#10b981' : '#f43f5e') : 'var(--text-secondary)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ padding: '0.6rem 0.875rem', borderRadius: '0.5rem', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: 'var(--accent-loss)', fontSize: '0.8rem' }}>
              {error}
            </div>
          )}

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

// ─── Linha de trade na tabela ─────────────────────────────────
function TradeRow({ trade, onMarcar }: { trade: Trade; onMarcar: (id: string, res: 'WIN' | 'LOSS') => void }) {
  const [loading, setLoading] = useState(false)

  const handleMarcar = async (res: 'WIN' | 'LOSS') => {
    setLoading(true)
    await onMarcar(trade.id, res)
    setLoading(false)
  }

  const tipoColor: Record<string, string> = { ENTR: '#3b82f6', MG1: '#f59e0b', MG2: '#f43f5e' }
  const statusBadge = trade.status === 'WIN' ? 'badge-win' : trade.status === 'LOSS' ? 'badge-loss' : 'badge-neutral'

  return (
    <tr className="animate-slide-in">
      <td style={{ color: 'var(--text-muted)' }}>#{trade.ciclo.numero}</td>
      <td>
        <span style={{ fontWeight: 700, color: tipoColor[trade.tipo] ?? 'var(--text-primary)' }}>{trade.tipo}</span>
      </td>
      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{trade.ativo}</td>
      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatUSD(trade.valor)}</td>
      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
        {trade.motivo?.nome ?? trade.motivoOutro ?? '—'}
      </td>
      <td><span className={`badge ${statusBadge}`}>{trade.status}</span></td>
      <td style={{ fontWeight: 700 }} className={valueClass(trade.resultado)}>
        {trade.resultado != null ? (trade.resultado > 0 ? '+' : '') + formatUSD(trade.resultado) : '—'}
      </td>
      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatTime(trade.horario)}</td>
      <td>
        {trade.status === 'ABERTA' && (
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            <button
              className="btn btn-success"
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem' }}
              onClick={() => handleMarcar('WIN')}
              disabled={loading}
              title="Marcar como WIN"
            >
              {loading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <><CheckCircle size={12} /> WIN</>}
            </button>
            <button
              className="btn btn-danger"
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem' }}
              onClick={() => handleMarcar('LOSS')}
              disabled={loading}
              title="Marcar como LOSS"
            >
              <XCircle size={12} /> LOSS
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}

// ─── Página principal ─────────────────────────────────────────
export default function PainelDia() {
  const { diaAberto, isLoading, fetchDiaAberto, marcarResultado } = usePainelStore()
  const { config, fetchConfig } = useConfigStore()
  const [motivos, setMotivos] = useState<MotivoEntrada[]>([])
  const [showIniciar, setShowIniciar] = useState(false)
  const [showNova, setShowNova] = useState(false)
  const [showFechar, setShowFechar] = useState(false)

  const carregarMotivos = useCallback(async () => {
    try {
      const { data } = await api.get('/motivos')
      setMotivos(data)
    } catch {}
  }, [])

  useEffect(() => {
    fetchDiaAberto()
    fetchConfig()
    carregarMotivos()
  }, [fetchDiaAberto, fetchConfig, carregarMotivos])

  const handleMarcar = async (tradeId: string, resultado: 'WIN' | 'LOSS') => {
    await marcarResultado(tradeId, resultado)
  }

  const dia = diaAberto

  // ── Estado: carregando ──────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 size={32} style={{ color: 'var(--accent-blue)', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)' }}>Carregando painel...</p>
      </div>
    )
  }

  // ── Estado: sem dia aberto ──────────────────────────────────
  if (!dia) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1.5rem' }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={28} style={{ color: 'var(--accent-blue)' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Nenhum dia em aberto</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Inicie um novo dia para começar a registrar operações.</p>
        </div>
        <button id="btn-iniciar-dia" className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }} onClick={() => setShowIniciar(true)}>
          <Plus size={18} /> Iniciar Novo Dia
        </button>
        {showIniciar && (
          <IniciarDiaModal
            onClose={() => setShowIniciar(false)}
            onCreated={() => { setShowIniciar(false); fetchDiaAberto() }}
          />
        )}
      </div>
    )
  }

  // ── Estado: dia aberto ──────────────────────────────────────
  const resultado = dia.resultadoDia ?? 0
  const saldoAtual = dia.capitalInicialReal + resultado
  const stopAtingido = dia.status === 'STOP'
  const todosCiclosUsados = dia.ciclosRealizados >= (config?.maxCiclosPorDia ?? 3)
  const temTradeAberto = dia.trades.some(t => t.status === 'ABERTA')
  const novaOperacaoDisabled = stopAtingido || (todosCiclosUsados && !temTradeAberto)

  const progressoMeta = dia.metaIdeal ? Math.min(100, Math.max(0, (resultado / dia.metaIdeal) * 100)) : 0
  const progressoStop = dia.stopDiario ? Math.min(100, Math.max(0, (Math.abs(Math.min(0, resultado)) / dia.stopDiario) * 100)) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Painel do Dia</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {formatDateFull(dia.date)}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <StatusBadge status={dia.status} stopProximo={dia.stopProximo} />
          <button
            className="btn btn-ghost"
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
            onClick={fetchDiaAberto}
            title="Atualizar"
          >
            <RefreshCw size={14} />
          </button>
          <button
            id="btn-fechar-dia"
            className="btn btn-outline"
            style={{ fontSize: '0.85rem' }}
            onClick={() => setShowFechar(true)}
          >
            Fechar Dia
          </button>
          <button
            id="btn-nova-operacao"
            className="btn btn-success"
            style={{ fontSize: '0.85rem' }}
            onClick={() => setShowNova(true)}
            disabled={novaOperacaoDisabled}
          >
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
        <KpiCard
          label="Saldo Atual"
          value={formatUSD(saldoAtual)}
          icon={DollarSign}
          highlight
        />
        <KpiCard
          label="Capital Inicial"
          value={formatUSD(dia.capitalInicialReal)}
          sub={dia.deposito !== 0 ? `Depósito/Saque: ${formatUSD(dia.deposito)}` : 'Sem depósito/saque'}
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
        {/* Meta */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Metas</span>
            <Target size={14} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Meta Ideal ({formatPct(config?.metaIdealPct)})</span>
              <span style={{ fontWeight: 700, color: 'var(--accent-win)', fontSize: '0.9rem' }}>{formatUSD(dia.metaIdeal)}</span>
            </div>
            {/* Barra de progresso da meta */}
            <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-surface)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, background: 'var(--accent-win)', width: `${progressoMeta}%`, transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Meta Máxima ({formatPct(config?.metaMaximaPct)})</span>
              <span style={{ fontWeight: 600, color: '#059669', fontSize: '0.85rem' }}>{formatUSD(dia.metaMaxima)}</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Falta para meta: <span style={{ color: resultado >= (dia.metaIdeal ?? 0) ? 'var(--accent-win)' : 'var(--text-primary)', fontWeight: 600 }}>{formatUSD(dia.faltaParaMeta)}</span>
            </div>
          </div>
        </div>

        {/* Stop */}
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
            {/* Barra de consumo do stop */}
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
        {/* Ciclos */}
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

        {/* Valores sugeridos */}
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

      {/* ── Campo de Depósito/Saque ── */}
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
                  <th>Ciclo</th>
                  <th>Tipo</th>
                  <th>Ativo</th>
                  <th>Valor</th>
                  <th>Motivo</th>
                  <th>Status</th>
                  <th>Resultado</th>
                  <th>Hora</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {dia.trades.map(trade => (
                  <TradeRow key={trade.id} trade={trade} onMarcar={handleMarcar} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modais ── */}
      {showNova && dia && (
        <NovaOperacaoModal
          dia={dia}
          motivos={motivos}
          onClose={() => setShowNova(false)}
          onCreated={() => setShowNova(false)}
        />
      )}
      {showFechar && dia && (
        <FecharDiaModal
          dia={dia}
          onClose={() => setShowFechar(false)}
          onFechado={() => setShowFechar(false)}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Campo de Depósito/Saque no Painel ───────────────────────
function DepositoSaqueDia({ dia }: { dia: TradingDay }) {
  const { atualizarDeposito } = usePainelStore()
  const [valor, setValor] = useState(dia.deposito.toString())
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    const num = parseFloat(valor)
    if (isNaN(num)) return
    setLoading(true)
    await atualizarDeposito(num)
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
      <div style={{ flex: '0 0 auto' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '0.25rem' }}>
          Depósito / Saque do Dia (US$)
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
          Positivo = depósito · Negativo = saque
        </p>
      </div>
      <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', marginLeft: 'auto' }}>
        <input
          className="input"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={valor}
          onChange={e => setValor(e.target.value)}
          style={{ width: 140 }}
          id="deposito-saque-input"
        />
        <button
          className={`btn ${saved ? 'btn-success' : 'btn-outline'}`}
          onClick={handleSave}
          disabled={loading}
          style={{ minWidth: 80 }}
        >
          {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : saved ? '✓ Salvo' : 'Aplicar'}
        </button>
      </div>
    </div>
  )
}
