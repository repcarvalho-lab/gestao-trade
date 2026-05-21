import { Router, Request, Response } from 'express';
import { signalsService } from '../services/signals.service';
import { verifyAccessToken } from '../lib/jwt';
import { authenticate } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// Rota para alternar o filtro Anti-Loss
router.post('/settings/anti-loss', authenticate, (req: Request, res: Response) => {
  const { mode } = req.body;
  if (['AUTO', 'ON', 'OFF'].includes(mode)) {
    signalsService.setAntiLossMode(mode as 'AUTO' | 'ON' | 'OFF');
    res.json({ success: true, mode });
  } else {
    res.status(400).json({ error: 'Modo inválido' });
  }
});

router.get('/settings/anti-loss', authenticate, (req: Request, res: Response) => {
  res.json({ mode: signalsService.getAntiLossMode() });
});

// Rota para buscar o histórico de sinais salvos no banco para o simulador
router.get('/history', authenticate, async (req: Request, res: Response) => {
  try {
    const { startTime, endTime } = req.query;
    
    let dateFilter: any = {};
    if (startTime && endTime) {
      dateFilter = {
        gte: new Date(startTime as string),
        lte: new Date(endTime as string)
      };
    } else if (startTime) {
      dateFilter = { gte: new Date(startTime as string) };
    }

    const history = await prisma.signalHistory.findMany({
      where: Object.keys(dateFilter).length > 0 ? { entryTime: dateFilter } : undefined,
      orderBy: { entryTime: 'desc' },
      take: 10000 // Limite seguro para evitar payloads massivos
    });

    res.json(history);
  } catch (error) {
    console.error('[Signals] Erro ao buscar histórico:', error);
    res.status(500).json({ error: 'Erro interno ao buscar histórico de sinais' });
  }
});

// Endpoint SSE (Server-Sent Events) para transmitir os sinais em tempo real
router.get('/stream', (req: Request, res: Response): void => {
  const token = req.query.token as string;
  if (!token) {
    res.status(401).json({ error: 'Token não fornecido' });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    (req as any).user = payload;
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
    return;
  }
  // Configuração dos headers para SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Envia um evento inicial
  res.write(`data: ${JSON.stringify({ message: 'Connected to Signals Stream' })}\n\n`);

  // Registra o callback para enviar os novos sinais
  const updateCallback = (signal: any) => {
    res.write(`data: ${JSON.stringify(signal)}\n\n`);
  };

  signalsService.onSignalUpdate(updateCallback);

  // Limpeza quando o cliente desconectar
  req.on('close', () => {
    // Remover callback da lista (precisamos implementar a remoção no service, por enquanto é um mock simples)
    console.log('[Signals] Cliente desconectado do stream');
  });
});

export { router as signalsRoutes };
