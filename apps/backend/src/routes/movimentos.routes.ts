import { Router } from 'express'
import * as movimentosController from '../controllers/movimentos.controller'
import { authenticate } from '../middleware/auth'
import { catchAsync } from '../utils/catchAsync'
import { prisma } from '../lib/prisma'
import { recalcularDia } from '../services/dayCalculator'

const router = Router()

router.use(authenticate)

router.get('/fix-cascade', catchAsync(async (req, res) => {
  const userId = (req as any).user!.userId
  const dias = await prisma.tradingDay.findMany({ where: { userId }, orderBy: { date: 'asc' }, include: { trades: true } })
  const config = await prisma.configuration.findUnique({ where: { userId } })
  
  let prevCap = config?.saldoInicialCorretora || 0
  for (const dia of dias) {
    const movs = await prisma.depositoSaque.findMany({ where: { userId, conta: 'CORRETORA', data: { gte: new Date(dia.date.setHours(0,0,0,0)), lte: new Date(dia.date.setHours(23,59,59,999)) } } })
    const net = movs.reduce((s, m) => s + (m.tipo === 'DEPOSITO' ? m.valorUSD : -m.valorUSD), 0)
    
    const capInit = prevCap + net
    const calc = recalcularDia({ ...dia, capitalInicialReal: capInit, deposito: net }, dia.trades, config!, capInit)
    const capFinal = capInit + calc.resultadoDia
    
    await prisma.tradingDay.update({ where: { id: dia.id }, data: { capitalInicial: prevCap, capitalInicialReal: capInit, deposito: net, capitalFinal: capFinal, resultadoDia: calc.resultadoDia, status: calc.status } })
    prevCap = capFinal
  }
  res.json({ message: 'Cascade fixed', finalCapital: prevCap })
}))

router.get('/', catchAsync(movimentosController.listar))
router.post('/', catchAsync(movimentosController.criar))
router.post('/transfer', catchAsync(movimentosController.transferir))
router.patch('/:id', catchAsync(movimentosController.atualizar))
router.delete('/:id', catchAsync(movimentosController.deletar))

export default router
