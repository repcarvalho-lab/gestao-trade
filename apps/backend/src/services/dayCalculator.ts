import { Configuration, DayStatus, Trade, TradingDay } from '@prisma/client'

// ────────────────────────────────────────────────────────────
// Cálculos de metas e stops (em US$)
// ────────────────────────────────────────────────────────────

export function calcularMetaIdeal(capitalInicialReal: number, config: Configuration): number {
  return capitalInicialReal * config.metaIdealPct
}

export function calcularMetaMaxima(capitalInicialReal: number, config: Configuration): number {
  return capitalInicialReal * config.metaMaximaPct
}

export function calcularStopDiario(capitalInicialReal: number, config: Configuration): number {
  return capitalInicialReal * config.stopDiarioPct
}

export function calcularRiscoMaxCiclo(capitalInicialReal: number, config: Configuration): number {
  return capitalInicialReal * config.riscoMaxCicloPct
}

// ────────────────────────────────────────────────────────────
// Valores sugeridos de entrada
// ────────────────────────────────────────────────────────────

export function calcularValoresSugeridos(
  capitalInicialReal: number,
  config: Configuration,
): { valorENTR: number; valorMG1: number; valorMG2: number } {
  const valorENTR = Math.floor(capitalInicialReal * config.pctSugeridaEntrada)
  const valorMG1  = Math.floor(valorENTR * config.fatorMG1)
  const valorMG2  = Math.floor(valorMG1 * config.fatorMG2)
  return { valorENTR, valorMG1, valorMG2 }
}

// ────────────────────────────────────────────────────────────
// Resultado de uma operação
// ────────────────────────────────────────────────────────────

export function calcularResultadoTrade(
  valor: number,
  tradeStatus: 'WIN' | 'LOSS',
  payout: number,
): number {
  return tradeStatus === 'WIN' ? valor * payout : -valor
}

// ────────────────────────────────────────────────────────────
// Status do dia
// ────────────────────────────────────────────────────────────

export function calcularStatusDia(
  resultadoMomento: number,
  baseCapital: number,
  config: Configuration,
): { status: DayStatus; stopProximo: boolean; pctStopConsumido: number } {
  const metaIdeal = calcularMetaIdeal(baseCapital, config)
  const metaMaxima = calcularMetaMaxima(baseCapital, config)
  const stopDiario = calcularStopDiario(baseCapital, config)

  let status: DayStatus

  if (stopDiario > 0 && resultadoMomento <= -stopDiario) {
    status = 'STOP'
  } else if (resultadoMomento >= metaMaxima) {
    status = 'META_MAXIMA'
  } else if (resultadoMomento >= metaIdeal) {
    status = 'META_IDEAL'
  } else if (resultadoMomento < 0) {
    status = 'ATENCAO'
  } else {
    status = 'OPERANDO'
  }

  const perdaAtual = Math.abs(Math.min(0, resultadoMomento))
  const pctStopConsumido = stopDiario > 0 ? perdaAtual / stopDiario : 0
  const stopProximo = pctStopConsumido > 0.7 && status !== 'STOP'

  return { status, stopProximo, pctStopConsumido }
}

// ────────────────────────────────────────────────────────────
// Recálculo completo do dia (chamado após cada operação)
// ────────────────────────────────────────────────────────────

export interface DiaRecalculado {
  resultadoDia: number
  rentabilidade: number
  status: DayStatus
  numeroTrades: number
  win: number
  loss: number
  taxaAcerto: number
  ciclosRealizados: number
  // Auxiliares para o frontend (não persistidos)
  stopProximo: boolean
  pctStopConsumido: number
  faltaParaMeta: number
  espacoAntesDoStop: number
  metaIdeal: number
  metaMaxima: number
  stopDiario: number
}

export function recalcularDia(
  tradingDay: TradingDay,
  trades: Trade[],
  config: Configuration,
  bancaGlobalUSD?: number,
): DiaRecalculado {
  const baseCapital = bancaGlobalUSD ?? tradingDay.capitalInicialReal
  const tradesFinalizados = trades.filter(
    (t) => t.status === 'WIN' || t.status === 'LOSS',
  )

  const resultadoDia = tradesFinalizados.reduce((acc, t) => acc + (t.resultado ?? 0), 0)
  const rentabilidade =
    baseCapital > 0
      ? resultadoDia / baseCapital
      : 0

  const win = tradesFinalizados.filter((t) => t.status === 'WIN').length
  const loss = tradesFinalizados.filter((t) => t.status === 'LOSS').length
  const numeroTrades = tradesFinalizados.length
  const taxaAcerto = numeroTrades > 0 ? win / numeroTrades : 0

  // ciclos: conta ciclos únicos já finalizados
  const cicloIds = new Set(tradesFinalizados.map((t) => t.cicloId))
  const ciclosRealizados = cicloIds.size

  const { status, stopProximo, pctStopConsumido } = calcularStatusDia(
    resultadoDia,
    baseCapital,
    config,
  )

  const metaIdeal = calcularMetaIdeal(baseCapital, config)
  const metaMaxima = calcularMetaMaxima(baseCapital, config)
  const stopDiario = calcularStopDiario(baseCapital, config)

  const faltaParaMeta = Math.max(0, metaIdeal - resultadoDia)
  const espacoAntesDoStop = Math.max(0, stopDiario + resultadoDia)

  return {
    resultadoDia,
    rentabilidade,
    status,
    numeroTrades,
    win,
    loss,
    taxaAcerto,
    ciclosRealizados,
    stopProximo,
    pctStopConsumido,
    faltaParaMeta,
    espacoAntesDoStop,
    metaIdeal,
    metaMaxima,
    stopDiario,
  }
}

// ────────────────────────────────────────────────────────────
// Projeção anual
// ────────────────────────────────────────────────────────────

export interface MesProjecao {
  mes: string
  capitalInicial: number
  aporte: number
  capitalComAporte: number
  retorno: number
  capitalBruto: number
  saquePlanejado: number   // o que o usuário planeja retirar (usado no cálculo)
  saqueViavel: number     // informativo: máximo recomendado para retirar (= retorno do mês)
  aporteDia?: number
  saqueDia?: number
  capitalFinal: number
}

export interface ProjecaoAnual {
  conservador: MesProjecao[]
  realista: MesProjecao[]
  agressivo: MesProjecao[]
}

interface ProjecaoParams {
  capitalAtual: number
  config: Configuration
  aportesPorMes?: Record<string, { valor: number; dia: number }[]>   // formato: "2026-06" → [{ valor, dia }, ...]
  saquesPorMes?: Record<string, { valor: number; dia: number }[]>
  mesInicio: string   // "2026-04"
  meses?: number      // default 12
}

function addMeses(mesStr: string, n: number): string {
  const [ano, mes] = mesStr.split('-').map(Number)
  const data = new Date(ano, mes - 1 + n, 1)
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
}

function calcularCenario(
  capitalAtual: number,
  retornoMensal: number,
  mesInicio: string,
  meses: number,
  aportesPorMes: Record<string, { valor: number; dia: number }[]>,
  saquesPorMes: Record<string, { valor: number; dia: number }[]>,
): MesProjecao[] {
  const resultado: MesProjecao[] = []
  let capital = capitalAtual

  for (let i = 0; i < meses; i++) {
    const mes = addMeses(mesInicio, i)
    const aportesData = aportesPorMes[mes] || []
    const saquesData = saquesPorMes[mes] || []
    
    // Calcula o total de aportes e saques no mês
    const aporteTotal = aportesData.reduce((sum, a) => sum + a.valor, 0)
    const saqueTotal = saquesData.reduce((sum, s) => sum + s.valor, 0)
    
    // Para visualização (pega o dia do primeiro aporte/saque se existir)
    const aporteDia = aportesData.length > 0 ? aportesData[0].dia : 1
    const saqueDia = saquesData.length > 0 ? saquesData[0].dia : 1

    const capitalComAporte = capital + aporteTotal
    
    // Prorrateio
    const [anoStr, mesStr] = mes.split('-')
    const diasNoMes = new Date(Number(anoStr), Number(mesStr), 0).getDate()
    
    const jurosBase = capital * retornoMensal
    
    let jurosAporte = 0
    for (const a of aportesData) {
      const ratio = Math.max(0, diasNoMes - a.dia + 1) / diasNoMes
      jurosAporte += a.valor * retornoMensal * ratio
    }
    
    let jurosSaque = 0
    for (const s of saquesData) {
      const ratio = Math.max(0, diasNoMes - s.dia + 1) / diasNoMes
      jurosSaque += s.valor * retornoMensal * ratio
    }
    
    const capitalBruto = capitalComAporte + jurosBase + jurosAporte - jurosSaque

    // Sempre aplica o saque planejado no cálculo (mesmo que deixe o capital cair)
    const capitalFinal = capitalBruto - saqueTotal

    // Saque viável é informativo: o retorno gerado no mês (máximo recomendado sem tocar o principal)
    const saqueViavel = Math.max(0, capitalBruto - capitalComAporte)

    resultado.push({
      mes,
      capitalInicial: capital,
      aporte: aporteTotal,
      aporteDia,
      capitalComAporte,
      retorno: retornoMensal,
      capitalBruto,
      saquePlanejado: saqueTotal,
      saqueDia,
      saqueViavel,
      capitalFinal,
    })

    capital = capitalFinal
  }

  return resultado
}

export function calcularProjecaoAnual(params: ProjecaoParams): ProjecaoAnual {
  const {
    capitalAtual,
    config,
    aportesPorMes = {},
    saquesPorMes = {},
    mesInicio,
    meses = 12,
  } = params

  return {
    conservador: calcularCenario(
      capitalAtual,
      config.retornoConservador,
      mesInicio,
      meses,
      aportesPorMes,
      saquesPorMes,
    ),
    realista: calcularCenario(
      capitalAtual,
      config.retornoRealista,
      mesInicio,
      meses,
      aportesPorMes,
      saquesPorMes,
    ),
    agressivo: calcularCenario(
      capitalAtual,
      config.retornoAgressivo,
      mesInicio,
      meses,
      aportesPorMes,
      saquesPorMes,
    ),
  }
}
