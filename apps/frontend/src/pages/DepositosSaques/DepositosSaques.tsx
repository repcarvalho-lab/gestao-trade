import { useState, useEffect, useCallback } from 'react'
import {
  ArrowDownCircle, ArrowUpCircle, Plus, Pencil, Trash2,
  Loader2, X, Check, DollarSign, Calendar, TrendingDown,
} from 'lucide-react'
import api from '../../services/api'
import { useConfigStore } from '../../store/configStore'
import { formatUSD, formatBRL, formatDate } from '../../lib/format'

// ─── Tipos ────────────────────────────────────────────────────
interface Movimento {
  id: string; data: string; tipo: 'DEPOSITO' | 'SAQUE'
  valorUSD: number; cambio: number; valorBRL: number
  mes: string; observacao: string | null; faixaPlanejada: string | null
}
interface AportePlanejado { id: string; mes: string; valor: number }
interface SaquePlanejado  { id: string; mes: string; valor: number }
type Tab = 'movimentos' | 'planejados'

// ─── Helpers ──────────────────────────────────────────────────
function mesParaLabel(mes: string | null | undefined): string {
  if (!mes) return ''
  const [ano, m] = mes.split('-')
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${nomes[Number(m) - 1]}/${ano}`
}

function gerarOpcoesMeses(qtd = 24) {
  const res = []
  const agora = new Date()
  for (let i = 0; i < qtd; i++) {
    const d = new Date(agora.getFullYear(), agora.getMonth() + i, 1)
    const valor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    res.push({ value: valor, label: mesParaLabel(valor) })
  }
  return res
}

// ─── Modal: Novo Movimento ────────────────────────────────────
function NovoMovimentoModal({ onClose, onSaved, cambioCompra, cambioVenda }: {
  onClose: () => void; onSaved: () => void; cambioCompra: number; cambioVenda: number
}) {
  const hoje = new Date().toISOString().split('T')[0]
  const [tipo, setTipo] = useState<'DEPOSITO' | 'SAQUE'>('DEPOSITO')
  const [data, setData] = useState(hoje)
  const [valorUSD, setValorUSD] = useState('')
  const [cambio, setCambio] = useState(String(cambioCompra.toFixed(2)))
  const [observacao, setObservacao] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setCambio(tipo === 'DEPOSITO' ? String(cambioCompra.toFixed(2)) : String(cambioVenda.toFixed(2)))
  }, [tipo, cambioCompra, cambioVenda])

  const valorBRL = (Number(valorUSD) || 0) * (Number(cambio) || 0)
  const isDeposito = tipo === 'DEPOSITO'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const vUSD = parseFloat(valorUSD), vCambio = parseFloat(cambio)
    if (isNaN(vUSD) || vUSD <= 0) { setError('Informe um valor válido em US$.'); return }
    if (isNaN(vCambio) || vCambio <= 0) { setError('Informe um câmbio válido.'); return }
    setSaving(true)
    try {
      await api.post('/movimentos', { data, tipo, valorUSD: vUSD, cambio: vCambio, observacao: observacao || undefined })
      onSaved()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e?.response?.data?.error ?? 'Erro ao registrar movimento.')
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>Novo Movimento</h2>
          <button className="btn btn-ghost" style={{ padding: '0.4rem' }} onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {(['DEPOSITO', 'SAQUE'] as const).map(t => (
              <button key={t} type="button" onClick={() => setTipo(t)} style={{
                padding: '0.625rem', borderRadius: '0.5rem', border: '2px solid', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                borderColor: tipo === t ? (t === 'DEPOSITO' ? 'var(--accent-win)' : 'var(--accent-loss)') : 'var(--border)',
                background: tipo === t ? (t === 'DEPOSITO' ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)') : 'transparent',
                color: tipo === t ? (t === 'DEPOSITO' ? 'var(--accent-win)' : 'var(--accent-loss)') : 'var(--text-secondary)', transition: 'all 0.15s',
              }}>
                {t === 'DEPOSITO' ? <ArrowDownCircle size={15} /> : <ArrowUpCircle size={15} />}
                {t === 'DEPOSITO' ? 'Depósito' : 'Saque'}
              </button>
            ))}
          </div>
          <div>
            <label className="label" htmlFor="mov-data">Data</label>
            <input id="mov-data" className="input" type="date" value={data} max={hoje} onChange={e => setData(e.target.value)} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="label" htmlFor="mov-valor">Valor (US$)</label>
              <input id="mov-valor" className="input" type="number" step="0.01" min="0.01" placeholder="0.00" value={valorUSD} onChange={e => setValorUSD(e.target.value)} required />
            </div>
            <div>
              <label className="label" htmlFor="mov-cambio">Câmbio R$/US$ <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>(auto)</span></label>
              <input id="mov-cambio" className="input" type="number" step="0.01" min="0.01" placeholder="5.20" value={cambio} onChange={e => setCambio(e.target.value)} required />
            </div>
          </div>
          {valorBRL > 0 && (
            <div style={{ padding: '0.625rem 0.875rem', borderRadius: '0.5rem', textAlign: 'center',
              background: isDeposito ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)',
              border: `1px solid ${isDeposito ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`,
              color: isDeposito ? 'var(--accent-win)' : 'var(--accent-loss)', fontSize: '0.875rem', fontWeight: 600 }}>
              {isDeposito ? '↓' : '↑'} {formatBRL(valorBRL)} ({formatUSD(Number(valorUSD))})
            </div>
          )}
          <div>
            <label className="label" htmlFor="mov-obs">Observação (opcional)</label>
            <input id="mov-obs" className="input" type="text" placeholder="Ex: Aporte mensal" value={observacao} onChange={e => setObservacao(e.target.value)} />
          </div>
          {error && <div style={{ padding: '0.6rem 0.875rem', borderRadius: '0.5rem', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: 'var(--accent-loss)', fontSize: '0.8rem' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
              {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</> : <><Check size={14} /> Registrar</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Linha de movimento ───────────────────────────────────────
function LinhaMovimento({ mov, onUpdate, onDelete }: { mov: Movimento; onUpdate: () => void; onDelete: () => void }) {
  const [editando, setEditando] = useState(false)
  const [obs, setObs] = useState(mov.observacao ?? '')
  const [saving, setSaving] = useState(false)
  const isDeposito = mov.tipo === 'DEPOSITO'

  const handleSave = async () => {
    setSaving(true)
    try { await api.patch(`/movimentos/${mov.id}`, { observacao: obs || undefined }); setEditando(false); onUpdate() }
    finally { setSaving(false) }
  }
  const handleDelete = async () => {
    if (!confirm('Remover este movimento?')) return
    await api.delete(`/movimentos/${mov.id}`); onDelete()
  }

  return (
    <tr>
      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(mov.data)}</td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {isDeposito ? <ArrowDownCircle size={13} style={{ color: 'var(--accent-win)' }} /> : <ArrowUpCircle size={13} style={{ color: 'var(--accent-loss)' }} />}
          <span style={{ fontWeight: 600, color: isDeposito ? 'var(--accent-win)' : 'var(--accent-loss)', fontSize: '0.82rem' }}>{isDeposito ? 'Depósito' : 'Saque'}</span>
        </div>
      </td>
      <td style={{ fontWeight: 700, color: isDeposito ? 'var(--accent-win)' : 'var(--accent-loss)' }}>{isDeposito ? '+' : '-'}{formatUSD(mov.valorUSD)}</td>
      <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{mov.cambio.toFixed(2)}</td>
      <td style={{ fontWeight: 600, color: isDeposito ? 'var(--accent-win)' : 'var(--accent-loss)' }}>{isDeposito ? '+' : '-'}{formatBRL(mov.valorBRL)}</td>
      <td>
        {editando
          ? <input className="input" value={obs} onChange={e => setObs(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} autoFocus style={{ maxWidth: 200, fontSize: '0.8rem' }} />
          : <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{mov.observacao || '—'}</span>}
      </td>
      <td>
        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
          {editando ? (
            <>
              <button className="btn btn-success" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={12} />}
              </button>
              <button className="btn btn-ghost" style={{ padding: '0.25rem 0.4rem' }} onClick={() => setEditando(false)}><X size={12} /></button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost" style={{ padding: '0.25rem 0.4rem' }} onClick={() => setEditando(true)} title="Editar observação"><Pencil size={12} /></button>
              <button className="btn btn-ghost" style={{ padding: '0.25rem 0.4rem', color: 'var(--accent-loss)' }} onClick={handleDelete} title="Remover"><Trash2 size={12} /></button>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

// ─── Planner genérico (usado para Aportes e Saques) ──────────
function Planner({ endpoint, cor }: { endpoint: 'aportes' | 'saques'; cor: 'win' | 'loss' }) {
  const [itens, setItens] = useState<Array<{ id: string; mes: string; valor: number }>>([])
  const [loading, setLoading] = useState(true)
  const [novoMes, setNovoMes] = useState('')
  const [novoValor, setNovoValor] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editandoValor, setEditandoValor] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const mesesOpcoes = gerarOpcoesMeses(24)
  const color = cor === 'win' ? 'var(--accent-win)' : 'var(--accent-loss)'

  const carregar = useCallback(async () => {
    setLoading(true)
    try { const { data } = await api.get(`/${endpoint}`); setItens(data) }
    catch { setError(`Erro ao carregar ${endpoint}.`) }
    finally { setLoading(false) }
  }, [endpoint])

  useEffect(() => { carregar() }, [carregar])

  const mesesJaUsados = itens.map(i => i.mes)

  const handleAdicionar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoMes || !novoValor) { setError('Selecione o mês e informe o valor.'); return }
    const val = parseFloat(novoValor)
    if (isNaN(val) || val <= 0) { setError('Valor inválido.'); return }
    setSaving(true)
    try {
      await api.post(`/${endpoint}`, { mes: novoMes, valor: val })
      setNovoMes(''); setNovoValor(''); setError(''); carregar()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e?.response?.data?.error ?? 'Erro ao adicionar.')
    } finally { setSaving(false) }
  }

  const handleEditar = async (id: string) => {
    const val = parseFloat(editandoValor)
    if (isNaN(val) || val <= 0) { setError('Valor inválido.'); return }
    setSaving(true)
    try { await api.patch(`/${endpoint}/${id}`, { valor: val }); setEditandoId(null); setError(''); carregar() }
    catch { setError('Erro ao salvar.') }
    finally { setSaving(false) }
  }

  const handleDeletar = async (id: string) => {
    try { await api.delete(`/${endpoint}/${id}`); carregar() }
    catch { setError('Erro ao remover.') }
  }

  const total = itens.reduce((s, i) => s + i.valor, 0)

  return (
    <div>
      <form onSubmit={handleAdicionar} style={{ display: 'flex', gap: '0.625rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label className="label" style={{ marginBottom: '0.25rem' }}>Mês</label>
          <select className="input" style={{ width: 160 }} value={novoMes} onChange={e => setNovoMes(e.target.value)} id={`novo-${endpoint}-mes`}>
            <option value="">— Selecione —</option>
            {mesesOpcoes.filter(o => !mesesJaUsados.includes(o.value)).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" style={{ marginBottom: '0.25rem' }}>Valor (US$)</label>
          <input className="input" type="number" step="0.01" min="0.01" placeholder="0.00" style={{ width: 140 }} value={novoValor} onChange={e => setNovoValor(e.target.value)} id={`novo-${endpoint}-valor`} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving || !novoMes || !novoValor} style={{ whiteSpace: 'nowrap' }}>
          {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <><Plus size={14} /> Adicionar</>}
        </button>
      </form>

      {error && <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: 'var(--accent-loss)', fontSize: '0.8rem' }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /></div>
      ) : itens.length === 0 ? (
        <div style={{ padding: '1.5rem', textAlign: 'center', borderRadius: '0.625rem', border: '1px dashed var(--border)', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          Nenhum {endpoint === 'aportes' ? 'aporte' : 'saque'} planejado ainda.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {itens.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.875rem', borderRadius: '0.625rem', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <div style={{ minWidth: 80, fontWeight: 600, color, fontSize: '0.875rem' }}>{mesParaLabel(item.mes)}</div>
              <div style={{ flex: 1 }}>
                {editandoId === item.id
                  ? <input className="input" type="number" step="0.01" min="0.01" value={editandoValor} onChange={e => setEditandoValor(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleEditar(item.id)} autoFocus style={{ maxWidth: 160 }} />
                  : <span style={{ fontWeight: 700, color, fontSize: '0.9rem' }}>{formatUSD(item.valor)}</span>}
              </div>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                {editandoId === item.id ? (
                  <>
                    <button className="btn btn-success" style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem' }} onClick={() => handleEditar(item.id)}><Check size={12} /> Salvar</button>
                    <button className="btn btn-ghost" style={{ padding: '0.3rem 0.5rem' }} onClick={() => setEditandoId(null)}><X size={12} /></button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-ghost" style={{ padding: '0.3rem 0.5rem' }} onClick={() => { setEditandoId(item.id); setEditandoValor(String(item.valor)) }} title="Editar"><Pencil size={13} /></button>
                    <button className="btn btn-ghost" style={{ padding: '0.3rem 0.5rem', color: 'var(--accent-loss)' }} onClick={() => handleDeletar(item.id)} title="Remover"><X size={13} /></button>
                  </>
                )}
              </div>
            </div>
          ))}
          <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.875rem', borderRadius: '0.5rem', background: cor === 'win' ? 'rgba(16,185,129,0.06)' : 'rgba(244,63,94,0.06)', border: `1px solid ${cor === 'win' ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total de {endpoint === 'aportes' ? 'aportes' : 'saques'} planejados</span>
            <span style={{ fontWeight: 700, color }}>{formatUSD(total)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────
export default function DepositosSaques() {
  const { config } = useConfigStore()
  const [tab, setTab] = useState<Tab>('movimentos')
  const [movimentos, setMovimentos] = useState<Movimento[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [mesAtivo, setMesAtivo] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const carregar = useCallback(async () => {
    setLoading(true)
    try { const { data } = await api.get('/movimentos'); setMovimentos(data) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const meses = Array.from(new Set([
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    ...movimentos.map(m => m.mes),
  ])).sort((a, b) => b.localeCompare(a))

  const filtrados        = movimentos.filter(m => m.mes === mesAtivo)
  const totalDepositos   = filtrados.filter(m => m.tipo === 'DEPOSITO').reduce((s, m) => s + m.valorUSD, 0)
  const totalSaques      = filtrados.filter(m => m.tipo === 'SAQUE').reduce((s, m) => s + m.valorUSD, 0)
  const liquidoUSD       = totalDepositos - totalSaques
  const totalDepBRL      = filtrados.filter(m => m.tipo === 'DEPOSITO').reduce((s, m) => s + m.valorBRL, 0)
  const totalSaqBRL      = filtrados.filter(m => m.tipo === 'SAQUE').reduce((s, m) => s + m.valorBRL, 0)
  const globalDepositos  = movimentos.filter(m => m.tipo === 'DEPOSITO').reduce((s, m) => s + m.valorUSD, 0)
  const globalSaques     = movimentos.filter(m => m.tipo === 'SAQUE').reduce((s, m) => s + m.valorUSD, 0)
  const globalLiquidoUSD = globalDepositos - globalSaques

  function mesLabel(mes: string) {
    const [ano, m] = mes.split('-')
    const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    return `${nomes[Number(m) - 1]}/${ano}`
  }

  const TABS_CFG: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'movimentos', label: 'Movimentações Realizadas', icon: DollarSign },
    { key: 'planejados', label: 'Movimentações Planejadas', icon: Calendar },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={18} style={{ color: 'var(--accent-win)' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Depósitos e Saques</h1>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>Movimentações financeiras e planejamento</p>
          </div>
        </div>
        {tab === 'movimentos' && (
          <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
            <select className="input" style={{ fontSize: '0.82rem', width: 150 }} value={mesAtivo} onChange={e => setMesAtivo(e.target.value)}>
              {meses.map(m => <option key={m} value={m}>{mesLabel(m)}</option>)}
            </select>
            <button className="btn btn-primary" onClick={() => setShowModal(true)} id="btn-novo-movimento">
              <Plus size={15} /> Novo
            </button>
          </div>
        )}
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--border)' }}>
        {TABS_CFG.map(t => {
          const Icon = t.icon
          const ativo = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.6rem 1rem', fontSize: '0.82rem', fontWeight: 600,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: ativo ? 'var(--accent-blue)' : 'var(--text-muted)',
              borderBottom: ativo ? '2px solid var(--accent-blue)' : '2px solid transparent',
              marginBottom: -1, transition: 'all 0.15s',
            }}>
              <Icon size={13} />{t.label}
            </button>
          )
        })}
      </div>

      {/* Aba: Movimentos */}
      {tab === 'movimentos' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            {[
              { icon: <ArrowDownCircle size={10} />, label: 'Total Depositado (global)', val: formatUSD(globalDepositos), color: 'var(--accent-win)' },
              { icon: <ArrowUpCircle size={10} />, label: 'Total Sacado (global)', val: formatUSD(globalSaques), color: 'var(--accent-loss)' },
              { icon: null, label: 'Saldo Líquido Aportado', val: (globalLiquidoUSD >= 0 ? '+' : '') + formatUSD(globalLiquidoUSD), color: globalLiquidoUSD >= 0 ? 'var(--accent-win)' : 'var(--accent-loss)' },
            ].map(k => (
              <div key={k.label} className="card" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {k.icon}{k.label}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: k.color }}>{k.val}</div>
              </div>
            ))}
          </div>

          {filtrados.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.625rem' }}>
              {[
                { label: `Entradas — ${mesLabel(mesAtivo)}`, val: formatUSD(totalDepositos), sub: formatBRL(totalDepBRL), color: 'var(--accent-win)' },
                { label: `Saídas — ${mesLabel(mesAtivo)}`, val: formatUSD(totalSaques), sub: formatBRL(totalSaqBRL), color: 'var(--accent-loss)' },
                { label: 'Líquido do mês (US$)', val: (liquidoUSD >= 0 ? '+' : '') + formatUSD(liquidoUSD), sub: '', color: liquidoUSD >= 0 ? 'var(--accent-win)' : 'var(--accent-loss)' },
                { label: 'Movimentos', val: String(filtrados.length), sub: '', color: 'var(--text-primary)' },
              ].map(k => (
                <div key={k.label} style={{ padding: '0.75rem', borderRadius: '0.625rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{k.label}</div>
                  <div style={{ fontWeight: 700, color: k.color, fontSize: '0.95rem' }}>{k.val}</div>
                  {k.sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{k.sub}</div>}
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>
          ) : filtrados.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', borderRadius: '0.75rem', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
              {movimentos.length === 0 ? 'Nenhum movimento registrado ainda.' : `Nenhum movimento em ${mesLabel(mesAtivo)}.`}
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr><th>Data</th><th>Tipo</th><th>Valor (US$)</th><th>Câmbio</th><th>Valor (R$)</th><th>Observação</th><th></th></tr></thead>
                <tbody>{filtrados.map(m => <LinhaMovimento key={m.id} mov={m} onUpdate={carregar} onDelete={carregar} />)}</tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Aba: Movimentações Planejadas */}
      {tab === 'planejados' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <ArrowDownCircle size={16} style={{ color: 'var(--accent-win)' }} />
              <h3 style={{ margin: 0, fontWeight: 600, fontSize: '1rem' }}>Aportes Planejados</h3>
            </div>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Planeje aportes em diferentes meses. São usados automaticamente na Projeção Anual.
            </p>
            <Planner endpoint="aportes" cor="win" />
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <TrendingDown size={16} style={{ color: 'var(--accent-loss)' }} />
              <h3 style={{ margin: 0, fontWeight: 600, fontSize: '1rem' }}>Saques Planejados</h3>
            </div>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Planeje saques em diferentes meses. São usados automaticamente na Projeção Anual.
            </p>
            <Planner endpoint="saques" cor="loss" />
          </div>
        </div>
      )}

      {showModal && (
        <NovoMovimentoModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); carregar() }}
          cambioCompra={config?.cambioCompra ?? 5.2}
          cambioVenda={config?.cambioVenda ?? 4.8}
        />
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
