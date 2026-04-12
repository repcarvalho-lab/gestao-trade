import { useState, useEffect, useCallback } from 'react'
import {
  Save, Plus, Pencil, EyeOff, Eye, Loader2, Check, X, Settings,
  TrendingUp, DollarSign, BarChart2, Tag,
} from 'lucide-react'
import { useConfigStore, type Configuration } from '../../store/configStore'
import api from '../../services/api'

// ─── Tipos ────────────────────────────────────────────────────
interface MotivoEntrada { id: string; nome: string; ativo: boolean }

type TabKey = 'estrategia' | 'financeiro' | 'projecao' | 'motivos'

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'estrategia', label: 'Estratégia', icon: TrendingUp },
  { key: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { key: 'projecao',   label: 'Projeção',   icon: BarChart2 },
  { key: 'motivos',    label: 'Motivos de Entrada', icon: Tag },
]

// ─── Campo de configuração ────────────────────────────────────
function ConfigField({
  label, desc, id, type = 'number', value, onChange, step, min, max, suffix,
}: {
  label: string
  desc?: string
  id: string
  type?: string
  value: string | number | boolean
  onChange: (v: string | boolean) => void
  step?: string
  min?: string
  max?: string
  suffix?: string
}) {
  if (type === 'boolean') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 0', borderBottom: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{label}</div>
          {desc && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{desc}</div>}
        </div>
        <button
          id={id}
          type="button"
          onClick={() => onChange(!value)}
          style={{
            position: 'relative', width: 44, height: 24, borderRadius: 12,
            border: 'none', cursor: 'pointer', transition: 'background 0.2s',
            background: value ? 'var(--accent-win)' : 'var(--border)',
          }}
        >
          <span style={{
            position: 'absolute', top: 3, left: value ? 22 : 3,
            width: 18, height: 18, borderRadius: '50%', background: '#fff',
            transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }} />
        </button>
      </div>
    )
  }
  return (
    <div style={{ padding: '0.875rem 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
        <label htmlFor={id} style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{label}</label>
        {desc && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{desc}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input
          id={id}
          className="input"
          type={type}
          step={step}
          min={min}
          max={max}
          value={String(value)}
          onChange={e => onChange(e.target.value)}
          style={{ maxWidth: 200 }}
        />
        {suffix && <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{suffix}</span>}
      </div>
    </div>
  )
}

// ─── Aba Estratégia ───────────────────────────────────────────
function TabEstrategia({ form, set, onSave, saving, saved }: {
  form: Partial<Configuration>
  set: (k: keyof Configuration, v: string | boolean) => void
  onSave: () => void
  saving: boolean
  saved: boolean
}) {
  return (
    <div>
      <h3 style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>Parâmetros de Estratégia</h3>
      <p style={{ margin: '0 0 1.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Define metas, stops e estrutura de ciclos Martingale.</p>

      <ConfigField id="metaIdealPct" label="Meta Ideal (%)" desc="Percentual mínimo de ganho para considerar encerrar o dia" type="number" step="0.001" min="0" max="1" value={Number((form.metaIdealPct ?? 0.02) * 100).toFixed(2)} onChange={v => set('metaIdealPct', String(Number(v) / 100))} suffix="%" />
      <ConfigField id="metaMaximaPct" label="Meta Máxima (%)" desc="Percentual bônus — não obrigatório encerrar ao atingir" type="number" step="0.001" min="0" max="1" value={Number((form.metaMaximaPct ?? 0.03) * 100).toFixed(2)} onChange={v => set('metaMaximaPct', String(Number(v) / 100))} suffix="%" />
      <ConfigField id="stopDiarioPct" label="Stop Diário (%)" desc="Percentual máximo de perda no dia" type="number" step="0.001" min="0" max="1" value={Number((form.stopDiarioPct ?? 0.06) * 100).toFixed(2)} onChange={v => set('stopDiarioPct', String(Number(v) / 100))} suffix="%" />
      <ConfigField id="riscoMaxCicloPct" label="Risco Máximo por Ciclo (%)" desc="Percentual do capital comprometido no ciclo" type="number" step="0.001" min="0" max="1" value={Number((form.riscoMaxCicloPct ?? 0.06) * 100).toFixed(2)} onChange={v => set('riscoMaxCicloPct', String(Number(v) / 100))} suffix="%" />
      <ConfigField id="pctSugeridaEntrada" label="% Sugerida de Entrada" desc="Base para calcular o valor sugerido de ENTR" type="number" step="0.001" min="0" max="1" value={Number((form.pctSugeridaEntrada ?? 0.02) * 100).toFixed(2)} onChange={v => set('pctSugeridaEntrada', String(Number(v) / 100))} suffix="%" />
      <ConfigField id="fatorMG1" label="Fator MG1" desc="Multiplicador do valor ENTR para calcular MG1" type="number" step="0.1" min="1" value={form.fatorMG1 ?? 2} onChange={v => set('fatorMG1', v)} suffix="×" />
      <ConfigField id="fatorMG2" label="Fator MG2" desc="Multiplicador do valor MG1 para calcular MG2" type="number" step="0.1" min="1" value={form.fatorMG2 ?? 2} onChange={v => set('fatorMG2', v)} suffix="×" />
      <ConfigField id="maxCiclosPorDia" label="Máx. Ciclos por Dia" desc="Limite comportamental de ciclos diários" type="number" step="1" min="1" value={form.maxCiclosPorDia ?? 3} onChange={v => set('maxCiclosPorDia', v)} />
      <ConfigField id="maxEntradasPorCiclo" label="Máx. Entradas por Ciclo" desc="Entradas máximas quando MG2 está habilitado" type="number" step="1" min="2" max="3" value={form.maxEntradasPorCiclo ?? 3} onChange={v => set('maxEntradasPorCiclo', v)} />
      <ConfigField id="mg2Habilitado" label="MG2 Habilitado" desc="Permite o terceiro nível de Martingale" type="boolean" value={form.mg2Habilitado ?? false} onChange={v => set('mg2Habilitado', v)} />

      <SaveButton onSave={onSave} saving={saving} saved={saved} />
    </div>
  )
}

// ─── Aba Financeiro ───────────────────────────────────────────
function TabFinanceiro({ form, set, onSave, saving, saved }: {
  form: Partial<Configuration>
  set: (k: keyof Configuration, v: string | boolean) => void
  onSave: () => void
  saving: boolean
  saved: boolean
}) {
  return (
    <div>
      <h3 style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>Parâmetros Financeiros</h3>
      <p style={{ margin: '0 0 1.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Payout, câmbio e planejamento financeiro.</p>

      <ConfigField id="payout" label="Payout da Corretora (%)" desc="Percentual de retorno sobre ganhos" type="number" step="0.01" min="0" max="1" value={Number((form.payout ?? 0.9) * 100).toFixed(0)} onChange={v => set('payout', String(Number(v) / 100))} suffix="%" />

      <div style={{ height: 1, background: 'var(--border)', margin: '1.25rem 0' }} />
      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>Câmbio</div>

      <ConfigField id="cambioCompra" label="Câmbio Compra (Depósitos)" desc="Taxa aplicada na conversão de R$ para US$ em depósitos" type="number" step="0.01" min="0" value={form.cambioCompra ?? 5.2} onChange={v => set('cambioCompra', v)} suffix="R$/US$" />
      <ConfigField id="cambioVenda" label="Câmbio Venda (Saques)" desc="Taxa aplicada na conversão de US$ para R$ em saques" type="number" step="0.01" min="0" value={form.cambioVenda ?? 4.8} onChange={v => set('cambioVenda', v)} suffix="R$/US$" />

      <div style={{ height: 1, background: 'var(--border)', margin: '1.25rem 0' }} />
      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>Planejamento</div>

      <ConfigField id="aporteJunho" label="Aporte Planejado (Junho)" desc="Valor em US$ a ser aportado em junho" type="number" step="0.01" min="0" value={form.aporteJunho ?? ''} onChange={v => set('aporteJunho', v)} suffix="US$" />
      <ConfigField id="saqueMinimo" label="Saque Mínimo Desejado" desc="Valor mínimo de saque a partir do mês configurado" type="number" step="0.01" min="0" value={form.saqueMinimo ?? ''} onChange={v => set('saqueMinimo', v)} suffix="US$" />
      <ConfigField id="saqueMaximo" label="Saque Máximo Desejado" desc="Valor máximo de saque desejado" type="number" step="0.01" min="0" value={form.saqueMaximo ?? ''} onChange={v => set('saqueMaximo', v)} suffix="US$" />

      <SaveButton onSave={onSave} saving={saving} saved={saved} />
    </div>
  )
}

// ─── Aba Projeção ─────────────────────────────────────────────
function TabProjecao({ form, set, onSave, saving, saved }: {
  form: Partial<Configuration>
  set: (k: keyof Configuration, v: string | boolean) => void
  onSave: () => void
  saving: boolean
  saved: boolean
}) {
  return (
    <div>
      <h3 style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>Cenários de Projeção Anual</h3>
      <p style={{ margin: '0 0 1.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        Retorno mensal estimado para cada cenário. Usado no módulo de Projeção Anual.
      </p>

      {/* Preview visual dos cenários */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem', marginBottom: '1.5rem' }}>
        {[
          { key: 'retornoConservador' as keyof Configuration, label: 'Conservador', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
          { key: 'retornoRealista'    as keyof Configuration, label: 'Realista',    color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
          { key: 'retornoAgressivo'   as keyof Configuration, label: 'Agressivo',   color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
        ].map(({ key, label, color, bg }) => (
          <div key={key} style={{ padding: '1rem', borderRadius: '0.75rem', background: bg, border: `1px solid ${color}33`, textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color, marginTop: '0.25rem' }}>
              {Number(((form[key] as number) ?? 0) * 100).toFixed(0)}%
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ao mês</div>
          </div>
        ))}
      </div>

      <ConfigField id="retornoConservador" label="Retorno Conservador (% ao mês)" desc="Cenário mais pessimista" type="number" step="1" min="0" max="200" value={Number((form.retornoConservador ?? 0.2) * 100).toFixed(0)} onChange={v => set('retornoConservador', String(Number(v) / 100))} suffix="%" />
      <ConfigField id="retornoRealista" label="Retorno Realista (% ao mês)" desc="Cenário esperado" type="number" step="1" min="0" max="200" value={Number((form.retornoRealista ?? 0.4) * 100).toFixed(0)} onChange={v => set('retornoRealista', String(Number(v) / 100))} suffix="%" />
      <ConfigField id="retornoAgressivo" label="Retorno Agressivo (% ao mês)" desc="Cenário otimista" type="number" step="1" min="0" max="200" value={Number((form.retornoAgressivo ?? 0.6) * 100).toFixed(0)} onChange={v => set('retornoAgressivo', String(Number(v) / 100))} suffix="%" />

      <SaveButton onSave={onSave} saving={saving} saved={saved} />
    </div>
  )
}

// ─── Aba Motivos de Entrada ───────────────────────────────────
function TabMotivos() {
  const [motivos, setMotivos] = useState<MotivoEntrada[]>([])
  const [loading, setLoading] = useState(true)
  const [novoNome, setNovoNome] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editandoNome, setEditandoNome] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/motivos?todos=true')
      setMotivos(data)
    } catch { setError('Erro ao carregar motivos') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const handleAdicionar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoNome.trim()) return
    setSaving(true)
    try {
      await api.post('/motivos', { nome: novoNome.trim() })
      setNovoNome('')
      carregar()
    } catch { setError('Erro ao criar motivo') }
    finally { setSaving(false) }
  }

  const handleEditar = async (id: string) => {
    if (!editandoNome.trim()) return
    setSaving(true)
    try {
      await api.patch(`/motivos/${id}`, { nome: editandoNome.trim() })
      setEditandoId(null)
      carregar()
    } catch { setError('Erro ao editar motivo') }
    finally { setSaving(false) }
  }

  const handleToggle = async (m: MotivoEntrada) => {
    try {
      if (m.ativo) {
        await api.delete(`/motivos/${m.id}`)
      } else {
        await api.post(`/motivos/${m.id}/reativar`)
      }
      carregar()
    } catch { setError('Erro ao alterar motivo') }
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>Motivos de Entrada</h3>
      <p style={{ margin: '0 0 1.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        Adicione, edite e desative motivos. Motivos desativados são preservados no histórico.
      </p>

      {/* Form adicionar */}
      <form onSubmit={handleAdicionar} style={{ display: 'flex', gap: '0.625rem', marginBottom: '1.5rem' }}>
        <input
          className="input"
          placeholder="Nome do novo motivo..."
          value={novoNome}
          onChange={e => setNovoNome(e.target.value)}
          id="novo-motivo-input"
        />
        <button type="submit" className="btn btn-primary" disabled={saving || !novoNome.trim()} style={{ whiteSpace: 'nowrap' }}>
          {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <><Plus size={14} /> Adicionar</>}
        </button>
      </form>

      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.6rem 0.875rem', borderRadius: '0.5rem', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: 'var(--accent-loss)', fontSize: '0.8rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {motivos.map(m => (
            <div
              key={m.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                borderRadius: '0.625rem', border: '1px solid var(--border)',
                background: m.ativo ? 'var(--bg-card)' : 'var(--bg-surface)',
                opacity: m.ativo ? 1 : 0.6, transition: 'all 0.15s',
              }}
            >
              <div style={{ flex: 1 }}>
                {editandoId === m.id ? (
                  <input
                    className="input"
                    value={editandoNome}
                    onChange={e => setEditandoNome(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleEditar(m.id)}
                    autoFocus
                    style={{ maxWidth: 300 }}
                  />
                ) : (
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{m.nome}</span>
                )}
              </div>
              {!m.ativo && (
                <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>Inativo</span>
              )}
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                {editandoId === m.id ? (
                  <>
                    <button className="btn btn-success" style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem' }} onClick={() => handleEditar(m.id)}>
                      <Check size={12} /> Salvar
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '0.3rem 0.5rem' }} onClick={() => setEditandoId(null)}>
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '0.3rem 0.5rem' }}
                      onClick={() => { setEditandoId(m.id); setEditandoNome(m.nome) }}
                      title="Editar"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '0.3rem 0.5rem', color: m.ativo ? 'var(--accent-loss)' : 'var(--accent-win)' }}
                      onClick={() => handleToggle(m)}
                      title={m.ativo ? 'Desativar' : 'Reativar'}
                    >
                      {m.ativo ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Botão de salvar ──────────────────────────────────────────
function SaveButton({ onSave, saving, saved }: { onSave: () => void; saving: boolean; saved: boolean }) {
  return (
    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
      <button
        className={`btn ${saved ? 'btn-success' : 'btn-primary'}`}
        onClick={onSave}
        disabled={saving}
        style={{ minWidth: 140 }}
        id="btn-salvar-config"
      >
        {saving ? (
          <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</>
        ) : saved ? (
          <><Check size={14} /> Salvo!</>
        ) : (
          <><Save size={14} /> Salvar</>
        )}
      </button>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────
export default function Configuracoes() {
  const { config, fetchConfig, updateConfig } = useConfigStore()
  const [activeTab, setActiveTab] = useState<TabKey>('estrategia')
  const [form, setForm] = useState<Partial<Configuration>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { fetchConfig() }, [fetchConfig])
  useEffect(() => { if (config) setForm(config) }, [config])

  const setField = (key: keyof Configuration, value: string | boolean) => {
    setForm(prev => {
      const parsed = typeof value === 'boolean' ? value : isNaN(Number(value)) ? value : Number(value)
      return { ...prev, [key]: parsed }
    })
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateConfig(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      // erro silencioso — pode adicionar toast futuramente
    } finally { setSaving(false) }
  }

  if (!config) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 size={28} style={{ color: 'var(--accent-blue)', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  const tabProps = { form, set: setField, onSave: handleSave, saving, saved }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 760 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Settings size={18} style={{ color: 'var(--accent-blue)' }} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Configurações</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>Parâmetros globais da estratégia de trading</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.625rem 1rem', borderRadius: '0.5rem 0.5rem 0 0',
              border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
              transition: 'all 0.15s', background: 'transparent',
              color: activeTab === key ? 'var(--accent-blue)' : 'var(--text-secondary)',
              borderBottom: activeTab === key ? '2px solid var(--accent-blue)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* Conteúdo da aba */}
      <div className="card" style={{ padding: '1.5rem' }}>
        {activeTab === 'estrategia' && <TabEstrategia {...tabProps} />}
        {activeTab === 'financeiro' && <TabFinanceiro {...tabProps} />}
        {activeTab === 'projecao'   && <TabProjecao   {...tabProps} />}
        {activeTab === 'motivos'    && <TabMotivos />}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
