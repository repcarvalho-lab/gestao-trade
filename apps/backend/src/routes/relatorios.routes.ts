import { Router, Request, Response } from 'express'
import { authenticate } from '../middleware/auth'
import { catchAsync } from '../utils/catchAsync'
import { getRelatorioDisciplina } from '../services/disciplina.service'
import { prisma } from '../lib/prisma'

const router = Router()
router.use(authenticate)

// ─── Helper: monta filtro de data para TradingDay ─────────────
function buildDayFilter(inicio?: string, fim?: string): object {
  if (!inicio && !fim) return {}
  const cond: { gte?: Date; lte?: Date } = {}
  if (inicio) cond.gte = new Date(inicio)
  if (fim)    cond.lte = new Date(fim)
  return { date: cond }
}

// ─── Helper: monta filtro de data para Trade (via tradingDay) ──
function buildTradeFilter(inicio?: string, fim?: string): object {
  if (!inicio && !fim) return {}
  const cond: { gte?: Date; lte?: Date } = {}
  if (inicio) cond.gte = new Date(inicio)
  if (fim)    cond.lte = new Date(fim)
  return { tradingDay: { date: cond } }
}

router.get('/disciplina', catchAsync(async (req: Request, res: Response) => {
  const { inicio, fim } = req.query as { inicio?: string; fim?: string }
  const data = await getRelatorioDisciplina(req.user!.userId, buildDayFilter(inicio, fim))
  res.json(data)
}))

router.get('/estrategias', catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const { inicio, fim } = req.query as { inicio?: string; fim?: string }

  const trades = await prisma.trade.findMany({
    where: {
      userId,
      status: { in: ['WIN', 'LOSS'] },
      ...buildTradeFilter(inicio, fim),
    },
    select: {
      status: true,
      resultado: true,
      valor: true,
      tipo: true,
      motivoId: true,
      motivoOutro: true,
      motivo: { select: { nome: true } },
    },
  })

  // Agrupa por estratégia
  const mapa: Record<string, {
    nome: string
    total: number
    wins: number
    losses: number
    resultadoTotal: number
    resultados: number[]
  }> = {}

  for (const t of trades) {
    const key  = t.motivoId ?? '__outro__'
    const nome = t.motivo?.nome ?? (t.motivoOutro ? `Outro: ${t.motivoOutro}` : 'Sem motivo')

    if (!mapa[key]) mapa[key] = { nome, total: 0, wins: 0, losses: 0, resultadoTotal: 0, resultados: [] }

    const g = mapa[key]
    g.total++
    if (t.status === 'WIN') g.wins++
    else g.losses++
    const res = t.resultado ?? 0
    g.resultadoTotal += res
    g.resultados.push(res)
  }

  const estrategias = Object.values(mapa).map(g => ({
    nome: g.nome,
    total: g.total,
    wins: g.wins,
    losses: g.losses,
    taxaAcerto: g.total > 0 ? g.wins / g.total : 0,
    resultadoTotal: g.resultadoTotal,
    resultadoMedio: g.total > 0 ? g.resultadoTotal / g.total : 0,
    melhorTrade: Math.max(...g.resultados, 0),
    piorTrade: Math.min(...g.resultados, 0),
  })).sort((a, b) => b.taxaAcerto - a.taxaAcerto)

  res.json({ estrategias, totalTrades: trades.length })
}))

router.get('/erros', catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const { inicio, fim } = req.query as { inicio?: string; fim?: string }

  const dias = await prisma.tradingDay.findMany({
    where: { userId, isClosed: true, ...buildDayFilter(inicio, fim) },
    select: { errosDia: true, resultadoDia: true, date: true },
    orderBy: { date: 'asc' },
  })

  const totalDias = dias.length
  const mediaGeral = totalDias > 0
    ? dias.reduce((s, d) => s + (d.resultadoDia ?? 0), 0) / totalDias
    : 0

  // Mapa: nome do erro → dias com esse erro / dias sem
  const mapa: Record<string, { resultadosCom: number[] }> = {}

  const dbErros = await prisma.erroDia.findMany({ where: { userId } })
  const erroMap = new Map(dbErros.map(e => [e.nome, e.gravidade]))

  for (const dia of dias) {
    for (const erro of dia.errosDia) {
      if (!mapa[erro]) mapa[erro] = { resultadosCom: [] }
      mapa[erro].resultadosCom.push(dia.resultadoDia ?? 0)
    }
  }

  const erros = Object.entries(mapa).map(([nome, { resultadosCom }]) => {
    const ocorrencias = resultadosCom.length
    const mediaCom = resultadosCom.reduce((s, v) => s + v, 0) / ocorrencias

    // Dias sem esse erro
    const resultadosSem = dias
      .filter(d => !d.errosDia.includes(nome))
      .map(d => d.resultadoDia ?? 0)
    const mediaSem = resultadosSem.length > 0
      ? resultadosSem.reduce((s, v) => s + v, 0) / resultadosSem.length
      : 0

    const impactoPorOcorrencia = mediaSem - mediaCom
    const impactoTotal = impactoPorOcorrencia * ocorrencias
    const gravidade = erroMap.get(nome) || 'GRAVE'

    return {
      nome,
      gravidade,
      ocorrencias,
      pctDias: totalDias > 0 ? ocorrencias / totalDias : 0,
      mediaResultadoCom: mediaCom,
      mediaResultadoSem: mediaSem,
      impactoPorOcorrencia,
      impactoTotal,
    }
  }).sort((a, b) => b.impactoTotal - a.impactoTotal)

  res.json({ erros, totalDias, mediaGeral })
}))

router.get('/meta', catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const { inicio, fim } = req.query as { inicio?: string; fim?: string }

  type StatusMeta = 'META_IDEAL' | 'META_MAXIMA' | 'META_NAO_ATINGIDA' | 'STOP'
  const statusValidos: StatusMeta[] = ['META_IDEAL', 'META_MAXIMA', 'STOP', 'META_NAO_ATINGIDA']

  const dias = await prisma.tradingDay.findMany({
    where: {
      userId,
      isClosed: true,
      status: { in: statusValidos },
      ...buildDayFilter(inicio, fim),
    },
    select: { status: true, resultadoDia: true, date: true },
    orderBy: { date: 'asc' },
  })

  const totalDias = dias.length

  const dist: Record<StatusMeta, { count: number; resultados: number[] }> = {
    META_IDEAL:        { count: 0, resultados: [] },
    META_MAXIMA:       { count: 0, resultados: [] },
    META_NAO_ATINGIDA: { count: 0, resultados: [] },
    STOP:              { count: 0, resultados: [] },
  }

  for (const dia of dias) {
    const s = dia.status as StatusMeta
    if (dist[s]) {
      dist[s].count++
      dist[s].resultados.push(dia.resultadoDia ?? 0)
    }
  }

  const distribuicao = Object.fromEntries(
    Object.entries(dist).map(([k, { count, resultados }]) => [k, {
      count,
      pct: totalDias > 0 ? count / totalDias : 0,
      resultadoTotal: resultados.reduce((s, v) => s + v, 0),
      resultadoMedio: count > 0 ? resultados.reduce((s, v) => s + v, 0) / count : 0,
    }])
  )

  const taxaEficiencia = totalDias > 0
    ? (dist.META_IDEAL.count + dist.META_MAXIMA.count) / totalDias
    : 0

  // Tendência semanal
  const semanas: Record<string, {
    label: string; metaIdeal: number; metaMaxima: number
    stop: number; naoAtingida: number; total: number
  }> = {}

  for (const dia of dias) {
    const d = new Date(dia.date as Date)
    const dayOfWeek = d.getUTCDay() // dom=0
    const sunday = new Date(d)
    sunday.setUTCDate(d.getUTCDate() - dayOfWeek)
    const key = sunday.toISOString().slice(0, 10)
    const saturday = new Date(sunday)
    saturday.setUTCDate(sunday.getUTCDate() + 6)
    const fmt = (dt: Date) => `${String(dt.getUTCDate()).padStart(2, '0')}/${String(dt.getUTCMonth() + 1).padStart(2, '0')}`
    const label = `${fmt(sunday)}-${fmt(saturday)}`
    if (!semanas[key]) semanas[key] = { label, metaIdeal: 0, metaMaxima: 0, stop: 0, naoAtingida: 0, total: 0 }
    semanas[key].total++
    if (dia.status === 'META_IDEAL')        semanas[key].metaIdeal++
    else if (dia.status === 'META_MAXIMA')  semanas[key].metaMaxima++
    else if (dia.status === 'STOP')         semanas[key].stop++
    else if (dia.status === 'META_NAO_ATINGIDA') semanas[key].naoAtingida++
  }

  const tendencia = Object.entries(semanas)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({
      semana: v.label,
      metaIdeal: v.metaIdeal,
      metaMaxima: v.metaMaxima,
      stop: v.stop,
      naoAtingida: v.naoAtingida,
      eficiencia: v.total > 0 ? (v.metaIdeal + v.metaMaxima) / v.total * 100 : 0,
    }))

  // Sequências
  let maiorSequenciaMeta = 0
  let corrente = 0
  for (const dia of dias) {
    const bateuMeta = dia.status === 'META_IDEAL' || dia.status === 'META_MAXIMA'
    if (bateuMeta) { corrente = corrente >= 0 ? corrente + 1 : 1 }
    else           { corrente = corrente <= 0 ? corrente - 1 : -1 }
    if (corrente > maiorSequenciaMeta) maiorSequenciaMeta = corrente
  }
  const sequenciaAtual = corrente

  res.json({ totalDias, distribuicao, taxaEficiencia, tendencia, sequencias: { maiorSequenciaMeta, sequenciaAtual } })
}))

router.get('/performance', catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId

  const semanas = await prisma.weeklyReport.findMany({
    where: { userId },
    orderBy: [{ ano: 'asc' }, { semana: 'asc' }],
  })

  const meses = await prisma.monthlyReport.findMany({
    where: { userId },
    orderBy: { mes: 'asc' },
  })

  res.json({ semanas, meses })
}))

router.get('/ativos', catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const { inicio, fim } = req.query as { inicio?: string; fim?: string }

  const trades = await prisma.trade.findMany({
    where: {
      userId,
      status: { in: ['WIN', 'LOSS'] },
      ...buildTradeFilter(inicio, fim),
    },
    select: { status: true, resultado: true, ativo: true },
  })

  const mapa: Record<string, { total: number; wins: number; losses: number; resultados: number[] }> = {}

  for (const t of trades) {
    const key = t.ativo || 'Sem ativo'
    if (!mapa[key]) mapa[key] = { total: 0, wins: 0, losses: 0, resultados: [] }
    mapa[key].total++
    if (t.status === 'WIN') mapa[key].wins++
    else mapa[key].losses++
    mapa[key].resultados.push(t.resultado ?? 0)
  }

  const ativos = Object.entries(mapa).map(([nome, g]) => ({
    nome,
    total: g.total,
    wins: g.wins,
    losses: g.losses,
    taxaAcerto: g.total > 0 ? g.wins / g.total : 0,
    resultadoTotal: g.resultados.reduce((s, v) => s + v, 0),
    resultadoMedio: g.total > 0 ? g.resultados.reduce((s, v) => s + v, 0) / g.total : 0,
    melhorTrade: Math.max(...g.resultados, 0),
    piorTrade: Math.min(...g.resultados, 0),
  })).sort((a, b) => b.total - a.total)

  res.json({ ativos, totalTrades: trades.length })
}))

router.get('/dias-semana', catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const { inicio, fim } = req.query as { inicio?: string; fim?: string }

  const dias = await prisma.tradingDay.findMany({
    where: { userId, isClosed: true, ...buildDayFilter(inicio, fim) },
    select: { date: true, resultadoDia: true, taxaAcerto: true, win: true, loss: true },
    orderBy: { date: 'asc' },
  })

  const NOMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

  const mapa: Record<number, { nome: string; resultados: number[]; taxas: number[]; wins: number; losses: number }> = {}
  for (let i = 1; i <= 5; i++) mapa[i] = { nome: NOMES[i], resultados: [], taxas: [], wins: 0, losses: 0 }

  for (const d of dias) {
    const dow = new Date(d.date).getUTCDay()
    if (!mapa[dow]) continue
    mapa[dow].resultados.push(d.resultadoDia ?? 0)
    if (d.taxaAcerto != null) mapa[dow].taxas.push(d.taxaAcerto)
    mapa[dow].wins   += d.win  ?? 0
    mapa[dow].losses += d.loss ?? 0
  }

  const diasSemana = Object.entries(mapa).map(([dow, g]) => {
    const total = g.resultados.length
    const diasPos = g.resultados.filter(v => v > 0).length
    return {
      dow: Number(dow),
      nome: g.nome,
      diasOperados: total,
      diasPositivos: diasPos,
      pctPositivos: total > 0 ? diasPos / total : 0,
      resultadoTotal: g.resultados.reduce((s, v) => s + v, 0),
      resultadoMedio: total > 0 ? g.resultados.reduce((s, v) => s + v, 0) / total : 0,
      taxaAcertoMedia: g.taxas.length > 0 ? g.taxas.reduce((s, v) => s + v, 0) / g.taxas.length : 0,
      totalWins: g.wins,
      totalLosses: g.losses,
    }
  })

  res.json({ diasSemana })
}))

router.get('/horarios', catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const { inicio, fim } = req.query as { inicio?: string; fim?: string }

  const trades = await prisma.trade.findMany({
    where: {
      userId,
      status: { in: ['WIN', 'LOSS'] },
      ...buildTradeFilter(inicio, fim),
    },
    select: { status: true, resultado: true, horario: true },
  })

  res.json({ trades })
}))

router.get('/score', catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const { inicio, fim } = req.query as { inicio?: string; fim?: string }

  const dias = await prisma.tradingDay.findMany({
    where: { userId, isClosed: true, ...buildDayFilter(inicio, fim) },
    select: { resultadoDia: true, status: true, seguiuSetup: true, taxaAcerto: true, errosDia: true },
    orderBy: { date: 'asc' },
  })

  const totalDias = dias.length
  if (totalDias === 0) {
    return res.json({ score: 0, grade: 'Sem dados', totalDias: 0, pilares: null })
  }

  // ── DISCIPLINA (30%) ──────────────────────────────────────────
  const diasComInfo      = dias.filter(d => d.seguiuSetup !== null)
  const diasComDisciplina = dias.filter(d => d.seguiuSetup === true)
  const pctComDisciplina = diasComInfo.length > 0
    ? diasComDisciplina.length / diasComInfo.length
    : 0.5
  const scoreDisciplina = pctComDisciplina * 100

  // ── RESULTADO (40%) ───────────────────────────────────────────
  const diasPositivos = dias.filter(d => (d.resultadoDia ?? 0) > 0).length
  const pctPositivos  = diasPositivos / totalDias

  const statusFinais    = ['META_IDEAL', 'META_MAXIMA', 'STOP', 'META_NAO_ATINGIDA']
  const diasStatusFinal = dias.filter(d => statusFinais.includes(d.status))
  const diasComMeta     = diasStatusFinal.filter(d => d.status === 'META_IDEAL' || d.status === 'META_MAXIMA')
  const taxaEficiencia  = diasStatusFinal.length > 0 ? diasComMeta.length / diasStatusFinal.length : pctPositivos

  const scoreResultado = (pctPositivos * 0.5 + taxaEficiencia * 0.5) * 100

  // ── CONSISTÊNCIA (30%) ────────────────────────────────────────
  const diasComTaxa    = dias.filter(d => d.taxaAcerto !== null)
  const taxaAcertoMedia = diasComTaxa.length > 0
    ? diasComTaxa.reduce((s, d) => s + (d.taxaAcerto ?? 0), 0) / diasComTaxa.length
    : 0

  const diasSemErros = dias.filter(d => d.errosDia.length === 0).length
  const pctSemErros  = diasSemErros / totalDias

  const scoreConsistencia = (taxaAcertoMedia * 0.6 + pctSemErros * 0.4) * 100

  // ── SCORE FINAL ───────────────────────────────────────────────
  const score = Math.round(
    scoreDisciplina * 0.30 +
    scoreResultado  * 0.40 +
    scoreConsistencia * 0.30
  )

  const grade =
    score >= 85 ? 'Elite' :
    score >= 70 ? 'Avançado' :
    score >= 55 ? 'Intermediário' :
    score >= 40 ? 'Em Desenvolvimento' :
    'Iniciante'

  res.json({
    score,
    grade,
    totalDias,
    pilares: {
      disciplina:   { score: Math.round(scoreDisciplina),   pctComDisciplina,  diasAnalisados: diasComInfo.length },
      resultado:    { score: Math.round(scoreResultado),    pctPositivos,      taxaEficiencia },
      consistencia: { score: Math.round(scoreConsistencia), taxaAcertoMedia,   pctSemErros },
    },
  })
}))

export default router
