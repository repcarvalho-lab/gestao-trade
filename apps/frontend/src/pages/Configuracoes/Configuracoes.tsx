import { useState, useEffect, useCallback } from 'react'
import {
  Save, Plus, Pencil, EyeOff, Eye, Loader2, Check, X, Settings,
  TrendingUp, DollarSign, BarChart2, Tag, AlertTriangle, Trash2,
  ChevronUp, ChevronDown, RefreshCw, Lock,
} from 'lucide-react'
import { useConfigStore, type Configuration } from '../../store/configStore'
import { useAuthStore } from '../../store/authStore'
import { useAnalyticsStore } from '../../store/analyticsStore'
import { useCapitalStore } from '../../store/capitalStore'
import api from '../../services/api'
import { formatPct, formatUSD } from '../../lib/format'

// ─── Tipos ────────────────────────────────────────────────────
interface MotivoEntrada { id: string; nome: string; ativo: boolean }
interface AtivoObj { id: string; nome: string; ativo: boolean; payout: number }
type TabKey = 'estrategia' | 'financeiro' | 'projecao' | 'motivos' | 'ativos' | 'erros' | 'sistema'

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'estrategia', label: 'Estratégia',          icon: TrendingUp },
  { key: 'financeiro', label: 'Financeiro',          icon: DollarSign },
  { key: 'projecao',   label: 'Projeção',            icon: BarChart2 },
  { key: 'motivos',    label: 'Origem da Entrada',   icon: Tag },
  { key: 'ativos',     label: 'Ativos Disponíveis',    icon: Tag },
  { key: 'erros',      label: 'Tipos de Erro',        icon: AlertTriangle },
  { key: 'sistema',    label: 'Sistema',              icon: RefreshCw },
]


// ─── Campo de configuração ────────────────────────────────────
function ConfigField({
  label, desc, id, type = 'number', value, onChange, step, min, max, suffix, disabled = false,
}: {
  label: string; desc?: string; id: string; type?: string
  value: string | number | boolean; onChange: (v: string | boolean) => void
  step?: string; min?: string; max?: string; suffix?: string; disabled?: boolean
}) {
  const [localValue, setLocalValue] = useState(String(value))

  useEffect(() => {
    // Sync external changes, but ignore if the numerical values match 
    // to prevent overwriting intermediate states like "1." or "1,0"
    if (type === 'number') {
      const numVal = Number(value)
      const numLocal = Number(localValue.replace(',', '.'))
      if (numVal !== numLocal && !isNaN(numVal)) {
        setLocalValue(String(value))
      }
    } else {
      setLocalValue(String(value))
    }
  }, [value, type])

  if (type === 'boolean') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 0', borderBottom: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            {label}
            {disabled && <Lock size={12} style={{ color: 'var(--text-muted)' }} title="Campo fixado para integridade do sistema" />}
          </div>
          {desc && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{desc}</div>}
        </div>
        <button
          id={id} type="button" onClick={() => !disabled && onChange(!value)} disabled={disabled}
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '0.5rem' }}>
        <label htmlFor={id} style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {label}
          {disabled && <Lock size={12} style={{ color: 'var(--text-muted)' }} title="Campo fixado para integridade do sistema" />}
        </label>
        {desc && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{desc}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input id={id} className="input" type={type} step={step} min={min} max={max}
          value={localValue} disabled={disabled} 
          onChange={e => {
            setLocalValue(e.target.value)
            // Call onChange only if it's a valid number or empty
            if (e.target.value === '' || !isNaN(Number(e.target.value.replace(',', '.')))) {
              onChange(e.target.value.replace(',', '.'))
            }
          }} 
          style={{ maxWidth: 200, cursor: disabled ? 'not-allowed' : undefined, opacity: disabled ? 0.7 : 1 }} />
        {suffix && <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{suffix}</span>}
      </div>
    </div>
  )
}

// ─── Linha de Configuração Padrão (Apple/Github Layout) ─────────
const renderSettingsRow = (titulo: string, descricao: string, children: React.ReactNode) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', padding: '2.5rem 0', borderBottom: '1px solid var(--border)' }}>
    <div style={{ paddingRight: '1rem', alignSelf: 'center' }}>
      <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.5rem', letterSpacing: '-0.01em' }}>{titulo}</h3>
      <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>{descricao}</p>
    </div>
    <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      {children}
    </div>
  </div>
)
// ─── Aba Estratégia ───────────────────────────────────────────
function TabEstrategia({ form, set, onSave, saving, saved }: {
  form: Partial<Configuration>; set: (k: keyof Configuration, v: string | boolean) => void
  onSave: () => void; saving: boolean; saved: boolean
}) {
  const { dashboardData, fetchDashboard } = useAnalyticsStore()
  useEffect(() => { if (!dashboardData) fetchDashboard() }, [])
  const banca = dashboardData?.indicadores?.bancaGlobal ?? null

  return (
    <div style={{ maxWidth: 1000 }}>
      <p style={{ margin: '0 0 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Configure metas, gestão de risco e estrutura Martingale. As alterações afetam os cálculos do Painel do Dia.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        
        {/* Metas Diárias */}
        {renderSettingsRow("Metas Diárias", "Percentuais de referência para encerramento do dia e limites comportamentais. Estes valores ajudam a definir a disciplina operacional.", 
          <>
            <ConfigField id="metaIdealPct" label="Meta Ideal (%)"
              desc="Ganho mínimo para considerar encerrar o dia."
              type="number" step="0.001" min="0" max="1"
              value={Number((form.metaIdealPct ?? 0.02) * 100).toFixed(2)}
              onChange={v => set('metaIdealPct', String(Number(v) / 100))} suffix="%" />
            <ConfigField id="metaMaximaPct" label="Meta Máxima (%)"
              desc="Percentual bônus — encerramento obrigatório."
              type="number" step="0.001" min="0" max="1"
              value={Number((form.metaMaximaPct ?? 0.03) * 100).toFixed(2)}
              onChange={v => set('metaMaximaPct', String(Number(v) / 100))} suffix="%" />
            <ConfigField id="maxCiclosPorDia" label="Limite de Ciclos por Dia"
              desc="Número máximo de ciclos permitidos operacionalmente."
              type="number" step="1" min="1"
              value={form.maxCiclosPorDia ?? 3}
              onChange={v => set('maxCiclosPorDia', v)} />
          </>
        )}

        {/* Gestão de Risco */}
        {renderSettingsRow("Gestão de Risco", "Limites de perda e exposição de capital por operação e por dia. O sistema calcula automaticamente os valores com base no tamanho da sua banca global atual.", 
          <>
            <ConfigField id="stopDiarioPct" label="Stop Diário (%)"
              desc="Perda máxima permitida no dia. Ao atingir, encerrar."
              type="number" step="0.001" min="0" max="1"
              value={Number((form.stopDiarioPct ?? 0.06) * 100).toFixed(2)}
              onChange={v => {
                set('stopDiarioPct', String(Number(v) / 100))
                set('riscoMaxCicloPct', String(Number(v) / 100))
              }} suffix="%" />
            <ConfigField id="pctSugeridaEntrada" label="% Sugerida de Entrada (ENTR)"
              desc="Base para calcular o valor sugerido na entrada."
              type="number" step="0.001" min="0" max="1"
              value={Number((form.pctSugeridaEntrada ?? 0.02) * 100).toFixed(2)}
              onChange={v => set('pctSugeridaEntrada', String(Number(v) / 100))} suffix="%" />

            {/* Card unificado */}
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
                  margin: '1rem 0 0',
                  padding: '1rem',
                  borderRadius: '0.625rem',
                  background: 'rgba(16,185,129,0.06)',
                  border: '1px solid rgba(16,185,129,0.2)',
                }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-win)', marginBottom: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Operação com base no Stop Diário</span>
                    {temBanca && <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{formatUSD(banca!)}</span>}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${itens.length + 1}, 1fr)`, gap: '0.75rem' }}>
                    {itens.map(({ label, pct, val, color }) => (
                      <div key={label} style={{
                        padding: '0.625rem 0.5rem',
                        borderRadius: '0.5rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        textAlign: 'center',
                      }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color, fontFamily: 'monospace' }}>{fmtPctCalc(pct)}</div>
                        {temBanca && val != null && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: '0.25rem' }}>${val}</div>
                        )}
                      </div>
                    ))}
                    <div style={{
                      padding: '0.625rem 0.5rem',
                      borderRadius: '0.5rem',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ciclo</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{fmtPctCalc(risco)}</div>
                      {temBanca && totalCiclo != null && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: '0.25rem' }}>${totalCiclo}</div>
                      )}
                    </div>
                  </div>

                  {temBanca && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Valores arredondados para baixo — corretora aceita apenas inteiros.</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-loss)', fontSize: '0.85rem' }}>
                        ${totalCiclo} <span style={{ fontWeight: 400 }}>({(totalPct * 100).toFixed(2)}% da banca)</span>
                      </span>
                    </div>
                  )}

                  {(form.pctSugeridaEntrada ?? 0.02) - entr > 0.0001 && (() => {
                    const configurada = form.pctSugeridaEntrada ?? 0.02
                    const riscoNecessario = configurada * divisor
                    return (
                      <div style={{ marginTop: '0.75rem', padding: '0.625rem 0.875rem', borderRadius: '0.375rem', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', fontSize: '0.8rem', color: 'var(--accent-warn)' }}>
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
          </>
        )}

        {/* Martingale */}
        {renderSettingsRow("Martingale", "Estrutura de reforço após perdas. Defina os fatores multiplicadores para cada tentativa extra.", 
          <>
            <ConfigField id="mg2Habilitado" label="MG2 Habilitado"
              desc="Permite realizar o segundo Martingale (MG2)."
              type="boolean"
              value={form.mg2Habilitado ?? false}
              onChange={v => {
                set('mg2Habilitado', v)
                set('maxEntradasPorCiclo', v ? '3' : '2')
              }} />
            <ConfigField id="fatorMG1" label="Fator MG1"
              desc="Multiplicador sobre o valor de entrada."
              type="number" step="0.1" min="1"
              value={form.fatorMG1 ?? 2}
              onChange={v => set('fatorMG1', v)} suffix="×" />
            <ConfigField id="fatorMG2" label="Fator MG2"
              desc="Multiplicador sobre MG1 para calcular MG2."
              type="number" step="0.1" min="1"
              value={form.fatorMG2 ?? 2}
              onChange={v => set('fatorMG2', v)} suffix="×" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border)', borderRadius: '0.625rem', background: 'rgba(255,255,255,0.02)', marginTop: '0.5rem' }}>
              <div>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.875rem' }}>Entradas Totais por Ciclo</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Calculado automaticamente: {form.mg2Habilitado ? 'ENTR + MG1 + MG2' : 'ENTR + MG1'}
                </div>
              </div>
              <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.25rem', color: 'var(--accent-blue)', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '0.5rem', padding: '0.25rem 1rem' }}>
                {form.mg2Habilitado ? 3 : 2}
              </div>
            </div>
          </>
        )}

      </div>
      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
        <SaveButton onSave={onSave} saving={saving} saved={saved} />
      </div>
    </div>
  )
}

// ─── Aba Financeiro ───────────────────────────────────────────
function TabFinanceiro({ form, set, onSave, saving, saved }: {
  form: Partial<Configuration>; set: (k: keyof Configuration, v: string | boolean) => void
  onSave: () => void; saving: boolean; saved: boolean
}) {
  return (
    <div style={{ maxWidth: 1000 }}>
      <p style={{ margin: '0 0 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Configure taxas de câmbio e os saldos base do sistema.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        
        {/* Parâmetros Financeiros */}
        {renderSettingsRow("Câmbio e Conversões", "Taxas de câmbio usadas nas conversões automáticas de depósitos e saques da corretora.", 
          <>
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
          </>
        )}

        {/* Saldo Inicial do Sistema */}
        {renderSettingsRow("Saldo Inicial do Sistema", "Configuração do saldo base inicial e a data em que o controle foi iniciado (usado para gerar o histórico da Banca Global).", 
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <ConfigField id="saldoInicialCorretora" label="Saldo na Corretora"
                desc="Capital em US$ na conta da corretora."
                type="number" step="0.01" min="0" disabled={true}
                value={form.saldoInicialCorretora ?? ''}
                onChange={v => set('saldoInicialCorretora', v ? String(Number(v)) : '')} suffix="US$" />

              <ConfigField id="saldoInicialReserva" label="Saldo de Reserva"
                desc="Capital em US$ em caixa fora da corretora."
                type="number" step="0.01" min="0" disabled={true}
                value={form.saldoInicialReserva ?? ''}
                onChange={v => set('saldoInicialReserva', v ? String(Number(v)) : '')} suffix="US$" />
            </div>

            {(() => {
              const dateVal = form.dataSaldoInicial ? new Date(form.dataSaldoInicial as string) : new Date()
              const m = (dateVal.getUTCMonth() + 1).toString().padStart(2, '0')
              const y = dateVal.getUTCFullYear().toString()

              const handleChange = (newM: string, newY: string) => {
                set('dataSaldoInicial', new Date(`${newY}-${newM}-01T12:00:00Z`).toISOString())
              }

              const meses = [
                {v:'01', l:'Janeiro'}, {v:'02', l:'Fevereiro'}, {v:'03', l:'Março'}, {v:'04', l:'Abril'},
                {v:'05', l:'Maio'}, {v:'06', l:'Junho'}, {v:'07', l:'Julho'}, {v:'08', l:'Agosto'},
                {v:'09', l:'Setembro'}, {v:'10', l:'Outubro'}, {v:'11', l:'Novembro'}, {v:'12', l:'Dezembro'}
              ]

              const anos = Array.from({length: 10}, (_, i) => (new Date().getUTCFullYear() - 2 + i).toString())

              return (
                <div style={{ padding: '0.875rem 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '0.5rem' }}>
                    <label style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      Mês/Ano do Saldo Inicial
                      <Lock size={12} style={{ color: 'var(--text-muted)' }} title="Campo fixado para integridade do sistema" />
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>Mês base para que os relatórios puxem este valor como ponto de partida.</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select className="input" value={m} onChange={e => handleChange(e.target.value, y)} style={{ flex: 1, maxWidth: 160 }}>
                      {meses.map(mes => <option key={mes.v} value={mes.v}>{mes.l}</option>)}
                    </select>
                    <select className="input" value={y} onChange={e => handleChange(m, e.target.value)} style={{ width: 100 }}>
                      {anos.map(ano => <option key={ano} value={ano}>{ano}</option>)}
                    </select>
                  </div>
                </div>
              )
            })()}
          </>
        )}

      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
        <SaveButton onSave={onSave} saving={saving} saved={saved} />
      </div>
    </div>
  )
}

// ─── Aba Projeção ─────────────────────────────────────────────
function TabProjecao({ form, set, onSave, saving, saved }: {
  form: Partial<Configuration>; set: (k: keyof Configuration, v: string | boolean) => void
  onSave: () => void; saving: boolean; saved: boolean
}) {
  return (
    <div className="card" style={{ padding: '1.5rem', maxWidth: 1000 }}>
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
    <div className="card" style={{ padding: '1.5rem', maxWidth: 700 }}>
      <h3 style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>Origem da Entrada</h3>
      <p style={{ margin: '0 0 1.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        Adicione, edite e desative origens. Origens desativadas são preservadas no histórico.
      </p>

      <form onSubmit={handleAdicionar} style={{ display: 'flex', gap: '0.625rem', marginBottom: '1.5rem', background: 'var(--bg-surface)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
        <input className="input" placeholder="Nome da nova origem..."
          value={novoNome} onChange={e => setNovoNome(e.target.value)} id="novo-motivo-input" style={{ flex: 1 }} />
        <button type="submit" className="btn btn-primary" disabled={saving || !novoNome.trim()} style={{ whiteSpace: 'nowrap', padding: '0 1.5rem' }}>
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
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem',
              borderRadius: '0.5rem', border: '1px solid var(--border)',
              background: m.ativo ? 'var(--bg-surface)' : 'rgba(255,255,255,0.02)',
              opacity: m.ativo ? 1 : 0.5, transition: 'all 0.15s',
            }}>
              <div style={{ flex: 1, minWidth: 0, marginRight: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {editandoId === m.id ? (
                  <input className="input" value={editandoNome} onChange={e => setEditandoNome(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleEditar(m.id)} autoFocus style={{ width: '100%', maxWidth: 300 }} />
                ) : (
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{m.nome}</span>
                )}
                {!m.ativo && <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>Inativo</span>}
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {editandoId === m.id ? (
                  <>
                    <button className="btn btn-success" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleEditar(m.id)}>
                      <Check size={14} /> Salvar
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '0.35rem 0.5rem' }} onClick={() => setEditandoId(null)}>
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-ghost" style={{ padding: '0.35rem 0.5rem' }}
                      onClick={() => { setEditandoId(m.id); setEditandoNome(m.nome) }} title="Editar">
                      <Pencil size={14} />
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '0.35rem 0.5rem', color: m.ativo ? 'var(--accent-loss)' : 'var(--accent-win)' }}
                      onClick={() => handleToggle(m)} title={m.ativo ? 'Desativar' : 'Reativar'}>
                      {m.ativo ? <EyeOff size={14} /> : <Eye size={14} />}
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
    <div className="card" style={{ padding: '1.5rem', maxWidth: 700 }}>
      <h3 style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>Ativos Disponíveis</h3>
      <p style={{ margin: '0 0 1.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        Cadastre os ativos que você opera (ex: BTC/USDT, ETH/USDT).
      </p>

      <form onSubmit={handleAdicionar} style={{ display: 'flex', gap: '0.625rem', marginBottom: '1.5rem', background: 'var(--bg-surface)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
        <input className="input" placeholder="Ativo. Ex: BTC/USDT" style={{ flex: 1 }}
          value={novoNome} onChange={e => setNovoNome(e.target.value.toUpperCase())} id="novo-ativo-input" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input className="input" type="number" placeholder="Payout" style={{ width: 80 }}
            value={novoPayout} onChange={e => setNovoPayout(e.target.value)} min="1" max="100" />
          <span style={{ color: 'var(--text-muted)' }}>%</span>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving || !novoNome.trim()} style={{ whiteSpace: 'nowrap', padding: '0 1.5rem' }}>
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
          {ativos.map((m, idx) => (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem',
              borderRadius: '0.5rem', border: '1px solid var(--border)',
              background: m.ativo ? 'var(--bg-surface)' : 'rgba(255,255,255,0.02)',
              opacity: m.ativo ? 1 : 0.5, transition: 'all 0.15s',
            }}>
              <div style={{ flex: 1, minWidth: 0, marginRight: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: 150, flexShrink: 0 }}>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{m.nome}</span>
                  {!m.ativo && <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>Inativo</span>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderLeft: '1px solid var(--border)', paddingLeft: '1rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Payout:</span>
                  {editandoId === m.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <input className="input" type="number" style={{ width: 60, padding: '0.2rem 0.4rem', fontSize: '0.8rem' }} 
                        value={editandoPayout} onChange={e => setEditandoPayout(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleEditarPayout(m.id)} autoFocus />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>%</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.9rem', color: 'var(--accent-blue)', fontWeight: 700 }}>
                      {formatPct(m.payout, 0)}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '2px', marginRight: '0.5rem', borderRight: '1px solid var(--border)', paddingRight: '0.5rem' }}>
                  <button className="btn btn-ghost" style={{ padding: '0.2rem', opacity: idx === 0 ? 0.2 : 1 }}
                    disabled={idx === 0} onClick={() => handleMover(idx, 'up')} title="Mover para cima">
                    <ChevronUp size={15} />
                  </button>
                  <button className="btn btn-ghost" style={{ padding: '0.2rem', opacity: idx === ativos.length - 1 ? 0.2 : 1 }}
                    disabled={idx === ativos.length - 1} onClick={() => handleMover(idx, 'down')} title="Mover para baixo">
                    <ChevronDown size={15} />
                  </button>
                </div>

                {editandoId === m.id ? (
                  <>
                    <button className="btn btn-success" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleEditarPayout(m.id)}>
                      <Check size={14} /> Salvar
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '0.35rem 0.5rem' }} onClick={() => setEditandoId(null)}>
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-ghost" style={{ padding: '0.35rem 0.5rem' }}
                      onClick={() => { setEditandoId(m.id); setEditandoPayout(((m.payout || 0.85) * 100).toFixed(0)) }} title="Editar Payout">
                      <Pencil size={14} />
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '0.35rem 0.5rem', color: m.ativo ? 'var(--accent-loss)' : 'var(--accent-win)' }}
                      onClick={() => handleToggle(m)} title={m.ativo ? 'Desativar' : 'Reativar'}>
                      {m.ativo ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '0.35rem 0.5rem', color: 'var(--accent-loss)' }}
                      onClick={() => { if (confirm(`Remover definitivamente ${m.nome}?`)) handleDeletar(m.id) }} title="Excluir">
                      <Trash2 size={14} />
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
    <div className="card" style={{ padding: '1.5rem', maxWidth: 700 }}>
      <h3 style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>Tipos de Erro</h3>
      <p style={{ margin: '0 0 1.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        Lista de erros disponíveis para marcar ao encerrar o dia.
      </p>

      <form onSubmit={handleAdicionar} style={{ display: 'flex', gap: '0.625rem', marginBottom: '1.5rem', background: 'var(--bg-surface)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
        <input className="input" placeholder="Nome do novo erro..."
          value={novoNome} onChange={e => setNovoNome(e.target.value)} style={{ flex: 1 }} />
        <select className="input" value={novaGravidade} onChange={e => setNovaGravidade(e.target.value as 'LEVE'|'GRAVE')} style={{ width: 140 }}>
          <option value="GRAVE">🔴 Grave</option>
          <option value="LEVE">🟡 Leve</option>
        </select>
        <button type="submit" className="btn btn-primary" disabled={saving || !novoNome.trim()} style={{ whiteSpace: 'nowrap', padding: '0 1.5rem' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {erros.map(e => (
            <div key={e.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem',
              borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-surface)',
            }}>
              <div style={{ flex: 1, minWidth: 0, marginRight: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 220, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  {editandoId === e.id ? (
                    <input className="input" value={editandoNome} onChange={ev => setEditandoNome(ev.target.value)}
                      onKeyDown={ev => ev.key === 'Enter' && handleEditar(e.id)} autoFocus style={{ width: '100%' }} />
                  ) : (
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.nome}</span>
                  )}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', borderLeft: '1px solid var(--border)', paddingLeft: '1rem' }}>
                  {editandoId === e.id ? (
                    <select className="input" value={editandoGravidade} onChange={ev => setEditandoGravidade(ev.target.value as 'LEVE'|'GRAVE')} style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', height: 'auto' }}>
                      <option value="GRAVE">🔴 Grave</option>
                      <option value="LEVE">🟡 Leve</option>
                    </select>
                  ) : (
                    <span className={`badge badge-${e.gravidade === 'GRAVE' ? 'loss' : 'warn'}`} style={{ fontSize: '0.65rem' }}>
                      {e.gravidade === 'GRAVE' ? 'Grave' : 'Leve'}
                    </span>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {editandoId === e.id ? (
                  <>
                    <button className="btn btn-success" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleEditar(e.id)}>
                      <Check size={14} /> Salvar
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '0.35rem 0.5rem' }} onClick={() => setEditandoId(null)}>
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-ghost" style={{ padding: '0.35rem 0.5rem' }}
                      onClick={() => { setEditandoId(e.id); setEditandoNome(e.nome); setEditandoGravidade(e.gravidade ?? 'GRAVE') }} title="Editar">
                      <Pencil size={14} />
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '0.35rem 0.5rem', color: 'var(--accent-loss)' }}
                      onClick={() => { if (confirm(`Remover definitivamente o erro "${e.nome}"?`)) handleDeletar(e.id) }} title="Excluir">
                      <Trash2 size={14} />
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

// ─── Aba Sistema / Faxina ─────────────────────────────────────
function TabSistema() {
  const [cleaning, setCleaning] = useState(false)
  const [done, setDone] = useState(false)

  const handleFixReports = async () => {
    if (!confirm('Esta ação irá recalcular todos os relatórios do zero para corrigir divergências nos gráficos. O processo é seguro e não deleta suas operações reais. Deseja continuar?')) return
    setCleaning(true)
    try {
      await api.post('/trading-days/fix-reports')
      setDone(true)
      setTimeout(() => window.location.reload(), 1500)
    } catch (e) {
      alert('Erro ao limpar sistema.')
    } finally {
      setCleaning(false)
    }
  }

  return (
    <div className="card" style={{ padding: '1.5rem', maxWidth: 1000 }}>
      <h3 style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '1rem', color: 'var(--accent-loss)' }}>Manutenção e Faxina do Sistema</h3>
      <p style={{ margin: '0 0 1.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        Ferramentas para corrigir inconsistências ou divergências de valores nos gráficos.
      </p>

      <div style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.5rem' }}>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Sincronizar Relatórios</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.3rem', maxWidth: 600, lineHeight: 1.5 }}>Se os gráficos estiverem mostrando valores diferentes da sua Banca Global, use esta opção para forçar o recalculo e remover dados fantasmas que ficaram presos.</div>
          </div>
          <button className="btn" style={{ background: 'var(--accent-loss)', color: '#fff', border: 'none', padding: '0.5rem 1rem' }} onClick={handleFixReports} disabled={cleaning || done}>
            {cleaning ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Limpando...</> : done ? <><Check size={14} /> Resolvido!</> : 'Executar Sincronização'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────
export default function Configuracoes() {
  const { user } = useAuthStore()
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
      // Campos de string (mês ou data ISO): guardar como string explicitamente
      if (key === 'aporteMes' || key === 'dataSaldoInicial') {
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
  
  const allowedTabs = user?.role === 'admin' ? TABS : TABS.filter(t => t.key !== 'sistema')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: 1400 }}>
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
        {allowedTabs.map(({ key, label, icon: Icon }) => (
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

      <div style={{ padding: '0 0 2rem 0' }}>
        {activeTab === 'estrategia' && <TabEstrategia {...tabProps} />}
        {activeTab === 'financeiro' && <TabFinanceiro {...tabProps} />}
        {activeTab === 'projecao'   && <TabProjecao   {...tabProps} />}
        {activeTab === 'motivos'    && <TabMotivos />}
        {activeTab === 'ativos'     && <TabAtivos />}
        {activeTab === 'erros'      && <TabErrosDia />}
        {activeTab === 'sistema'    && <TabSistema />}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
