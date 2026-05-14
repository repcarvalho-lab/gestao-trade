import { useState, useMemo, useEffect } from 'react'
import { Calculator, TrendingUp, DollarSign, Activity, Settings, Info, Target, Percent } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)

const getSavedVal = (key: string, defaultVal: any) => {
  const saved = localStorage.getItem(`traderos-simulador-${key}`);
  if (saved !== null) return JSON.parse(saved);
  return defaultVal;
};

export default function Simulador() {
  // Parâmetros da Simulação
  const [bancaInicial, setBancaInicial] = useState<number>(() => getSavedVal('bancaInicial', 1000))
  const [lucroAtualPct, setLucroAtualPct] = useState<number>(() => getSavedVal('lucroAtualPct', 10))
  const [diasRestantes, setDiasRestantes] = useState<number>(() => getSavedVal('diasRestantes', 10))
  const [metaDiaria, setMetaDiaria] = useState<number>(() => getSavedVal('metaDiaria', 2))
  const [jurosCompostos, setJurosCompostos] = useState<boolean>(() => getSavedVal('jurosCompostos', true))
  const [aportes, setAportes] = useState<number>(() => getSavedVal('aportes', 0))

  // Metas do Mês (%)
  const [metaConservadora, setMetaConservadora] = useState<number>(() => getSavedVal('metaConservadora', 20))
  const [metaRealista, setMetaRealista] = useState<number>(() => getSavedVal('metaRealista', 40))
  const [metaAgressiva, setMetaAgressiva] = useState<number>(() => getSavedVal('metaAgressiva', 60))

  useEffect(() => {
    localStorage.setItem('traderos-simulador-bancaInicial', JSON.stringify(bancaInicial))
    localStorage.setItem('traderos-simulador-lucroAtualPct', JSON.stringify(lucroAtualPct))
    localStorage.setItem('traderos-simulador-diasRestantes', JSON.stringify(diasRestantes))
    localStorage.setItem('traderos-simulador-metaDiaria', JSON.stringify(metaDiaria))
    localStorage.setItem('traderos-simulador-jurosCompostos', JSON.stringify(jurosCompostos))
    localStorage.setItem('traderos-simulador-metaConservadora', JSON.stringify(metaConservadora))
    localStorage.setItem('traderos-simulador-metaRealista', JSON.stringify(metaRealista))
    localStorage.setItem('traderos-simulador-metaAgressiva', JSON.stringify(metaAgressiva))
    localStorage.setItem('traderos-simulador-aportes', JSON.stringify(aportes))
  }, [bancaInicial, lucroAtualPct, diasRestantes, metaDiaria, jurosCompostos, metaConservadora, metaRealista, metaAgressiva, aportes])

  const lucroValor = bancaInicial * (lucroAtualPct / 100)
  const bancaAtual = bancaInicial + lucroValor + aportes

  const projecao = useMemo(() => {
    const dados = []
    let capitalDiaAtual = bancaAtual
    const taxa = metaDiaria / 100

    // Ponto zero (acumulado do mês)
    dados.push({
      dia: 0,
      label: 'Acumulado no Mês',
      capitalInicial: bancaInicial,
      lucro: lucroValor,
      capitalFinal: bancaAtual
    })

    for (let i = 1; i <= diasRestantes; i++) {
      const lucroDoDia = jurosCompostos
        ? capitalDiaAtual * taxa
        : bancaInicial * taxa

      const capitalFinal = capitalDiaAtual + lucroDoDia

      dados.push({
        dia: i,
        label: `Dia ${i}`,
        capitalInicial: capitalDiaAtual,
        lucro: lucroDoDia,
        capitalFinal: capitalFinal
      })

      capitalDiaAtual = capitalFinal
    }

    return dados
  }, [bancaInicial, bancaAtual, metaDiaria, diasRestantes, jurosCompostos])

  const capitalFinalTotal = projecao.length > 0 ? projecao[projecao.length - 1].capitalFinal : bancaAtual
  const lucroAcumuladoTotal = capitalFinalTotal - bancaInicial
  const rentabilidadeTotal = bancaInicial > 0 ? (lucroAcumuladoTotal / bancaInicial) * 100 : 0

  // Cálculos de valor absoluto para as metas no gráfico (considerando a banca inicial)
  // Nota: As metas são em cima da banca inicial, não dos aportes. Se quiser que os aportes 
  // afetem as metas, seria (bancaInicial + aportes). Mantendo sobre banca inicial.
  const targetConsValor = bancaInicial * (1 + metaConservadora / 100)
  const targetRealValor = bancaInicial * (1 + metaRealista / 100)
  const targetAgrValor = bancaInicial * (1 + metaAgressiva / 100)

  const getStatusMeta = () => {
    if (rentabilidadeTotal >= metaAgressiva) return { label: 'Atinge Meta Agressiva 🚀', color: '#8b5cf6' }
    if (rentabilidadeTotal >= metaRealista) return { label: 'Atinge Meta Realista 📈', color: '#4ade80' }
    if (rentabilidadeTotal >= metaConservadora) return { label: 'Atinge Meta Conservadora 🛡️', color: '#3b82f6' }
    return { label: 'Não atinge a meta base ⚠️', color: '#f59e0b' }
  }
  const statusMeta = getStatusMeta()

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const data = payload[0].payload
    return (
      <div className="card shadow-xl p-4 border border-[var(--border-light)] bg-[var(--bg-card)]/90 backdrop-blur-md w-64">
        <p className="text-[var(--text-secondary)] text-sm mb-3 border-b border-[var(--border)] pb-2 font-semibold">
          {data.label}
        </p>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between items-center text-[var(--text-muted)]">
            <span>Banca Início do Dia:</span>
            <span className="font-medium text-[var(--text-primary)]">{formatCurrency(data.capitalInicial)}</span>
          </div>
          {data.dia > 0 && (
            <div className="flex justify-between items-center text-[#4ade80]">
              <span>Lucro Projetado:</span>
              <span className="font-bold">+{formatCurrency(data.lucro)}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-[#3b82f6] pt-2 border-t border-[var(--border)] mt-2">
            <span>Banca Fim do Dia:</span>
            <span className="font-bold">{formatCurrency(data.capitalFinal)}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-slide-in space-y-8 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400">
          Simulador de Projeção Mensal
        </h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          Continue de onde parou: informe seu lucro atual e veja onde vai chegar no final do mês.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Painel Esquerdo: Configurações */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Parâmetros Atuais */}
          <div className="card space-y-5">
            <h2 className="text-sm font-bold flex items-center gap-2 m-0 border-b border-[var(--border)] pb-4">
              <Settings size={16} className="text-[var(--text-muted)]" />
              Sua Situação Atual
            </h2>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-2">
                  <DollarSign size={13} className="text-[#3b82f6]" /> Banca Inicial do Mês (US$)
                </label>
                <input
                  type="number" min="0" step="50"
                  value={bancaInicial} onChange={(e) => setBancaInicial(Number(e.target.value))}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] font-mono focus:border-[#3b82f6] focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-2">
                  <Percent size={13} className="text-[#4ade80]" /> Lucro Atual Acumulado (%)
                </label>
                <input
                  type="number" step="1"
                  value={lucroAtualPct} onChange={(e) => setLucroAtualPct(Number(e.target.value))}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] font-mono focus:border-[#4ade80] focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-2">
                  <DollarSign size={13} className="text-[#8b5cf6]" /> Aportes / Saques no Mês (US$)
                </label>
                <input
                  type="number" step="10"
                  value={aportes} onChange={(e) => setAportes(Number(e.target.value))}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] font-mono focus:border-[#8b5cf6] focus:outline-none transition-colors"
                  placeholder="Ex: 50 para depósito, -50 para saque"
                />
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  Banca Hoje: <strong className="text-[var(--text-primary)]">{formatCurrency(bancaAtual)}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Projeção para a Frente */}
          <div className="card space-y-5 border-[#8b5cf6]/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#8b5cf6]/5 rounded-full blur-3xl" />
            <h2 className="text-sm font-bold flex items-center gap-2 m-0 border-b border-[var(--border)] pb-4 relative z-10">
              <TrendingUp size={16} className="text-[#8b5cf6]" />
              Projeção Futura
            </h2>

            <div className="space-y-4 relative z-10">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-2">
                    <Activity size={13} className="text-[var(--text-muted)]" /> Dias Restantes
                  </label>
                  <input
                    type="number" min="1" max="31"
                    value={diasRestantes} onChange={(e) => setDiasRestantes(Number(e.target.value))}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] font-mono focus:border-[#8b5cf6] focus:outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-2">
                    <Target size={13} className="text-[var(--text-muted)]" /> Meta Diária (%)
                  </label>
                  <input
                    type="number" min="0" step="0.5"
                    value={metaDiaria} onChange={(e) => setMetaDiaria(Number(e.target.value))}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] font-mono focus:border-[#8b5cf6] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border)]">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[#8b5cf6] transition-colors">
                      Reinvestir Lucros
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] leading-tight">
                      {jurosCompostos ? 'Juros compostos' : 'Baseado na banca inicial (simples)'}
                    </span>
                  </div>
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${jurosCompostos ? 'bg-[#8b5cf6]' : 'bg-[var(--bg-surface)] border border-[var(--border)]'}`}>
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

          {/* Configuração das Metas do Mês */}
          <div className="card space-y-4">
            <h2 className="text-[13px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Metas do Mês (%)</h2>
            <div className="flex items-center gap-3">
              <div className="space-y-1 w-full">
                <label className="text-[10px] font-semibold text-[#3b82f6] uppercase tracking-wider">Conserv.</label>
                <input type="number" value={metaConservadora} onChange={e => setMetaConservadora(Number(e.target.value))} className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded px-2 py-1.5 text-xs text-center" />
              </div>
              <div className="space-y-1 w-full">
                <label className="text-[10px] font-semibold text-[#4ade80] uppercase tracking-wider">Realista</label>
                <input type="number" value={metaRealista} onChange={e => setMetaRealista(Number(e.target.value))} className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded px-2 py-1.5 text-xs text-center" />
              </div>
              <div className="space-y-1 w-full">
                <label className="text-[10px] font-semibold text-[#8b5cf6] uppercase tracking-wider">Agressiva</label>
                <input type="number" value={metaAgressiva} onChange={e => setMetaAgressiva(Number(e.target.value))} className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded px-2 py-1.5 text-xs text-center" />
              </div>
            </div>
          </div>
        </div>

        {/* Resultados e Gráfico */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Card Resumo Resultado */}
          <div className="card p-6 border-2 border-[var(--border)] bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-surface)] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <div className="px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2" style={{ backgroundColor: `${statusMeta.color}20`, color: statusMeta.color, border: `1px solid ${statusMeta.color}40` }}>
                {statusMeta.label}
              </div>
            </div>

            <p className="text-sm text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-1">Previsão no Final do Mês</p>
            <div className="flex items-end gap-4 mb-4">
              <h2 className="text-4xl font-extrabold text-[var(--text-primary)] m-0 leading-none tracking-tight">
                {formatCurrency(capitalFinalTotal)}
              </h2>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-bold text-[#4ade80]">+{rentabilidadeTotal.toFixed(2)}%</span>
                <span className="text-sm text-[var(--text-muted)]">(+ {formatCurrency(lucroAcumuladoTotal)})</span>
              </div>
            </div>
          </div>

          {/* Gráfico */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold mb-6 text-[var(--text-secondary)]">Evolução do Capital Projetado vs Metas</h2>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projecao} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--text-primary)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--text-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.3} />
                  <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis 
                    stroke="var(--text-muted)" 
                    fontSize={11} 
                    tickFormatter={(v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)} 
                    tickLine={false} 
                    axisLine={false} 
                    width={80} 
                    domain={[
                      (dataMin: number) => Math.floor(Math.min(dataMin, bancaInicial)), 
                      (dataMax: number) => Math.ceil(Math.max(dataMax, targetAgrValor))
                    ]} 
                  />
                  <Tooltip content={<CustomTooltip />} />
                  
                  {/* Linhas de Metas */}
                  <ReferenceLine y={targetAgrValor} stroke="#8b5cf6" strokeDasharray="5 5" opacity={0.5} label={{ position: 'insideTopLeft', value: `AGRESSIVA (${formatCurrency(targetAgrValor)})`, fill: '#8b5cf6', fontSize: 10, fontWeight: 700 }} />
                  <ReferenceLine y={targetRealValor} stroke="#4ade80" strokeDasharray="5 5" opacity={0.5} label={{ position: 'insideTopLeft', value: `REALISTA (${formatCurrency(targetRealValor)})`, fill: '#4ade80', fontSize: 10, fontWeight: 700 }} />
                  <ReferenceLine y={targetConsValor} stroke="#3b82f6" strokeDasharray="5 5" opacity={0.5} label={{ position: 'insideTopLeft', value: `CONSERV. (${formatCurrency(targetConsValor)})`, fill: '#3b82f6', fontSize: 10, fontWeight: 700 }} />
                  
                  <Area type="monotone" dataKey="capitalFinal" stroke="var(--text-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorCapital)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela Diária */}
          <div className="card overflow-hidden p-0 border border-[var(--border)]">
            <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-surface)]">
              <h2 className="text-sm font-semibold m-0 text-[var(--text-secondary)]">Detalhes da Projeção Diária</h2>
            </div>
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto custom-scrollbar">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: 'var(--bg-surface)', position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    {(['Período', 'Banca Início', 'Lucro (Período)', 'Capital Final']).map((label, i) => (
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
                      style={{ 
                        borderTop: '1px solid var(--border)', 
                        transition: 'background 0.15s',
                        background: row.dia === 0 ? 'var(--bg-surface)' : 'transparent' 
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = row.dia === 0 ? 'var(--bg-surface)' : 'transparent')}
                    >
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: row.dia === 0 ? 800 : 600, fontSize: '13px' }}>
                        {row.label}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '13px' }}>
                        {formatCurrency(row.capitalInicial)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: row.lucro > 0 ? '#4ade80' : 'var(--text-muted)', fontFamily: 'monospace', fontSize: '13px', fontWeight: 600 }}>
                        {row.lucro > 0 ? `+${formatCurrency(row.lucro)}` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '13px', fontWeight: 600 }}>
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
