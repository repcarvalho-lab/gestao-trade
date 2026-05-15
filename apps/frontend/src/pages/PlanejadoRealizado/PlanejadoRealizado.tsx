import { useEffect, useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Activity, ShieldCheck, TrendingUp, Zap } from 'lucide-react'
import api from '../../services/api'

interface MesReport {
  mes: string
  capitalInicial: number
  bancaGlobalInicial: number
  bancaGlobalFinal: number
  vlDepositadoSacado: number
  aporteReal: number
  saqueReal: number
  pesoNet: number
  lucroTotal: number
  capitalFinal: number
  rentabTotal: number
}

interface PlanejadoData {
  meses: MesReport[]
  mesAtual: { mes: string; capitalInicial: number, bancaGlobalInicial: number, bancaGlobalFinal?: number, aporteReal: number, saqueReal: number, pesoNet: number } | null
  config: {
    retornoConservador: number
    retornoRealista: number
    retornoAgressivo: number
  }
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)

const formatCurrencyFull = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' }).format(val)

function parseMesLabel(mes: string) {
  const [ano, m] = mes.split('-')
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${nomes[Number(m) - 1]}/${ano.slice(2)}`
}

function deltaChip(real: number, planejado: number) {
  const diff = real - planejado
  const pct = planejado !== 0 ? (diff / Math.abs(planejado)) * 100 : 0
  const positivo = diff >= 0
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 7px',
      borderRadius: 6,
      fontSize: '0.72rem',
      fontWeight: 700,
      background: positivo ? 'rgba(74,222,128,0.12)' : 'rgba(244,63,94,0.12)',
      color: positivo ? '#4ade80' : '#f43f5e',
    }}>
      {positivo ? '+' : ''}{pct.toFixed(1)}%
    </span>
  )
}

export default function PlanejadoRealizado() {
  const [data, setData] = useState<PlanejadoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/planejado-realizado')
      .then(r => setData(r.data))
      .catch(() => setError('Erro ao carregar dados.'))
      .finally(() => setLoading(false))
  }, [])

  // Calcula as linhas planejadas
  const chartData = useMemo(() => {
    if (!data) return []
    const { meses, config, mesAtual } = data
    if (meses.length === 0 && !mesAtual) return []

    // Determina o capital base: primeiro mês fechado ou mês atual usando a Banca Global Inicial
    const primeiroCapital = meses.length > 0
      ? meses[0].bancaGlobalInicial
      : mesAtual!.bancaGlobalInicial

    // O ponto inicial do gráfico será o primeiro mês real que temos.
    // Vamos usar a bancaGlobalInicial como base para as projeções se não houver mês passado.
    let prevCons = primeiroCapital
    let prevReal = primeiroCapital
    let prevAgr  = primeiroCapital

    const pontos: any[] = []

    // Determina o mês zero (mês anterior ao primeiro)
    const primeiroMesStr = meses.length > 0 ? meses[0].mes : mesAtual!.mes
    const [ano, mStr] = primeiroMesStr.split('-')
    let anoNum = Number(ano)
    let mesNum = Number(mStr) - 1
    if (mesNum === 0) {
      mesNum = 12
      anoNum -= 1
    }
    const mesZero = `${anoNum}-${String(mesNum).padStart(2, '0')}`

    // Ponto Inicial (Ancoragem)
    pontos.push({
      mes: mesZero,
      realizado: primeiroCapital,
      conservador: primeiroCapital,
      realista: primeiroCapital,
      agressivo: primeiroCapital,
      parcial: false,
      net: 0,
      aporte: 0,
      saque: 0,
    })

    for (let i = 0; i < meses.length; i++) {
      const m = meses[i]
      const net = (m.aporteReal || 0) - (m.saqueReal || 0)
      const pesoNet = m.pesoNet || 0
      
      let cons = prevCons * (1 + config.retornoConservador) + net + (pesoNet * config.retornoConservador)
      let real = prevReal * (1 + config.retornoRealista)    + net + (pesoNet * config.retornoRealista)
      let agr  = prevAgr  * (1 + config.retornoAgressivo)   + net + (pesoNet * config.retornoAgressivo)
      
      prevCons = cons; prevReal = real; prevAgr = agr
      pontos.push({
        mes:         m.mes,
        realizado:   m.bancaGlobalFinal,
        conservador: Math.round(cons * 100) / 100,
        realista:    Math.round(real * 100) / 100,
        agressivo:   Math.round(agr  * 100) / 100,
        parcial:     false,
        net:         net,
        aporte:      m.aporteReal || 0,
        saque:       m.saqueReal || 0,
      })
    }

    // Ponto do mês corrente
    if (mesAtual) {
      const isFirst = meses.length === 0
      const netAtual = (mesAtual.aporteReal || 0) - (mesAtual.saqueReal || 0)
      const pesoNet = mesAtual.pesoNet || 0
      
      const realizadoFinal = mesAtual.bancaGlobalFinal ?? (mesAtual.bancaGlobalInicial + netAtual)
      
      let cons = prevCons * (1 + config.retornoConservador) + netAtual + (pesoNet * config.retornoConservador)
      let real = prevReal * (1 + config.retornoRealista) + netAtual + (pesoNet * config.retornoRealista)
      let agr  = prevAgr  * (1 + config.retornoAgressivo) + netAtual + (pesoNet * config.retornoAgressivo)
      
      pontos.push({
        mes:         mesAtual.mes,
        realizado:   realizadoFinal,
        conservador: Math.round(cons * 100) / 100,
        realista:    Math.round(real * 100) / 100,
        agressivo:   Math.round(agr  * 100) / 100,
        parcial:     true,
        net:         netAtual,
        aporte:      mesAtual.aporteReal || 0,
        saque:       mesAtual.saqueReal || 0,
      })
    }

    return pontos
  }, [data])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const ordem = ['realizado', 'conservador', 'realista', 'agressivo']
    const sorted = [...payload].sort((a, b) => ordem.indexOf(a.dataKey) - ordem.indexOf(b.dataKey))
    return (
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '0.75rem', padding: '0.875rem 1rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)', minWidth: 200,
      }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.625rem', fontWeight: 600 }}>
          {parseMesLabel(label)}
          {payload[0]?.payload?.parcial && (
            <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: 'var(--accent-blue)', fontWeight: 400 }}>
              início do mês
            </span>
          )}
        </p>
        {sorted.map((entry: any) => (
          <div key={entry.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem', marginBottom: '0.3rem', fontSize: '0.82rem' }}>
            <span style={{ color: entry.color, fontWeight: entry.dataKey === 'realizado' ? 700 : 500 }}>
              {entry.name}
            </span>
            <span style={{ fontWeight: 700, color: entry.dataKey === 'realizado' ? 'var(--text-primary)' : entry.color }}>
              {formatCurrencyFull(entry.value)}
            </span>
          </div>
        ))}
        {payload[0]?.payload?.net !== undefined && (
          <div style={{ marginTop: '0.625rem', paddingTop: '0.625rem', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
              Movimentação Real no Mês
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Aporte Realizado:</span>
                </span>
                <span style={{ color: payload[0].payload.aporte > 0 ? '#4ade80' : 'var(--text-muted)', fontWeight: payload[0].payload.aporte > 0 ? 600 : 400 }}>
                  {payload[0].payload.aporte > 0 ? `+${formatCurrencyFull(payload[0].payload.aporte)}` : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f97316', display: 'inline-block' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Saque Realizado:</span>
                </span>
                <span style={{ color: payload[0].payload.saque > 0 ? '#fb923c' : 'var(--text-muted)', fontWeight: payload[0].payload.saque > 0 ? 600 : 400 }}>
                  {payload[0].payload.saque > 0 ? `-${formatCurrencyFull(payload[0].payload.saque)}` : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginTop: '0.15rem', borderTop: '1px dashed var(--border)', paddingTop: '0.25rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Saldo no Mês:</span>
                <span style={{ color: payload[0].payload.net > 0 ? '#4ade80' : payload[0].payload.net < 0 ? '#fb923c' : 'var(--text-muted)', fontWeight: payload[0].payload.net !== 0 ? 600 : 400 }}>
                  {payload[0].payload.net > 0 ? `+${formatCurrencyFull(payload[0].payload.net)}` : payload[0].payload.net < 0 ? formatCurrencyFull(payload[0].payload.net) : '—'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Activity size={32} style={{ color: 'var(--accent-blue)', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-loss)' }}>{error}</div>
    )
  }

  if (!chartData.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '0.75rem' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Nenhum mês fechado encontrado. Os dados aparecem após o fechamento do primeiro mês operado.
        </p>
      </div>
    )
  }

  // Ignora o ponto sintético de partida para os cards de resumo
  const semParcial = chartData.filter(p => !p.parcial)
  const ultimo = semParcial[semParcial.length - 1] ?? chartData[chartData.length - 1]
  const config = data!.config

  return (
    <div className="animate-slide-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Planejado x Realizado
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
          Comparativo histórico entre o desempenho real e as projeções de cada cenário.
        </p>
      </div>

      {/* Cenário Atual (North Star) */}
      <div className="card shadow-lg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', background: 'var(--bg-surface)' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Cenário Real Consolidado — {parseMesLabel(ultimo.mes)}</p>
          <h2 style={{ margin: '0.2rem 0 0', fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {formatCurrency(ultimo.realizado)}
          </h2>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Histórico Analisado</p>
          <div className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
            {chartData.length} {chartData.length === 1 ? 'mês' : 'meses'}
          </div>
        </div>
      </div>

      {/* Cenários Projetados (Cards com Watermark) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem' }}>
        
        {/* Conservador */}
        <div className="card" style={{ borderColor: 'rgba(59,130,246,0.2)', background: 'var(--bg-surface)', position: 'relative', overflow: 'hidden', padding: '1.25rem' }}>
          <div style={{ position: 'relative', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', margin: 0, fontWeight: 600 }}>
                Conservador <span style={{ opacity: 0.7, fontWeight: 500 }}>({(config.retornoConservador * 100).toFixed(0)}%/mês)</span>
              </p>
              {deltaChip(ultimo.realizado, ultimo.conservador)}
            </div>
            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-blue)', margin: 0, lineHeight: 1 }}>
              {formatCurrency(ultimo.conservador)}
            </p>
          </div>
          <ShieldCheck size={100} strokeWidth={1.5} style={{ position: 'absolute', right: '-15px', bottom: '-20px', color: 'var(--accent-blue)', opacity: 0.1, zIndex: 0 }} />
        </div>

        {/* Realista */}
        <div className="card" style={{ borderColor: 'rgba(74,222,128,0.2)', background: 'var(--bg-surface)', position: 'relative', overflow: 'hidden', padding: '1.25rem' }}>
          <div style={{ position: 'relative', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <p style={{ fontSize: '0.8rem', color: '#4ade80', margin: 0, fontWeight: 600 }}>
                Realista <span style={{ opacity: 0.7, fontWeight: 500 }}>({(config.retornoRealista * 100).toFixed(0)}%/mês)</span>
              </p>
              {deltaChip(ultimo.realizado, ultimo.realista)}
            </div>
            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#4ade80', margin: 0, lineHeight: 1 }}>
              {formatCurrency(ultimo.realista)}
            </p>
          </div>
          <TrendingUp size={100} strokeWidth={1.5} style={{ position: 'absolute', right: '-15px', bottom: '-20px', color: '#4ade80', opacity: 0.1, zIndex: 0 }} />
        </div>

        {/* Agressivo */}
        <div className="card" style={{ borderColor: 'rgba(139,92,246,0.2)', background: 'var(--bg-surface)', position: 'relative', overflow: 'hidden', padding: '1.25rem' }}>
          <div style={{ position: 'relative', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <p style={{ fontSize: '0.8rem', color: '#8b5cf6', margin: 0, fontWeight: 600 }}>
                Agressivo <span style={{ opacity: 0.7, fontWeight: 500 }}>({(config.retornoAgressivo * 100).toFixed(0)}%/mês)</span>
              </p>
              {deltaChip(ultimo.realizado, ultimo.agressivo)}
            </div>
            <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#8b5cf6', margin: 0, lineHeight: 1 }}>
              {formatCurrency(ultimo.agressivo)}
            </p>
          </div>
          <Zap size={100} strokeWidth={1.5} style={{ position: 'absolute', right: '-15px', bottom: '-20px', color: '#8b5cf6', opacity: 0.1, zIndex: 0 }} />
        </div>

      </div>

      {/* Gráfico */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 1.5rem' }}>
          Evolução do Capital
        </h2>
        <div style={{ height: 380 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="mes"
                tickFormatter={parseMesLabel}
                stroke="var(--text-muted)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--text-muted)"
                fontSize={12}
                tickFormatter={formatCurrency}
                tickLine={false}
                axisLine={false}
                width={110}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={36}
                content={() => (
                  <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', fontSize: '0.78rem', paddingBottom: '0.5rem', fontWeight: 500 }}>
                    {[
                      { name: 'Real', color: '#f8fafc' },
                      { name: 'Conservador', color: 'var(--accent-blue)' },
                      { name: 'Realista',    color: '#4ade80' },
                      { name: 'Agressivo',   color: '#8b5cf6' },
                    ].map(item => (
                      <span key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: item.color }}>
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                        {item.name}
                      </span>
                    ))}
                  </div>
                )}
              />
              <Line type="monotone" dataKey="agressivo"   name="Agressivo"   stroke="#8b5cf6" strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
              <Line type="monotone" dataKey="realista"    name="Realista"     stroke="#4ade80" strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
              <Line type="monotone" dataKey="conservador" name="Conservador"  stroke="var(--accent-blue)" strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
              <Line type="monotone" dataKey="realizado" name="Real" stroke="#f8fafc" strokeWidth={3}
                dot={(props: any) => {
                  const { cx, cy, payload } = props
                  if (payload.parcial) {
                    return <circle key={`dot-${cx}`} cx={cx} cy={cy} r={5} fill="var(--bg-card)" stroke="#f8fafc" strokeWidth={2.5} />
                  }
                  return <circle key={`dot-${cx}`} cx={cx} cy={cy} r={4} fill="#f8fafc" stroke="none" />
                }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela mensal */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Histórico Mensal
          </h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--bg-surface)' }}>
              <tr>
                {['Mês', 'Real', 'Conservador', 'Realista', 'Agressivo', 'vs Cons.', 'vs Real.', 'vs Agr.'].map((h, i) => (
                  <th key={h} style={{
                    padding: '10px 16px',
                    textAlign: i === 0 ? 'left' : 'right',
                    fontSize: '11px', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    color: i === 2 ? 'var(--accent-blue)' : i === 3 ? '#4ade80' : i === 4 ? '#8b5cf6' : 'var(--text-muted)',
                    borderBottom: '1px solid var(--border)',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chartData.map((row) => (
                <tr key={row.mes}
                  style={{ borderTop: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '10px 16px', fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    {parseMesLabel(row.mes)}
                    {row.parcial && (
                      <span style={{ marginLeft: '0.4rem', fontSize: '0.68rem', color: 'var(--accent-blue)', fontWeight: 600, background: 'rgba(59,130,246,0.1)', padding: '1px 5px', borderRadius: 4 }}>
                        em aberto
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    {row.parcial ? (
                      <span title="Capital atual do mês corrente">{formatCurrencyFull(row.realizado)}</span>
                    ) : formatCurrencyFull(row.realizado)}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: '0.82rem', color: 'var(--accent-blue)', fontFamily: 'monospace' }}>
                    {formatCurrencyFull(row.conservador)}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: '0.82rem', color: '#4ade80', fontFamily: 'monospace' }}>
                    {formatCurrencyFull(row.realista)}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: '0.82rem', color: '#8b5cf6', fontFamily: 'monospace' }}>
                    {formatCurrencyFull(row.agressivo)}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>{deltaChip(row.realizado, row.conservador)}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>{deltaChip(row.realizado, row.realista)}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>{deltaChip(row.realizado, row.agressivo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
