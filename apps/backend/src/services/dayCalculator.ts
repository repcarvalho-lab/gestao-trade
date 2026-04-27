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
  capitalInicialReal: number,
  config: Configuration,
): { status: DayStatus; stopProximo: boolean; pctStopConsumido: number } {
  const metaIdeal = calcularMetaIdeal(capitalInicialReal, config)
  const metaMaxima = calcularMetaMaxima(capitalInicialReal, config)
  const stopDiario = calcularStopDiario(capitalInicialReal, config)

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
): DiaRecalculado {
  const tradesFinalizados = trades.filter(
    (t) => t.status === 'WIN' || t.status === 'LOSS',
  )

  const resultadoDia = tradesFinalizados.reduce((acc, t) => acc + (t.resultado ?? 0), 0)
  const rentabilidade =
    tradingDay.capitalInicialReal > 0
      ? resultadoDia / tradingDay.capitalInicialReal
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
    tradingDay.capitalInicialReal,
    config,
  )

  const metaIdeal = calcularMetaIdeal(tradingDay.capitalInicialReal, config)
  const metaMaxima = calcularMetaMaxima(tradingDay.capitalInicialReal, config)
  const stopDiario = calcularStopDiario(tradingDay.capitalInicialReal, config)

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
  aportesPorMes?: Record<string, number>   // formato: "2026-06" → valor
  saquesPorMes?: Record<string, number>
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
  aportesPorMes: Record<string, number>,
  saquesPorMes: Record<string, number>,
): MesProjecao[] {
  const resultado: MesProjecao[] = []
  let capital = capitalAtual

  for (let i = 0; i < meses; i++) {
    const mes = addMeses(mesInicio, i)
    const aporte = aportesPorMes[mes] ?? 0
    const saquePlanejado = saquesPorMes[mes] ?? 0

    const capitalComAporte = capital + aporte
    const capitalBruto = capitalComAporte * (1 + retornoMensal)

    // Sempre aplica o saque planejado no cálculo (mesmo que deixe o capital cair)
    const capitalFinal = capitalBruto - saquePlanejado

    // Saque viável é informativo: o retorno gerado no mês (máximo recomendado sem tocar o principal)
    const saqueViavel = Math.max(0, capitalBruto - capitalComAporte)

    resultado.push({
      mes,
      capitalInicial: capital,
      aporte,
      capitalComAporte,
      retorno: retornoMensal,
      capitalBruto,
      saquePlanejado,
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
