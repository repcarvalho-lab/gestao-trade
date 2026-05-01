import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import { recalcularDia, calcularValoresSugeridos } from './dayCalculator'
import { recalcularRelatorios } from './relatorios.service'

export async function getDiaAberto(userId: string) {
  return prisma.tradingDay.findFirst({
    where: { userId, isClosed: false },
    include: {
      trades: {
        orderBy: { horario: 'asc' },
        include: { ciclo: true, motivo: true },
      },
      ciclos: { orderBy: { numero: 'asc' } },
    },
  })
}

export async function criarDia(userId: string, capitalInicialOverride?: number, dataParam?: string) {
  // Resolve a data: usa a fornecida ou hoje
  const dataEscolhida = dataParam ? new Date(`${dataParam}T00:00:00`) : new Date()
  dataEscolhida.setHours(0, 0, 0, 0)

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const isRetroativo = dataEscolhida < hoje

  // Verifica se já existe dia aberto (bloqueia criação se tiver um aberto)
  const existente = await prisma.tradingDay.findFirst({
    where: { userId, isClosed: false },
  })
  if (existente) throw new AppError('Já existe um dia em aberto. Feche-o antes de criar outro.', 409)

  // Verifica se já existe day para a data escolhida
  const jaExiste = await prisma.tradingDay.findFirst({
    where: { userId, date: dataEscolhida },
  })
  if (jaExiste) throw new AppError(
    isRetroativo
      ? `Já existe um dia registrado para ${dataEscolhida.toLocaleDateString('pt-BR')}.`
      : 'Já existe um dia registrado para hoje.',
    409,
  )

  // Carry-over: busca o dia fechado mais recente ANTES da data escolhida
  const ultimoDia = await prisma.tradingDay.findFirst({
    where: { userId, isClosed: true, date: { lt: dataEscolhida } },
    orderBy: { date: 'desc' },
  })

  // 1. Busca todos depósitos anteriores à data escolhida, mas APÓS o ultimo dia
  const gtDate = ultimoDia ? ultimoDia.date : undefined
  const movsAnteriores = await prisma.depositoSaque.findMany({
    where: {
      userId,
      conta: 'CORRETORA',
      data: {
        ...(gtDate ? { gt: gtDate } : {}),
        lt: dataEscolhida,
      },
    },
  })

  const netAnteriores = movsAnteriores.reduce(
    (sum, m) => sum + (m.tipo === 'DEPOSITO' ? m.valorUSD : -m.valorUSD),
    0
  )

  const config = await prisma.configuration.findUnique({ where: { userId } })

  const capitalInicial = capitalInicialOverride ?? 
                         (ultimoDia 
                           ? ((ultimoDia.capitalFinal ?? 0) + netAnteriores)
                           : ((config?.saldoInicialCorretora ?? 0) + netAnteriores))

  if (capitalInicial === undefined || capitalInicial === null) {
    throw new AppError('Não foi possível determinar o capital inicial para este dia.', 400)
  }

  // 2. Busca depósitos que foram realizados EXACTAMENTE no dia de hoje (antes do dia ser criado)
  const dayEnd = new Date(dataEscolhida)
  dayEnd.setHours(23, 59, 59, 999)

  const movsHoje = await prisma.depositoSaque.findMany({
    where: {
      userId,
      conta: 'CORRETORA',
      data: {
        gte: dataEscolhida,
        lte: dayEnd,
      },
    },
  })

  const netHoje = movsHoje.reduce(
    (sum, m) => sum + (m.tipo === 'DEPOSITO' ? m.valorUSD : -m.valorUSD),
    0
  )

  const movsHojeReserva = await prisma.depositoSaque.findMany({
    where: {
      userId,
      conta: 'RESERVA',
      data: {
        gte: dataEscolhida,
        lte: dayEnd,
      },
    },
  })
  

  const cambio = config?.cambioCompra || 5.0

  const netHojeReservaBRL = movsHojeReserva.reduce(
    (sum, m) => sum + (m.tipo === 'DEPOSITO' ? m.valorBRL : -m.valorBRL),
    0
  )
  const netHojeReservaUSD = netHojeReservaBRL / cambio

  // ATENÇÃO: Se for retroativo a bancaGlobal USD real pode ser imprecisa em relacao ao cambio daquele dia.
  // Porem, como a meta diária e stop usam o câmbio ATUAL da reserva, a distorção retroativa é irrelevante para a matemática.
  const capitalStatus = await import('./capital.service').then(m => m.getCapitalStatus(userId))

  return prisma.tradingDay.create({
    data: {
      userId,
      date: dataEscolhida,
      capitalInicial,
      deposito: netHoje,
      depositoReserva: netHojeReservaUSD,
      capitalInicialReal: capitalInicial + netHoje,
      bancaGlobal: capitalStatus.bancaGlobalUSD,
      status: 'OPERANDO',
    },
    include: { trades: true, ciclos: true },
  })
}


export async function atualizarDeposito(tradingDayId: string, userId: string, deposito: number) {
  const dia = await prisma.tradingDay.findFirst({ where: { id: tradingDayId, userId, isClosed: false } })
  if (!dia) throw new AppError('Dia não encontrado ou já fechado', 404)

  const capitalInicialReal = dia.capitalInicial + deposito

  const config = await prisma.configuration.findUnique({ where: { userId } })
  if (!config) throw new AppError('Configurações não encontradas', 500)

  // Recalcula valores com novo capital
  const { bancaGlobalUSD } = await import('./capital.service').then(m => m.getCapitalStatus(userId))
  const trades = await prisma.trade.findMany({ where: { tradingDayId } })
  const calc = recalcularDia({ ...dia, capitalInicialReal, deposito }, trades, config, bancaGlobalUSD)

  return prisma.tradingDay.update({
    where: { id: tradingDayId },
    data: {
      deposito,
      capitalInicialReal,
      resultadoDia: calc.resultadoDia,
      rentabilidade: calc.rentabilidade,
      status: calc.status,
      win: calc.win,
      loss: calc.loss,
      numeroTrades: calc.numeroTrades,
      taxaAcerto: calc.taxaAcerto,
      ciclosRealizados: calc.ciclosRealizados,
    },
    include: { trades: true, ciclos: true },
  })
}

export async function fecharDia(
  tradingDayId: string,
  userId: string,
  emocional: string,
  seguiuSetup: boolean,
  errosDia: string[] = [],
) {
  const dia = await prisma.tradingDay.findFirst({
    where: { id: tradingDayId, userId, isClosed: false },
    include: { trades: true },
  })
  if (!dia) throw new AppError('Dia não encontrado ou já fechado', 404)

  const config = await prisma.configuration.findUnique({ where: { userId } })
  if (!config) throw new AppError('Configurações não encontradas', 500)

  // Utiliza a bancaGlobal CONGELADA no dia (bancaGlobal) em vez de recalcular com flutuações de câmbio de amanhã
  const bancaGlobalDia = dia.bancaGlobal || dia.capitalInicialReal
  const calc = recalcularDia(dia, dia.trades, config, bancaGlobalDia)
  const capitalFinal = dia.capitalInicialReal + calc.resultadoDia
  const respeitouLimiteCiclos = calc.ciclosRealizados <= config.maxCiclosPorDia

  // ATENCAO e OPERANDO ao fechar = Meta não atingida
  const statusFinal =
    calc.status === 'ATENCAO' || calc.status === 'OPERANDO'
      ? 'META_NAO_ATINGIDA'
      : calc.status

  const diafechado = await prisma.tradingDay.update({
    where: { id: tradingDayId },
    data: {
      isClosed: true,
      capitalFinal,
      resultadoDia: calc.resultadoDia,
      rentabilidade: calc.rentabilidade,
      status: statusFinal,
      win: calc.win,
      loss: calc.loss,
      numeroTrades: calc.numeroTrades,
      taxaAcerto: calc.taxaAcerto,
      ciclosRealizados: calc.ciclosRealizados,
      respeitouLimiteCiclos,
      emocional,
      seguiuSetup,
      errosDia: { set: errosDia },
      usouMG2: dia.trades.some((t) => t.tipo === 'MG2'),
    },
  })

  // Recalcula relatórios semanais e mensais
  await recalcularRelatorios(userId, diafechado.date)

  return diafechado
}

export async function reabrirDia(id: string, userId: string) {
  // Garante que não haja outro dia aberto
  const existeAberto = await prisma.tradingDay.findFirst({
    where: { userId, isClosed: false },
  })
  if (existeAberto) throw new AppError('Já existe um dia em aberto. Feche-o antes de reabrir outro.', 409)

  const dia = await prisma.tradingDay.findFirst({
    where: { id, userId, isClosed: true },
    include: { trades: true },
  })
  if (!dia) throw new AppError('Dia não encontrado ou já está aberto', 404)

  const config = await prisma.configuration.findUnique({ where: { userId } })
  if (!config) throw new AppError('Configurações não encontradas', 500)

  // Recalcula o status real a partir dos trades (remove META_NAO_ATINGIDA)
  const { bancaGlobalUSD } = await import('./capital.service').then(m => m.getCapitalStatus(userId))
  const calc = recalcularDia(dia, dia.trades, config, bancaGlobalUSD)

  const result = await prisma.tradingDay.update({
    where: { id },
    data: {
      isClosed: false,
      capitalFinal: null,
      respeitouLimiteCiclos: null,
      status: calc.status,
      resultadoDia: calc.resultadoDia,
      rentabilidade: calc.rentabilidade,
      win: calc.win,
      loss: calc.loss,
      numeroTrades: calc.numeroTrades,
      taxaAcerto: calc.taxaAcerto,
      ciclosRealizados: calc.ciclosRealizados,
    },
    include: {
      trades: { orderBy: { horario: 'asc' }, include: { ciclo: true, motivo: true } },
      ciclos: { orderBy: { numero: 'asc' } },
    },
  })

  // Recalcula relatórios agora que o dia não está mais fechado
  await recalcularRelatorios(userId, dia.date)

  return result
}

export async function excluirDia(id: string, userId: string) {
  const dia = await prisma.tradingDay.findFirst({
    where: { id, userId },
    include: { _count: { select: { trades: true } } },
  })
  if (!dia) throw new AppError('Dia não encontrado', 404)
  if (dia._count.trades > 0)
    throw new AppError('Só é possível excluir um dia sem operações registradas.', 400)
    
  await prisma.tradingDay.delete({ where: { id } })
  
  // Recalcula relatórios caso o dia excluído fizesse parte de alguma estatística
  await recalcularRelatorios(userId, dia.date)
}

export async function listarDias(userId: string) {
  return prisma.tradingDay.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    include: {
      _count: { select: { trades: true } },
    },
  })
}

export async function getDia(id: string, userId: string) {
  const dia = await prisma.tradingDay.findFirst({
    where: { id, userId },
    include: {
      trades: {
        orderBy: { horario: 'asc' },
        include: { motivo: true, ciclo: true },
      },
      ciclos: { orderBy: { numero: 'asc' } },
    },
  })
  if (!dia) throw new AppError('Dia não encontrado', 404)
  return dia
}

export async function getDiaComIndicadores(userId: string) {
  const dia = await getDiaAberto(userId)
  if (!dia) return null

  const config = await prisma.configuration.findUnique({ where: { userId } })
  if (!config) return dia

  const { bancaGlobalUSD, saldoReservaBRL, capitalCorretoraUSD } = await import('./capital.service').then(m => m.getCapitalStatus(userId))
  const calc = recalcularDia(dia, dia.trades, config, bancaGlobalUSD)
  const sugeridos = calcularValoresSugeridos(bancaGlobalUSD, config)

  return { 
    ...dia, 
    ...calc, 
    ...sugeridos,
    bancaGlobalUSD,
    saldoReservaBRL,
    capitalCorretoraUSD,
  }
}

export interface ImportTradeDTO {
  horario: string; // ISO string
  ativo: string;
  valor: number;
  status: 'WIN' | 'LOSS';
}

export async function importarTradesCSV(tradingDayId: string, userId: string, trades: ImportTradeDTO[]) {
  const config = await prisma.configuration.findUnique({ where: { userId } });
  const mg2Habilitado = config?.mg2Habilitado ?? false;

  // Garante ordem cronológica
  const sortedTrades = [...trades].sort((a, b) => new Date(a.horario).getTime() - new Date(b.horario).getTime());

  for (const t of sortedTrades) {
    await prisma.$transaction(async (tx) => {
      let openCycle = await tx.ciclo.findFirst({
        where: { tradingDayId, status: 'ABERTO' },
        include: { trades: true }
      });

      if (!openCycle) {
        const count = await tx.ciclo.count({ where: { tradingDayId } });
        openCycle = await tx.ciclo.create({
          data: {
            userId,
            tradingDayId,
            numero: count + 1,
            status: 'ABERTO',
          },
          include: { trades: true }
        });
      }

      const numTrades = openCycle.trades.length;
      let tradeType: 'ENTR' | 'MG1' | 'MG2' = 'ENTR';
      
      if (numTrades === 1) tradeType = 'MG1';
      else if (numTrades === 2) tradeType = 'MG2';
      else if (numTrades >= 3) {
        // Se já tiver 3 trades (ENTR, MG1, MG2), forçar fechamento e criar novo ciclo
        await tx.ciclo.update({ where: { id: openCycle.id }, data: { status: 'FECHADO_STOP' } });
        const count = await tx.ciclo.count({ where: { tradingDayId } });
        openCycle = await tx.ciclo.create({
          data: { userId, tradingDayId, numero: count + 1, status: 'ABERTO' },
          include: { trades: true }
        });
        tradeType = 'ENTR';
      }

      // Payout default 85% ou o que o ativo tem
      const ativoInfo = await tx.ativo.findFirst({ where: { userId, nome: t.ativo } });
      const currentPayout = ativoInfo?.payout ?? 0.85;
      const resultado = t.status === 'WIN' ? t.valor * currentPayout : -t.valor;

      await tx.trade.create({
        data: {
          userId,
          tradingDayId,
          cicloId: openCycle.id,
          tipo: tradeType,
          ativo: t.ativo,
          valor: t.valor,
          status: t.status,
          resultado,
          horario: new Date(t.horario),
        }
      });

      let newCycleStatus = 'ABERTO';
      if (t.status === 'WIN') {
        newCycleStatus = 'FECHADO_WIN';
      } else if (t.status === 'LOSS') {
        if (tradeType === 'MG2' || (!mg2Habilitado && tradeType === 'MG1')) {
           newCycleStatus = 'FECHADO_STOP';
        }
      }

      if (newCycleStatus !== 'ABERTO') {
        await tx.ciclo.update({
          where: { id: openCycle.id },
          data: { status: newCycleStatus as any }
        });
      }
    });
  }

  // Após salvar tudo, recalcula os indicadores do dia inteiro
  const diaFinal = await prisma.tradingDay.findUnique({
    where: { id: tradingDayId },
    include: { trades: { include: { ciclo: true } } }
  });
  
  if (diaFinal && config) {
    const { bancaGlobalUSD } = await import('./capital.service').then(m => m.getCapitalStatus(userId));
    const calc = recalcularDia(diaFinal, diaFinal.trades, config, bancaGlobalUSD);
    await prisma.tradingDay.update({
      where: { id: tradingDayId },
      data: {
        resultadoDia: calc.resultadoDia,
        rentabilidade: calc.rentabilidade,
        capitalFinal: diaFinal.capitalInicialReal + calc.resultadoDia,
        status: calc.status,
        numeroTrades: calc.numeroTrades,
        win: calc.win,
        loss: calc.loss,
        taxaAcerto: calc.taxaAcerto,
        ciclosRealizados: calc.ciclosRealizados,
        usouMG2: diaFinal.trades.some((t) => t.tipo === 'MG2'),
      }
    });
  }

  return getDiaComIndicadores(userId);
}

export async function fixReports(userId: string) {
  // Deleta todos os relatórios
  await prisma.weeklyReport.deleteMany({ where: { userId } })
  await prisma.monthlyReport.deleteMany({ where: { userId } })

  // Busca dias fechados
  const dias = await prisma.tradingDay.findMany({
    where: { userId, isClosed: true },
    orderBy: { date: 'asc' }
  })

  // Recalcula tudo sequencialmente
  for (const dia of dias) {
    await recalcularRelatorios(userId, dia.date)
  }
}
