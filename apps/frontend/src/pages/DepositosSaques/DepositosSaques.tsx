import { useState, useEffect, useCallback } from 'react'
import {
  ArrowDownCircle, ArrowUpCircle, Plus, Pencil, Trash2,
  Loader2, X, Check, DollarSign,
} from 'lucide-react'
import api from '../../services/api'
import { useConfigStore } from '../../store/configStore'
import { formatUSD, formatBRL, formatDate } from '../../lib/format'

// ─── Tipos ────────────────────────────────────────────────────
interface Movimento {
  id: string
  data: string
  tipo: 'DEPOSITO' | 'SAQUE'
  valorUSD: number
  cambio: number
  valorBRL: number
  mes: string
  observacao: string | null
  faixaPlanejada: string | null
}

// ─── Modal: Novo Movimento ────────────────────────────────────
function NovoMovimentoModal({
  onClose, onSaved, cambioCompra, cambioVenda,
}: { onClose: () => void; onSaved: () => void; cambioCompra: number; cambioVenda: number }) {
  const hoje = new Date().toISOString().split('T')[0]
  const [tipo, setTipo] = useState<'DEPOSITO' | 'SAQUE'>('DEPOSITO')
  const [data, setData] = useState(hoje)
  const [valorUSD, setValorUSD] = useState('')
  const [cambio, setCambio] = useState(String(cambioCompra.toFixed(2)))
  const [observacao, setObservacao] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Troca câmbio automaticamente ao mudar tipo
  useEffect(() => {
    setCambio(tipo === 'DEPOSITO' ? String(cambioCompra.toFixed(2)) : String(cambioVenda.toFixed(2)))
  }, [tipo, cambioCompra, cambioVenda])

  const valorBRL = (Number(valorUSD) || 0) * (Number(cambio) || 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const vUSD = parseFloat(valorUSD)
    const vCambio = parseFloat(cambio)
    if (isNaN(vUSD) || vUSD <= 0) { setError('Informe um valor válido em US$.'); return }
    if (isNaN(vCambio) || vCambio <= 0) { setError('Informe um câmbio válido.'); return }
    setSaving(true)
    try {
      await api.post('/movimentos', {
        data,
        tipo,
        valorUSD: vUSD,
        cambio: vCambio,
        observacao: observacao || undefined,
      })
      onSaved()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e?.response?.data?.error ?? 'Erro ao registrar movimento.')
    } finally { setSaving(false) }
  }

  const isDeposito = tipo === 'DEPOSITO'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>Novo Movimento</h2>
          <button className="btn btn-ghost" style={{ padding: '0.4rem' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Tipo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {(['DEPOSITO', 'SAQUE'] as const).map(t => (
              <button
                key={t} type="button" onClick={() => setTipo(t)}
                style={{
                  padding: '0.625rem', borderRadius: '0.5rem', border: '2px solid',
                  cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  borderColor: tipo === t ? (t === 'DEPOSITO' ? 'var(--accent-win)' : 'var(--accent-loss)') : 'var(--border)',
                  background: tipo === t ? (t === 'DEPOSITO' ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)') : 'transparent',
                  color: tipo === t ? (t === 'DEPOSITO' ? 'var(--accent-win)' : 'var(--accent-loss)') : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                }}
              >
                {t === 'DEPOSITO' ? <ArrowDownCircle size={15} /> : <ArrowUpCircle size={15} />}
                {t === 'DEPOSITO' ? 'Depósito' : 'Saque'}
              </button>
            ))}
          </div>

          {/* Data */}
          <div>
            <label className="label" htmlFor="mov-data">Data</label>
            <input id="mov-data" className="input" type="date" value={data} max={hoje}
              onChange={e => setData(e.target.value)} required />
          </div>

          {/* Valor USD + Câmbio */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="label" htmlFor="mov-valor">Valor (US$)</label>
              <input id="mov-valor" className="input" type="number" step="0.01" min="0.01"
                placeholder="0.00" value={valorUSD} onChange={e => setValorUSD(e.target.value)} required />
            </div>
            <div>
              <label className="label" htmlFor="mov-cambio">
                Câmbio R$/US$
                <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                  (auto)
                </span>
              </label>
              <input id="mov-cambio" className="input" type="number" step="0.01" min="0.01"
                placeholder="5.20" value={cambio} onChange={e => setCambio(e.target.value)} required />
            </div>
          </div>

          {/* Preview BRL */}
          {valorBRL > 0 && (
            <div style={{
              padding: '0.625rem 0.875rem', borderRadius: '0.5rem', textAlign: 'center',
              background: isDeposito ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)',
              border: `1px solid ${isDeposito ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`,
              color: isDeposito ? 'var(--accent-win)' : 'var(--accent-loss)',
              fontSize: '0.875rem', fontWeight: 600,
            }}>
              {isDeposito ? '↓' : '↑'} {formatBRL(valorBRL)} ({formatUSD(Number(valorUSD))})
            </div>
          )}

          {/* Observação */}
          <div>
            <label className="label" htmlFor="mov-obs">Observação (opcional)</label>
            <input id="mov-obs" className="input" type="text" placeholder="Ex: Aporte mensal"
              value={observacao} onChange={e => setObservacao(e.target.value)} />
          </div>

          {error && (
            <div style={{ padding: '0.6rem 0.875rem', borderRadius: '0.5rem', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: 'var(--accent-loss)', fontSize: '0.8rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
              {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</> : <><Check size={14} /> Registrar</>}
            </button>
          </div>
        </form>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}

// ─── Linha editável ───────────────────────────────────────────
function LinhaMovimento({ mov, onUpdate, onDelete }: {
  mov: Movimento; onUpdate: () => void; onDelete: () => void
}) {
  const [editando, setEditando] = useState(false)
  const [obs, setObs] = useState(mov.observacao ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.patch(`/movimentos/${mov.id}`, { observacao: obs || undefined })
      setEditando(false)
      onUpdate()
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirm('Remover este movimento?')) return
    await api.delete(`/movimentos/${mov.id}`)
    onDelete()
  }

  const isDeposito = mov.tipo === 'DEPOSITO'

  return (
    <tr>
      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(mov.data)}</td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {isDeposito
            ? <ArrowDownCircle size={13} style={{ color: 'var(--accent-win)' }} />
            : <ArrowUpCircle size={13} style={{ color: 'var(--accent-loss)' }} />}
          <span style={{ fontWeight: 600, color: isDeposito ? 'var(--accent-win)' : 'var(--accent-loss)', fontSize: '0.82rem' }}>
            {isDeposito ? 'Depósito' : 'Saque'}
          </span>
        </div>
      </td>
      <td style={{ fontWeight: 700, color: isDeposito ? 'var(--accent-win)' : 'var(--accent-loss)' }}>
        {isDeposito ? '+' : '-'}{formatUSD(mov.valorUSD)}
      </td>
      <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{mov.cambio.toFixed(2)}</td>
      <td style={{ fontWeight: 600, color: isDeposito ? 'var(--accent-win)' : 'var(--accent-loss)' }}>
        {isDeposito ? '+' : '-'}{formatBRL(mov.valorBRL)}
      </td>
      <td>
        {editando ? (
          <input className="input" value={obs} onChange={e => setObs(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus style={{ maxWidth: 200, fontSize: '0.8rem' }} />
        ) : (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{mov.observacao || '—'}</span>
        )}
      </td>
      <td>
        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
          {editando ? (
            <>
              <button className="btn btn-success" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={12} />}
              </button>
              <button className="btn btn-ghost" style={{ padding: '0.25rem 0.4rem' }} onClick={() => setEditando(false)}>
                <X size={12} />
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost" style={{ padding: '0.25rem 0.4rem' }}
                onClick={() => setEditando(true)} title="Editar observação">
                <Pencil size={12} />
              </button>
              <button className="btn btn-ghost" style={{ padding: '0.25rem 0.4rem', color: 'var(--accent-loss)' }}
                onClick={handleDelete} title="Remover">
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

// ─── Página principal ─────────────────────────────────────────
export default function DepositosSaques() {
  const { config } = useConfigStore()
  const [movimentos, setMovimentos] = useState<Movimento[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [mesAtivo, setMesAtivo] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/movimentos')
      setMovimentos(data)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // Meses disponíveis
  const meses = Array.from(new Set([
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    ...movimentos.map(m => m.mes),
  ])).sort((a, b) => b.localeCompare(a))

  const filtrados = movimentos.filter(m => m.mes === mesAtivo)

  // Totais do filtro
  const totalDepositos = filtrados.filter(m => m.tipo === 'DEPOSITO').reduce((s, m) => s + m.valorUSD, 0)
  const totalSaques = filtrados.filter(m => m.tipo === 'SAQUE').reduce((s, m) => s + m.valorUSD, 0)
  const liquidoUSD = totalDepositos - totalSaques
  const totalDepositosBRL = filtrados.filter(m => m.tipo === 'DEPOSITO').reduce((s, m) => s + m.valorBRL, 0)
  const totalSaquesBRL = filtrados.filter(m => m.tipo === 'SAQUE').reduce((s, m) => s + m.valorBRL, 0)

  // Totais globais
  const globalDepositos = movimentos.filter(m => m.tipo === 'DEPOSITO').reduce((s, m) => s + m.valorUSD, 0)
  const globalSaques = movimentos.filter(m => m.tipo === 'SAQUE').reduce((s, m) => s + m.valorUSD, 0)
  const globalLiquidoUSD = globalDepositos - globalSaques

  function mesLabel(mes: string) {
    const [ano, m] = mes.split('-')
    const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    return `${nomes[Number(m) - 1]}/${ano}`
  }

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
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Histórico de movimentações financeiras
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
          <select className="input" style={{ fontSize: '0.82rem', width: 150 }}
            value={mesAtivo} onChange={e => setMesAtivo(e.target.value)}>
            {meses.map(m => <option key={m} value={m}>{mesLabel(m)}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setShowModal(true)} id="btn-novo-movimento">
            <Plus size={15} /> Novo
          </button>
        </div>
      </div>

      {/* Cards globais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <ArrowDownCircle size={10} /> Total Depositado (global)
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-win)' }}>
            {formatUSD(globalDepositos)}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <ArrowUpCircle size={10} /> Total Sacado (global)
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-loss)' }}>
            {formatUSD(globalSaques)}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Saldo Líquido Aportado
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: globalLiquidoUSD >= 0 ? 'var(--accent-win)' : 'var(--accent-loss)' }}>
            {globalLiquidoUSD >= 0 ? '+' : ''}{formatUSD(globalLiquidoUSD)}
          </div>
        </div>
      </div>

      {/* Resumo do mês filtrado */}
      {filtrados.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.625rem' }}>
          {[
            { label: `Entradas — ${mesLabel(mesAtivo)}`, val: formatUSD(totalDepositos), sub: formatBRL(totalDepositosBRL), color: 'var(--accent-win)' },
            { label: `Saídas — ${mesLabel(mesAtivo)}`, val: formatUSD(totalSaques), sub: formatBRL(totalSaquesBRL), color: 'var(--accent-loss)' },
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

      {/* Tabela */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : filtrados.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', borderRadius: '0.75rem', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
          {movimentos.length === 0
            ? 'Nenhum movimento registrado ainda.'
            : `Nenhum movimento em ${mesLabel(mesAtivo)}.`}
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Valor (US$)</th>
                <th>Câmbio</th>
                <th>Valor (R$)</th>
                <th>Observação</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(m => (
                <LinhaMovimento key={m.id} mov={m} onUpdate={carregar} onDelete={carregar} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
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
