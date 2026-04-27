import { prisma } from '../lib/prisma'

export async function getRelatorioDisciplina(userId: string, dateFilter?: object) {
  const dias = await prisma.tradingDay.findMany({
    where: { userId, isClosed: true, ...dateFilter },
    orderBy: { date: 'asc' },
  })

  const comDisciplina = dias.filter(d => d.seguiuSetup === true)
  const semDisciplina = dias.filter(d => d.seguiuSetup === false)
  const semInfo       = dias.filter(d => d.seguiuSetup === null)

  function calcMetricas(grupo: typeof dias) {
    const total = grupo.length
    if (total === 0) return {
      total, diasPositivos: 0, pctPositivos: 0,
      resultadoTotal: 0, resultadoMedio: 0,
      rentabilidadeMedia: 0, taxaAcertoMedia: 0,
    }
    const diasPositivos = grupo.filter(d => (d.resultadoDia ?? 0) > 0).length
    const resultadoTotal = grupo.reduce((s, d) => s + (d.resultadoDia ?? 0), 0)
    const resultadoMedio = resultadoTotal / total
    const rentabilidadeMedia = grupo.reduce((s, d) => s + (d.rentabilidade ?? 0), 0) / total
    const taxaAcertoMedia = grupo.reduce((s, d) => s + (d.taxaAcerto ?? 0), 0) / total
    return {
      total,
      diasPositivos,
      pctPositivos: diasPositivos / total,
      resultadoTotal,
      resultadoMedio,
      rentabilidadeMedia,
      taxaAcertoMedia,
    }
  }

  // Frequência de erros nos dias sem disciplina
  const errosFreq: Record<string, number> = {}
  for (const dia of semDisciplina) {
    for (const erro of dia.errosDia) {
      errosFreq[erro] = (errosFreq[erro] || 0) + 1
    }
  }
  const principaisErros = Object.entries(errosFreq)
    .map(([nome, ocorrencias]) => ({ nome, ocorrencias }))
    .sort((a, b) => b.ocorrencias - a.ocorrencias)

  // Frequência de erros nos dias COM disciplina (para comparar)
  const errosFreqCom: Record<string, number> = {}
  for (const dia of comDisciplina) {
    for (const erro of dia.errosDia) {
      errosFreqCom[erro] = (errosFreqCom[erro] || 0) + 1
    }
  }

  return {
    totalDias: dias.length,
    comDisciplina: calcMetricas(comDisciplina),
    semDisciplina: calcMetricas(semDisciplina),
    semInfo: calcMetricas(semInfo),
    principaisErros,
    errosComDisciplina: Object.entries(errosFreqCom)
      .map(([nome, ocorrencias]) => ({ nome, ocorrencias }))
      .sort((a, b) => b.ocorrencias - a.ocorrencias),
  }
}
