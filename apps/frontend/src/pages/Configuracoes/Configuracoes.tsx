import { useState, useEffect, useCallback } from 'react'
import {
  Save, Plus, Pencil, EyeOff, Eye, Loader2, Check, X, Settings,
  TrendingUp, DollarSign, BarChart2, Tag, AlertTriangle, Trash2,
  ChevronUp, ChevronDown,
} from 'lucide-react'
import { useConfigStore, type Configuration } from '../../store/configStore'
import { useAnalyticsStore } from '../../store/analyticsStore'
import { useCapitalStore } from '../../store/capitalStore'
import api from '../../services/api'
import { formatPct, formatUSD } from '../../lib/format'

// ─── Tipos ────────────────────────────────────────────────────
interface MotivoEntrada { id: string; nome: string; ativo: boolean }
interface AtivoObj { id: string; nome: string; ativo: boolean; payout: number }
type TabKey = 'estrategia' | 'financeiro' | 'projecao' | 'motivos' | 'ativos' | 'erros'

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'estrategia', label: 'Estratégia',          icon: TrendingUp },
  { key: 'financeiro', label: 'Financeiro',          icon: DollarSign },
  { key: 'projecao',   label: 'Projeção',            icon: BarChart2 },
  { key: 'motivos',    label: 'Origem da Entrada',   icon: Tag },
  { key: 'ativos',     label: 'Ativos Disponíveis',    icon: Tag },
  { key: 'erros',      label: 'Tipos de Erro',        icon: AlertTriangle },
]


// ─── Campo de configuração ────────────────────────────────────
function ConfigField({
  label, desc, id, type = 'number', value, onChange, step, min, max, suffix,
}: {
  label: string; desc?: string; id: string; type?: string
  value: string | number | boolean; onChange: (v: string | boolean) => void
  step?: string; min?: string; max?: string; suffix?: string
}) {
  if (type === 'boolean') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 0', borderBottom: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{label}</div>
          {desc && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{desc}</div>}
        </div>
        <button
          id={id} type="button" onClick={() => onChange(!value)}
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
        <input id={id} className="input" type={type} step={step} min={min} max={max}
          value={String(value)} onChange={e => onChange(e.target.value)} style={{ maxWidth: 200 }} />
        {suffix && <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{suffix}</span>}
      </div>
    </div>
  )
}

// ─── Aba Estratégia ───────────────────────────────────────────
function SecaoCard({ titulo, descricao, icon: Icon, children }: {
  titulo: string; descricao?: string; icon: React.ElementType; children: React.ReactNode
}) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '1.25rem' }}>
      <div style={{ padding: '0.875rem 1.25rem', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        <Icon size={15} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{titulo}</div>
          {descricao && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{descricao}</div>}
        </div>
      </div>
      <div style={{ padding: '0 1.25rem', background: 'var(--bg-card)' }}>
        {children}
      </div>
    </div>
  )
}

function TabEstrategia({ form, set, onSave, saving, saved }: {
  form: Partial<Configuration>; set: (k: keyof Configuration, v: string | boolean) => void
  onSave: () => void; saving: boolean; saved: boolean
}) {
  const { dashboardData, fetchDashboard } = useAnalyticsStore()
  useEffect(() => { if (!dashboardData) fetchDashboard() }, [])
  const banca = dashboardData?.indicadores?.ultimoCapital ?? null

  return (
    <div>
      <p style={{ margin: '0 0 1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        Configure metas, gestão de risco e estrutura Martingale. As alterações afetam os cálculos do Painel do Dia.
      </p>

      {/* Metas Diárias */}
      <SecaoCard titulo="Metas Diárias" descricao="Percentuais de referência para encerramento do dia e limites comportamentais." icon={TrendingUp}>
        <ConfigField id="metaIdealPct" label="Meta Ideal (%)"
          desc="Ganho mínimo para considerar encerrar o dia."
          type="number" step="0.001" min="0" max="1"
          value={Number((form.metaIdealPct ?? 0.02) * 100).toFixed(2)}
          onChange={v => set('metaIdealPct', String(Number(v) / 100))} suffix="%" />
        <ConfigField id="metaMaximaPct" label="Meta Máxima (%)"
          desc="Percentual bônus — encerrar obrigatoriamente ao atingir."
          type="number" step="0.001" min="0" max="1"
          value={Number((form.metaMaximaPct ?? 0.03) * 100).toFixed(2)}
          onChange={v => set('metaMaximaPct', String(Number(v) / 100))} suffix="%" />
        <ConfigField id="maxCiclosPorDia" label="Limite de Ciclos por Dia"
          desc="Número máximo de ciclos permitidos em um único dia operacional."
          type="number" step="1" min="1"
          value={form.maxCiclosPorDia ?? 3}
          onChange={v => set('maxCiclosPorDia', v)} />
      </SecaoCard>

      {/* Gestão de Risco */}
      <SecaoCard titulo="Gestão de Risco" descricao="Limites de perda e exposição de capital por operação e por dia." icon={AlertTriangle}>
        <ConfigField id="stopDiarioPct" label="Stop Diário (%)"
          desc="Perda máxima permitida no dia. Ao atingir, encerrar operações."
          type="number" step="0.001" min="0" max="1"
          value={Number((form.stopDiarioPct ?? 0.06) * 100).toFixed(2)}
          onChange={v => {
            set('stopDiarioPct', String(Number(v) / 100))
            set('riscoMaxCicloPct', String(Number(v) / 100))
          }} suffix="%" />
        <ConfigField id="pctSugeridaEntrada" label="% Sugerida de Entrada (ENTR)"
          desc="Base para calcular o valor sugerido na entrada inicial do ciclo."
          type="number" step="0.001" min="0" max="1"
          value={Number((form.pctSugeridaEntrada ?? 0.02) * 100).toFixed(2)}
          onChange={v => set('pctSugeridaEntrada', String(Number(v) / 100))} suffix="%" />

        {/* Card unificado: percentuais + valores em dólar com base no stop */}
        {(() => {
          const risco  = form.stopDiarioPct ?? 0.06
          const fMG1   = form.fatorMG1      ?? 2
          const fMG2   = form.fatorMG2      ?? 2
          const comMG2 = form.mg2Habilitado ?? false
          const divisor = comMG2 ? 1 + fMG1 + fMG1 * fMG2 : 1 + fMG1

          const entr = risco / divisor
          const mg1  = entr * fMG1
          const mg2  = comMG2 ? mg1 * fMG2 : null

          const fmtPctCalc = (v: number) => `${(v * 100).toFixed(2)}%`

          const temBanca   = banca != null && banca > 0
          const entrVal    = temBanca ? Math.floor(banca! * entr)       : null
          const mg1Val     = temBanca ? Math.floor(entrVal! * fMG1)     : null
          const mg2Val     = temBanca && mg2 != null ? Math.floor(mg1Val! * fMG2) : null
          const totalCiclo = temBanca ? (entrVal! + mg1Val! + (mg2Val ?? 0)) : null
          const totalPct   = temBanca && totalCiclo != null ? totalCiclo / banca! : 0

          const itens = [
            { label: 'ENTR', pct: entr, val: entrVal, color: 'var(--accent-win)' },
            { label: 'MG1',  pct: mg1,  val: mg1Val,  color: 'var(--accent-warn)' },
            ...(mg2 != null ? [{ label: 'MG2', pct: mg2, val: mg2Val, color: 'var(--accent-loss)' }] : []),
          ]

          return (
            <div style={{
              margin: '0.75rem 0 1rem',
              padding: '0.875rem 1rem',
              borderRadius: '0.5rem',
              background: 'rgba(16,185,129,0.06)',
              border: '1px solid rgba(16,185,129,0.2)',
            }}>
              {/* Cabeçalho */}
              <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-win)', marginBottom: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Operação com base no Stop Diário</span>
                {temBanca && <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{formatUSD(banca!)}</span>}
              </div>

              {/* Grid de entradas */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${itens.length + 1}, 1fr)`, gap: '0.5rem' }}>
                {itens.map(({ label, pct, val, color }) => (
                  <div key={label} style={{
                    padding: '0.625rem 0.75rem',
                    borderRadius: '0.5rem',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color, fontFamily: 'monospace' }}>{fmtPctCalc(pct)}</div>
                    {temBanca && val != null && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: '0.2rem' }}>${val}</div>
                    )}
                  </div>
                ))}
                {/* Ciclo total */}
                <div style={{
                  padding: '0.625rem 0.75rem',
                  borderRadius: '0.5rem',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ciclo</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{fmtPctCalc(risco)}</div>
                  {temBanca && totalCiclo != null && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: '0.2rem' }}>${totalCiclo}</div>
                  )}
                </div>
              </div>

              {/* Rodapé */}
              {temBanca && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Valores arredondados para baixo — corretora aceita apenas números inteiros.</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-loss)' }}>
                    ${totalCiclo} <span style={{ fontWeight: 400 }}>({(totalPct * 100).toFixed(2)}% da banca)</span>
                  </span>
                </div>
              )}

              {/* Aviso de divergência */}
              {(form.pctSugeridaEntrada ?? 0.02) - entr > 0.0001 && (() => {
                const configurada = form.pctSugeridaEntrada ?? 0.02
                const riscoNecessario = configurada * divisor
                return (
                  <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', fontSize: '0.75rem', color: 'var(--accent-warn)' }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>
                      ⚠ Entrada configurada ({fmtPctCalc(configurada)}) difere do valor calculado ({fmtPctCalc(entr)}).
                    </div>
                    <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      Para alinhar, escolha uma das opções:
                      <br />• Reduza a <strong style={{ color: 'var(--text-primary)' }}>% Sugerida de Entrada</strong> para <strong style={{ color: 'var(--accent-win)' }}>{fmtPctCalc(entr)}</strong>
                      <br />• Ou aumente o <strong style={{ color: 'var(--text-primary)' }}>Stop Diário</strong> para <strong style={{ color: 'var(--accent-win)' }}>{fmtPctCalc(riscoNecessario)}</strong>
                    </div>
                  </div>
                )
              })()}
            </div>
          )
        })()}
      </SecaoCard>

      {/* Martingale */}
      <SecaoCard titulo="Martingale" descricao="Estrutura de reforço após perdas. Configure fatores e número máximo de entradas." icon={BarChart2}>
        <ConfigField id="mg2Habilitado" label="MG2 Habilitado"
          desc="Permite realizar o segundo Martingale (MG2) no ciclo."
          type="boolean"
          value={form.mg2Habilitado ?? false}
          onChange={v => {
            set('mg2Habilitado', v)
            set('maxEntradasPorCiclo', v ? '3' : '2')
          }} />
        <ConfigField id="fatorMG1" label="Fator MG1"
          desc="Multiplicador aplicado sobre o valor de entrada para calcular MG1."
          type="number" step="0.1" min="1"
          value={form.fatorMG1 ?? 2}
          onChange={v => set('fatorMG1', v)} suffix="×" />
        <ConfigField id="fatorMG2" label="Fator MG2"
          desc="Multiplicador aplicado sobre MG1 para calcular MG2."
          type="number" step="0.1" min="1"
          value={form.fatorMG2 ?? 2}
          onChange={v => set('fatorMG2', v)} suffix="×" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 0', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.875rem' }}>Entradas por Ciclo</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Calculado automaticamente: {form.mg2Habilitado ? 'ENTR + MG1 + MG2' : 'ENTR + MG1'}
            </div>
          </div>
          <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.25rem', color: 'var(--accent-blue)', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '0.5rem', padding: '0.25rem 0.75rem' }}>
            {form.mg2Habilitado ? 3 : 2}
          </div>
        </div>
      </SecaoCard>



      <SaveButton onSave={onSave} saving={saving} saved={saved} />
    </div>
  )
}

// ─── Aba Financeiro ───────────────────────────────────────────
function TabFinanceiro({ form, set, onSave, saving, saved }: {
  form: Partial<Configuration>; set: (k: keyof Configuration, v: string | boolean) => void
  onSave: () => void; saving: boolean; saved: boolean
}) {
  return (
    <div>
      <h3 style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>Parâmetros Financeiros</h3>
      <p style={{ margin: '0 0 1.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Taxas de câmbio usadas nas conversões de depósitos e saques.</p>

      <ConfigField id="cambioCompra" label="Câmbio Compra (Depósitos)"
        desc="Taxa aplicada na conversão de R$ para US$ em depósitos."
        type="number" step="0.01" min="0"
        value={form.cambioCompra ?? 5.2}
        onChange={v => set('cambioCompra', v)} suffix="R$/US$" />

      <ConfigField id="cambioVenda" label="Câmbio Venda (Saques)"
        desc="Taxa aplicada na conversão de US$ para R$ em saques."
        type="number" step="0.01" min="0"
        value={form.cambioVenda ?? 4.8}
        onChange={v => set('cambioVenda', v)} suffix="R$/US$" />

      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>Saldo Inicial do Sistema</h3>
        <p style={{ margin: '0 0 1.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Configuração do saldo base e a data em que o controle foi iniciado (Banca Global).</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <ConfigField id="saldoInicialCorretora" label="Saldo Inicial (Corretora)"
            desc="Capital (US$) em corretora."
            type="number" step="0.01" min="0"
            value={form.saldoInicialCorretora ?? ''}
            onChange={v => set('saldoInicialCorretora', v ? String(Number(v)) : '')} suffix="US$" />

          <ConfigField id="saldoInicialReserva" label="Saldo Inicial (Reserva)"
            desc="Capital (US$) em caixa."
            type="number" step="0.01" min="0"
            value={form.saldoInicialReserva ?? ''}
            onChange={v => set('saldoInicialReserva', v ? String(Number(v)) : '')} suffix="US$" />
        </div>

        <ConfigField id="dataSaldoInicial" label="Mês/Ano do Saldo Inicial"
          desc="Mês base para que os gráficos puxem esse valor inicial."
          type="month"
          value={form.dataSaldoInicial ? new Date(form.dataSaldoInicial as string).toISOString().slice(0, 7) : ''}
          onChange={v => set('dataSaldoInicial', v ? new Date(`${v}-01T12:00:00Z`).toISOString() : '')} />
      </div>

      <p style={{ marginTop: '1.25rem', fontSize: '0.78rem', color: 'var(--text-muted)', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        💡 Para planejar aportes e saques futuros, acesse a página <strong>Depósitos e Saques</strong>.
      </p>

      <SaveButton onSave={onSave} saving={saving} saved={saved} />
    </div>
  )
}

// ─── Aba Projeção ─────────────────────────────────────────────
function TabProjecao({ form, set, onSave, saving, saved }: {
  form: Partial<Configuration>; set: (k: keyof Configuration, v: string | boolean) => void
  onSave: () => void; saving: boolean; saved: boolean
}) {
  return (
    <div>
      <h3 style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>Cenários de Projeção Anual</h3>
      <p style={{ margin: '0 0 1.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        Retorno mensal estimado para cada cenário. Usado no módulo de Projeção Anual.
      </p>

      {/* Preview visual */}
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

      <ConfigField id="retornoConservador" label="Retorno Conservador (% ao mês)"
        desc="Cenário mais pessimista." type="number" step="1" min="0" max="200"
        value={Number((form.retornoConservador ?? 0.2) * 100).toFixed(0)}
        onChange={v => set('retornoConservador', String(Number(v) / 100))} suffix="%" />

      <ConfigField id="retornoRealista" label="Retorno Realista (% ao mês)"
        desc="Cenário esperado." type="number" step="1" min="0" max="200"
        value={Number((form.retornoRealista ?? 0.4) * 100).toFixed(0)}
        onChange={v => set('retornoRealista', String(Number(v) / 100))} suffix="%" />

      <ConfigField id="retornoAgressivo" label="Retorno Agressivo (% ao mês)"
        desc="Cenário otimista." type="number" step="1" min="0" max="200"
        value={Number((form.retornoAgressivo ?? 0.6) * 100).toFixed(0)}
        onChange={v => set('retornoAgressivo', String(Number(v) / 100))} suffix="%" />

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
      if (m.ativo) await api.delete(`/motivos/${m.id}`)
      else await api.post(`/motivos/${m.id}/reativar`)
      carregar()
    } catch { setError('Erro ao alterar motivo') }
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>Origem da Entrada</h3>
      <p style={{ margin: '0 0 1.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        Adicione, edite e desative origens. Origens desativadas são preservadas no histórico.
      </p>

      <form onSubmit={handleAdicionar} style={{ display: 'flex', gap: '0.625rem', marginBottom: '1.5rem' }}>
        <input className="input" placeholder="Nome da nova origem..."
          value={novoNome} onChange={e => setNovoNome(e.target.value)} id="novo-motivo-input" />
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {motivos.map(m => (
            <div key={m.id} style={{
              display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.25rem',
              borderRadius: '0.75rem', border: '1px solid var(--border)',
              background: m.ativo ? 'var(--bg-card)' : 'var(--bg-surface)',
              opacity: m.ativo ? 1 : 0.6, transition: 'all 0.15s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0, marginRight: '0.5rem' }}>
                  {editandoId === m.id ? (
                    <input className="input" value={editandoNome} onChange={e => setEditandoNome(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleEditar(m.id)} autoFocus style={{ width: '100%' }} />
                  ) : (
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem', display: 'block', wordBreak: 'break-word' }}>{m.nome}</span>
                  )}
                </div>
                {!m.ativo && <span className="badge badge-neutral" style={{ fontSize: '0.65rem', flexShrink: 0 }}>Inativo</span>}
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '0.5rem' }}>
                {editandoId === m.id ? (
                  <>
                    <button className="btn btn-success" style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem' }} onClick={() => handleEditar(m.id)}>
                      <Check size={14} /> Salvar
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '0.3rem 0.5rem' }} onClick={() => setEditandoId(null)}>
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-ghost" style={{ padding: '0.3rem 0.5rem' }}
                      onClick={() => { setEditandoId(m.id); setEditandoNome(m.nome) }} title="Editar">
                      <Pencil size={15} />
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '0.3rem 0.5rem', color: m.ativo ? 'var(--accent-loss)' : 'var(--accent-win)' }}
                      onClick={() => handleToggle(m)} title={m.ativo ? 'Desativar' : 'Reativar'}>
                      {m.ativo ? <EyeOff size={15} /> : <Eye size={15} />}
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
// ─── Aba Ativos Disponíveis ─────────────────────────────────────
function TabAtivos() {
  const [ativos, setAtivos] = useState<AtivoObj[]>([])
  const [loading, setLoading] = useState(true)
  const [novoNome, setNovoNome] = useState('')
  const [novoPayout, setNovoPayout] = useState('85')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editandoPayout, setEditandoPayout] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/ativos')
      setAtivos(data)
    } catch { setError('Erro ao carregar ativos') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const handleAdicionar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoNome.trim()) return
    const py = parseFloat(novoPayout)
    if (isNaN(py) || py <= 0 || py > 100) { setError('Payout inválido'); return }
    
    setSaving(true)
    try {
      await api.post('/ativos', { nome: novoNome.trim(), payout: py / 100 })
      setNovoNome('')
      setNovoPayout('85')
      setError('')
      carregar()
    } catch (err: unknown) { 
      const parsed = err as { response?: { data?: { error?: string } } }
      setError(parsed?.response?.data?.error ?? 'Erro ao criar ativo')
    }
    finally { setSaving(false) }
  }

  const handleEditarPayout = async (id: string) => {
    const py = parseFloat(editandoPayout)
    if (isNaN(py) || py <= 0 || py > 100) { setError('Payout inválido'); return }
    
    setSaving(true)
    try {
      await api.patch(`/ativos/${id}`, { payout: py / 100 })
      setEditandoId(null)
      carregar()
    } catch { setError('Erro ao atualizar payout') }
    finally { setSaving(false) }
  }

  const handleToggle = async (m: AtivoObj) => {
    try {
      await api.patch(`/ativos/${m.id}`, { ativo: !m.ativo })
      carregar()
    } catch { setError('Erro ao alterar ativo') }
  }

  const handleDeletar = async (id: string) => {
    try {
      await api.delete(`/ativos/${id}`)
      carregar()
    } catch { setError('Erro ao remover ativo') }
  }

  const handleMover = async (index: number, direcao: 'up' | 'down') => {
    const novaLista = [...ativos]
    const alvo = direcao === 'up' ? index - 1 : index + 1
    if (alvo < 0 || alvo >= novaLista.length) return
    ;[novaLista[index], novaLista[alvo]] = [novaLista[alvo], novaLista[index]]
    setAtivos(novaLista)
    try {
      await api.put('/ativos/ordem', { ids: novaLista.map(a => a.id) })
    } catch { setError('Erro ao reordenar') }
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>Ativos Disponíveis</h3>
      <p style={{ margin: '0 0 1.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        Cadastre os ativos que você opera (ex: BTC/USDT, ETH/USDT).
      </p>

      <form onSubmit={handleAdicionar} style={{ display: 'flex', gap: '0.625rem', marginBottom: '1.5rem' }}>
        <input className="input" placeholder="Ativo. Ex: BTC/USDT" style={{ flex: 1 }}
          value={novoNome} onChange={e => setNovoNome(e.target.value.toUpperCase())} id="novo-ativo-input" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input className="input" type="number" placeholder="Payout" style={{ width: 80 }}
            value={novoPayout} onChange={e => setNovoPayout(e.target.value)} min="1" max="100" />
          <span style={{ color: 'var(--text-muted)' }}>%</span>
        </div>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {ativos.map((m, idx) => (
            <div key={m.id} style={{
              display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.25rem',
              borderRadius: '0.75rem', border: '1px solid var(--border)',
              background: m.ativo ? 'var(--bg-card)' : 'var(--bg-surface)',
              opacity: m.ativo ? 1 : 0.6, transition: 'all 0.15s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0, marginRight: '0.5rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem', display: 'block', wordBreak: 'break-word' }}>
                    {m.nome}
                  </span>
                </div>
                {!m.ativo && <span className="badge badge-neutral" style={{ fontSize: '0.65rem', flexShrink: 0 }}>Inativo</span>}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                {editandoId === m.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Payout:</span>
                    <input className="input" type="number" style={{ width: 70, padding: '0.3rem' }} 
                      value={editandoPayout} onChange={e => setEditandoPayout(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleEditarPayout(m.id)} autoFocus />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>%</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Payout:</span>
                    <span style={{ fontSize: '0.95rem', color: 'var(--accent-blue)', fontWeight: 700 }}>
                      {formatPct(m.payout, 0)}
                    </span>
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px dashed var(--border)' }}>
                <div style={{ display: 'flex', gap: '2px' }}>
                  <button className="btn btn-ghost" style={{ padding: '0.3rem 0.4rem', opacity: idx === 0 ? 0.2 : 1 }}
                    disabled={idx === 0} onClick={() => handleMover(idx, 'up')} title="Mover para cima">
                    <ChevronUp size={15} />
                  </button>
                  <button className="btn btn-ghost" style={{ padding: '0.3rem 0.4rem', opacity: idx === ativos.length - 1 ? 0.2 : 1 }}
                    disabled={idx === ativos.length - 1} onClick={() => handleMover(idx, 'down')} title="Mover para baixo">
                    <ChevronDown size={15} />
                  </button>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {editandoId === m.id ? (
                    <>
                      <button className="btn btn-success" style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem' }} onClick={() => handleEditarPayout(m.id)}>
                        <Check size={14} /> Salvar
                      </button>
                      <button className="btn btn-ghost" style={{ padding: '0.3rem 0.5rem' }} onClick={() => setEditandoId(null)}>
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-ghost" style={{ padding: '0.3rem 0.5rem' }}
                        onClick={() => { setEditandoId(m.id); setEditandoPayout(((m.payout || 0.85) * 100).toFixed(0)) }} title="Editar Payout">
                        <Pencil size={15} />
                      </button>
                      <button className="btn btn-ghost" style={{ padding: '0.3rem 0.5rem', color: m.ativo ? 'var(--accent-loss)' : 'var(--accent-win)' }}
                        onClick={() => handleToggle(m)} title={m.ativo ? 'Desativar' : 'Reativar'}>
                        {m.ativo ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      <button className="btn btn-ghost" style={{ padding: '0.3rem 0.5rem', color: 'var(--accent-loss)' }}
                        onClick={() => { if (confirm(`Remover definitivamente ${m.nome}?`)) handleDeletar(m.id) }} title="Excluir">
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Aba Erros do Dia ─────────────────────────────────────────
interface ErroDiaObj { id: string; nome: string; gravidade: 'LEVE' | 'GRAVE' }

function TabErrosDia() {
  const [erros, setErros] = useState<ErroDiaObj[]>([])
  const [loading, setLoading] = useState(true)
  const [novoNome, setNovoNome] = useState('')
  const [novaGravidade, setNovaGravidade] = useState<'LEVE' | 'GRAVE'>('GRAVE')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editandoNome, setEditandoNome] = useState('')
  const [editandoGravidade, setEditandoGravidade] = useState<'LEVE'|'GRAVE'>('GRAVE')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/erros-dia')
      setErros(data)
    } catch { setError('Erro ao carregar lista') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const handleAdicionar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoNome.trim()) return
    setSaving(true)
    try {
      await api.post('/erros-dia', { nome: novoNome.trim(), gravidade: novaGravidade })
      setNovoNome('')
      setNovaGravidade('GRAVE')
      carregar()
    } catch { setError('Erro ao adicionar') }
    finally { setSaving(false) }
  }

  const handleEditar = async (id: string) => {
    if (!editandoNome.trim()) return
    setSaving(true)
    try {
      await api.patch(`/erros-dia/${id}`, { nome: editandoNome.trim(), gravidade: editandoGravidade })
      setEditandoId(null)
      carregar()
    } catch { setError('Erro ao editar') }
    finally { setSaving(false) }
  }

  const handleDeletar = async (id: string) => {
    try {
      await api.delete(`/erros-dia/${id}`)
      carregar()
    } catch { setError('Erro ao excluir') }
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>Tipos de Erro</h3>
      <p style={{ margin: '0 0 1.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        Lista de erros disponíveis para marcar ao encerrar o dia.
      </p>

      <form onSubmit={handleAdicionar} style={{ display: 'flex', gap: '0.625rem', marginBottom: '1.5rem' }}>
        <input className="input" placeholder="Nome do novo erro..."
          value={novoNome} onChange={e => setNovoNome(e.target.value)} style={{ flex: 1 }} />
        <select className="input" value={novaGravidade} onChange={e => setNovaGravidade(e.target.value as 'LEVE'|'GRAVE')} style={{ width: 140 }}>
          <option value="GRAVE">🔴 Grave</option>
          <option value="LEVE">🟡 Leve</option>
        </select>
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
      ) : erros.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem', border: '1px dashed var(--border)', borderRadius: '0.625rem' }}>
          Nenhum erro cadastrado. Adicione o primeiro acima.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {erros.map(e => (
            <div key={e.id} style={{
              display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.25rem',
              borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--bg-card)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0, marginRight: '0.5rem' }}>
                  {editandoId === e.id ? (
                    <input className="input" value={editandoNome} onChange={ev => setEditandoNome(ev.target.value)}
                      onKeyDown={ev => ev.key === 'Enter' && handleEditar(e.id)} autoFocus style={{ width: '100%' }} />
                  ) : (
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem', display: 'block', wordBreak: 'break-word' }}>
                      {e.nome}
                    </span>
                  )}
                </div>
                {editandoId !== e.id && (
                  <span className={`badge badge-${e.gravidade === 'GRAVE' ? 'loss' : 'warn'}`} style={{ fontSize: '0.65rem', flexShrink: 0 }}>
                    {e.gravidade === 'GRAVE' ? 'Grave' : 'Leve'}
                  </span>
                )}
              </div>
              
              {editandoId === e.id && (
                <div style={{ marginTop: '0.25rem' }}>
                  <select className="input" value={editandoGravidade} onChange={ev => setEditandoGravidade(ev.target.value as 'LEVE'|'GRAVE')} style={{ width: '100%' }}>
                    <option value="GRAVE">🔴 Grave</option>
                    <option value="LEVE">🟡 Leve</option>
                  </select>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '0.5rem' }}>
                {editandoId === e.id ? (
                  <>
                    <button className="btn btn-success" style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem' }} onClick={() => handleEditar(e.id)}>
                      <Check size={14} /> Salvar
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '0.3rem 0.5rem' }} onClick={() => setEditandoId(null)}>
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-ghost" style={{ padding: '0.3rem 0.5rem' }}
                      onClick={() => { setEditandoId(e.id); setEditandoNome(e.nome); setEditandoGravidade(e.gravidade ?? 'GRAVE') }} title="Editar">
                      <Pencil size={15} />
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '0.3rem 0.5rem', color: 'var(--accent-loss)' }}
                      onClick={() => { if (confirm(`Remover definitivamente o erro "${e.nome}"?`)) handleDeletar(e.id) }} title="Excluir">
                      <Trash2 size={15} />
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
      <button className={`btn ${saved ? 'btn-success' : 'btn-primary'}`} onClick={onSave}
        disabled={saving} style={{ minWidth: 140 }} id="btn-salvar-config">
        {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</>
          : saved ? <><Check size={14} /> Salvo!</>
          : <><Save size={14} /> Salvar</>}
      </button>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────
export default function Configuracoes() {
  const { config, fetchConfig, updateConfig } = useConfigStore()
  const { fetchCapital } = useCapitalStore()
  const [activeTab, setActiveTab] = useState<TabKey>('estrategia')
  const [form, setForm] = useState<Partial<Configuration>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { fetchConfig() }, [fetchConfig])
  useEffect(() => { if (config) setForm(config) }, [config])

  const setField = (key: keyof Configuration, value: string | boolean) => {
    setForm(prev => {
      // Campos de string (mês): guardar como string
      if (key === 'aporteMes') {
        return { ...prev, [key]: value === '' ? null : (value as string) }
      }
      const parsed = typeof value === 'boolean' ? value : isNaN(Number(value)) ? value : Number(value)
      return { ...prev, [key]: parsed }
    })
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateConfig(form)
      await fetchCapital() // Atualiza os widgets e saldos globais atrelados ao câmbio na interface
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { /* toast futuro */ }
    finally { setSaving(false) }
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
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)' }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.625rem 1rem', borderRadius: '0.5rem 0.5rem 0 0',
            border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
            transition: 'all 0.15s', background: 'transparent',
            color: activeTab === key ? 'var(--accent-blue)' : 'var(--text-secondary)',
            borderBottom: activeTab === key ? '2px solid var(--accent-blue)' : '2px solid transparent',
            marginBottom: '-1px',
          }}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        {activeTab === 'estrategia' && <TabEstrategia {...tabProps} />}
        {activeTab === 'financeiro' && <TabFinanceiro {...tabProps} />}
        {activeTab === 'projecao'   && <TabProjecao   {...tabProps} />}
        {activeTab === 'motivos'    && <TabMotivos />}
        {activeTab === 'ativos'     && <TabAtivos />}
        {activeTab === 'erros'      && <TabErrosDia />}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
