import { useState, useMemo } from 'react'
import { Calculator, TrendingUp, DollarSign, Activity, Settings, Info } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)

export default function Simulador() {
  const [bancaInicial, setBancaInicial] = useState<number>(1000)
  const [metaDiaria, setMetaDiaria] = useState<number>(2)
  const [dias, setDias] = useState<number>(20)
  const [jurosCompostos, setJurosCompostos] = useState<boolean>(true)

  const projecao = useMemo(() => {
    const dados = []
    let capitalAtual = bancaInicial
    const taxa = metaDiaria / 100

    for (let i = 1; i <= dias; i++) {
      const lucroDoDia = jurosCompostos
        ? capitalAtual * taxa
        : bancaInicial * taxa

      const capitalFinal = capitalAtual + lucroDoDia

      dados.push({
        dia: i,
        capitalInicial: capitalAtual,
        lucro: lucroDoDia,
        capitalFinal: capitalFinal
      })

      capitalAtual = capitalFinal
    }

    return dados
  }, [bancaInicial, metaDiaria, dias, jurosCompostos])

  const capitalFinalTotal = projecao.length > 0 ? projecao[projecao.length - 1].capitalFinal : bancaInicial
  const lucroTotal = capitalFinalTotal - bancaInicial
  const rentabilidadeTotal = bancaInicial > 0 ? (lucroTotal / bancaInicial) * 100 : 0

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const data = payload[0].payload
    return (
      <div className="card shadow-xl p-4 border border-[var(--border-light)] bg-[var(--bg-card)]/90 backdrop-blur-md w-64">
        <p className="text-[var(--text-secondary)] text-sm mb-3 border-b border-[var(--border)] pb-2 font-semibold">
          Dia {data.dia}
        </p>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between items-center text-[var(--text-muted)]">
            <span>Banca Inicial:</span>
            <span className="font-medium text-[var(--text-primary)]">{formatCurrency(data.capitalInicial)}</span>
          </div>
          <div className="flex justify-between items-center text-[var(--accent-win)]">
            <span>Lucro no Dia:</span>
            <span className="font-bold">+{formatCurrency(data.lucro)}</span>
          </div>
          <div className="flex justify-between items-center text-[var(--accent-blue)] pt-2 border-t border-[var(--border)] mt-2">
            <span>Capital Final:</span>
            <span className="font-bold">{formatCurrency(data.capitalFinal)}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-slide-in space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400 flex items-center gap-2">
          <Calculator size={26} className="text-[var(--accent-blue)]" />
          Simulador de Projeção Mensal
        </h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          Calcule a projeção da sua banca baseada em uma meta diária de ganhos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de Configurações */}
        <div className="card h-fit lg:sticky lg:top-8 flex flex-col gap-6">
          <h2 className="text-sm font-bold flex items-center gap-2 m-0 border-b border-[var(--border)] pb-4">
            <Settings size={16} className="text-[var(--text-muted)]" />
            Parâmetros da Simulação
          </h2>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-2">
                <DollarSign size={13} className="text-[#4ade80]" /> Banca Inicial (US$)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={bancaInicial}
                onChange={(e) => setBancaInicial(Number(e.target.value))}
                className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text-primary)] font-mono focus:border-[var(--accent-blue)] focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-2">
                <Activity size={13} className="text-[var(--accent-blue)]" /> Meta Diária (%)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={metaDiaria}
                onChange={(e) => setMetaDiaria(Number(e.target.value))}
                className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text-primary)] font-mono focus:border-[var(--accent-blue)] focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-2">
                <TrendingUp size={13} className="text-[#8b5cf6]" /> Dias de Operação
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={dias}
                onChange={(e) => setDias(Number(e.target.value))}
                className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text-primary)] font-mono focus:border-[var(--accent-blue)] focus:outline-none transition-colors"
              />
            </div>

            <div className="pt-4 border-t border-[var(--border)]">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors">
                    Reinvestir Lucros
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] max-w-[180px] leading-tight flex items-center gap-1">
                    <Info size={10} />
                    {jurosCompostos ? 'Juros compostos (soros)' : 'Mão fixa baseada na banca inicial (juros simples)'}
                  </span>
                </div>
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${jurosCompostos ? 'bg-[var(--accent-blue)]' : 'bg-[var(--bg-surface)] border border-[var(--border)]'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${jurosCompostos ? 'translate-x-6' : 'translate-x-1'}`} />
                  <input
                    type="checkbox"
                    className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                    checked={jurosCompostos}
                    onChange={(e) => setJurosCompostos(e.target.checked)}
                  />
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Resultados e Gráfico */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card bg-[var(--bg-surface)] border border-[var(--border)] p-4 relative overflow-hidden group hover:border-[var(--accent-blue)]/50 transition-colors">
              <p className="text-xs text-[var(--text-muted)] mb-1 font-semibold uppercase tracking-wider">Capital Final</p>
              <p className="text-2xl font-bold text-[var(--accent-blue)] m-0">{formatCurrency(capitalFinalTotal)}</p>
            </div>
            <div className="card bg-[var(--bg-surface)] border border-[var(--border)] p-4 relative overflow-hidden group hover:border-[var(--accent-win)]/50 transition-colors">
              <p className="text-xs text-[var(--text-muted)] mb-1 font-semibold uppercase tracking-wider">Lucro Líquido</p>
              <p className="text-2xl font-bold text-[var(--accent-win)] m-0">+{formatCurrency(lucroTotal)}</p>
            </div>
            <div className="card bg-[var(--bg-surface)] border border-[var(--border)] p-4 relative overflow-hidden group hover:border-[#8b5cf6]/50 transition-colors">
              <p className="text-xs text-[var(--text-muted)] mb-1 font-semibold uppercase tracking-wider">Rentabilidade</p>
              <p className="text-2xl font-bold text-[#8b5cf6] m-0">+{rentabilidadeTotal.toFixed(2)}%</p>
            </div>
          </div>

          {/* Gráfico */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold mb-6 text-[var(--text-secondary)]">Evolução da Banca</h2>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projecao} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.5} />
                  <XAxis dataKey="dia" tickFormatter={(v) => `D${v}`} stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(v) => `$${v}`} tickLine={false} axisLine={false} width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="capitalFinal" stroke="var(--accent-blue)" strokeWidth={3} fillOpacity={1} fill="url(#colorCapital)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela Diária */}
          <div className="card overflow-hidden p-0 border border-[var(--border)]">
            <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-surface)]">
              <h2 className="text-sm font-semibold m-0 text-[var(--text-secondary)]">Detalhes por Dia</h2>
            </div>
            <div className="overflow-x-auto max-h-[350px] overflow-y-auto custom-scrollbar">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: 'var(--bg-surface)', position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    {(['Dia', 'Banca Inicial', 'Lucro do Dia', 'Capital Final']).map((label, i) => (
                      <th
                        key={label}
                        style={{
                          padding: '12px 16px',
                          textAlign: i >= 1 ? 'right' : 'left',
                          fontSize: '11px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: 'var(--text-muted)',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projecao.map((row) => (
                    <tr
                      key={row.dia}
                      style={{ borderTop: '1px solid var(--border)', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px' }}>
                        Dia {row.dia}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '13px' }}>
                        {formatCurrency(row.capitalInicial)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--accent-win)', fontFamily: 'monospace', fontSize: '13px', fontWeight: 600 }}>
                        +{formatCurrency(row.lucro)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--accent-blue)', fontFamily: 'monospace', fontSize: '13px', fontWeight: 600 }}>
                        {formatCurrency(row.capitalFinal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
