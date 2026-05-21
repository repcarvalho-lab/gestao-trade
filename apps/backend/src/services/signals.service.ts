import WebSocket from 'ws';
import { EMA, RSI, BollingerBands, MACD, ATR } from 'technicalindicators';
import { prisma } from '../lib/prisma';

// Interfaces
interface KlineData {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isFinal: boolean;
}

export interface SimulatedTrade {
  id: string;
  action: 'STRONG_BUY' | 'STRONG_SELL';
  entryPrice: number;
  entryTime: Date;
  status: 'OPEN' | 'WIN' | 'LOSS';
  exitPrice?: number;
  exitTime?: Date;
  mgLevel: number;
}

interface SignalScore {
  symbol: string;
  timeframe: string;
  score: number;
  action: 'STRONG_BUY' | 'WEAK_BUY' | 'STRONG_SELL' | 'WEAK_SELL' | 'NEUTRAL';
  details: {
    macroTrendBuy: boolean;
    macroTrendSell: boolean;
    momentumBuy: boolean;
    momentumSell: boolean;
    pullbackBuy: boolean;
    pullbackSell: boolean;
    volumeSurge: boolean;
    rsiBuyOk: boolean;
    rsiSellOk: boolean;
    bbBuy: boolean;
    bbSell: boolean;
    macdBuy: boolean;
    macdSell: boolean;
    patternBuy: boolean;
    patternSell: boolean;
    atrActive: boolean;
    currentPrice: number;
    ema9: number;
    ema20: number;
    ema200: number;
    rsi: number;
    marketChoppy: boolean;
    antiLossMode: 'AUTO' | 'ON' | 'OFF';
    requiredScore: number;
  };
  recentTrades: SimulatedTrade[];
  timestamp: Date;
}

export class SignalsService {
  private ws: WebSocket | null = null;
  private symbol = 'btcusdt';
  private interval = '1m';
  private klines: KlineData[] = [];
  private maxKlines = 250; // Need at least 200 for EMA 200
  
  // Backtesting / Tracking
  private trades: SimulatedTrade[] = [];
  
  // Settings
  private antiLossMode: 'AUTO' | 'ON' | 'OFF' = 'AUTO';

  public getAntiLossMode() {
    return this.antiLossMode;
  }

  public setAntiLossMode(mode: 'AUTO' | 'ON' | 'OFF') {
    this.antiLossMode = mode;
  }
  
  // Callbacks para enviar dados para o Frontend (via SSE ou Socket.io no futuro)
  private onSignalUpdateCallbacks: ((signal: SignalScore) => void)[] = [];

  constructor() {
    this.init();
  }

  public onSignalUpdate(cb: (signal: SignalScore) => void) {
    this.onSignalUpdateCallbacks.push(cb);
  }

  // Busca dados históricos iniciais via REST API (para carregar as médias móveis)
  private async loadHistoricalData() {
    try {
      console.log('[Signals] Carregando histórico da Binance...');
      const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${this.symbol.toUpperCase()}&interval=${this.interval}&limit=${this.maxKlines}`);
      const data = (await response.json()) as any[];
      
      this.klines = data.map((d: any) => ({
        openTime: d[0],
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
        volume: parseFloat(d[5]),
        isFinal: true
      }));
      console.log(`[Signals] Histórico carregado: ${this.klines.length} velas.`);
    } catch (error) {
      console.error('[Signals] Erro ao buscar histórico:', error);
    }
  }

  private async init() {
    // Carrega o histórico de trades do banco (pegando os ultimos 1000)
    try {
      const dbTrades = await prisma.signalHistory.findMany({
        orderBy: { entryTime: 'desc' },
        take: 1000
      });
      this.trades = dbTrades.map((t: any) => ({
        id: t.id,
        action: t.action as 'STRONG_BUY' | 'STRONG_SELL',
        entryPrice: t.entryPrice,
        entryTime: t.entryTime,
        status: t.status as 'OPEN' | 'WIN' | 'LOSS',
        exitPrice: t.exitPrice || undefined,
        exitTime: t.exitTime || undefined,
        mgLevel: t.mgLevel
      }));
    } catch (e) {
      console.error('[Signals] Erro ao carregar trades do DB', e);
    }

    await this.loadHistoricalData();
    this.connectWebSocket();
  }

  private connectWebSocket() {
    const url = `wss://stream.binance.com:9443/ws/${this.symbol}@kline_${this.interval}`;
    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      console.log(`[Signals] Conectado ao WebSocket Binance (${this.symbol} ${this.interval})`);
    });

    this.ws.on('message', (data: string) => {
      const msg = JSON.parse(data);
      if (msg.e === 'kline') {
        const k = msg.k;
        const klineData: KlineData = {
          openTime: k.t,
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c),
          volume: parseFloat(k.v),
          isFinal: k.x
        };

        this.processKline(klineData);
      }
    });

    this.ws.on('close', () => {
      console.log('[Signals] Conexão WebSocket fechada. Reconectando em 5s...');
      setTimeout(() => this.connectWebSocket(), 5000);
    });

    this.ws.on('error', (err) => {
      console.error('[Signals] Erro no WebSocket:', err);
    });
  }

  private processKline(kline: KlineData) {
    if (this.klines.length === 0) return;

    const lastKline = this.klines[this.klines.length - 1];

    // Atualiza a vela atual ou cria uma nova se fechou
    if (kline.openTime === lastKline.openTime) {
      this.klines[this.klines.length - 1] = kline;
    } else if (kline.openTime > lastKline.openTime) {
      this.klines.push(kline);
      if (this.klines.length > this.maxKlines) {
        this.klines.shift();
      }
    }

    // Calcula os indicadores sempre que o preço atualiza (em tempo real)
    this.calculateSignal(kline.isFinal);
  }

  private calculateSignal(isFinal: boolean = false) {
    if (this.klines.length < 200) return; // Precisa de 200 candles pra EMA 200

    const closes = this.klines.map(k => k.close);
    const highs = this.klines.map(k => k.high);
    const lows = this.klines.map(k => k.low);
    const volumes = this.klines.map(k => k.volume);
    
    // Indicadores
    const ema9Arr = EMA.calculate({ period: 9, values: closes });
    const ema20Arr = EMA.calculate({ period: 20, values: closes });
    const ema200Arr = EMA.calculate({ period: 200, values: closes });
    const rsiArr = RSI.calculate({ period: 14, values: closes });
    const bbArr = BollingerBands.calculate({ period: 20, stdDev: 2, values: closes });
    const macdArr = MACD.calculate({ fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false, values: closes });
    const atrArr = ATR.calculate({ period: 14, high: highs, low: lows, close: closes });

    const currentPrice = closes[closes.length - 1];
    const ema9 = ema9Arr[ema9Arr.length - 1];
    const ema20 = ema20Arr[ema20Arr.length - 1];
    const ema200 = ema200Arr[ema200Arr.length - 1];
    const rsi = rsiArr[rsiArr.length - 1];
    const bb = bbArr[bbArr.length - 1];
    const macd = macdArr[macdArr.length - 1];
    const atr = atrArr[atrArr.length - 1];

    // Volume médio (ultimos 20)
    const recentVolumes = volumes.slice(-20);
    const avgVolume = recentVolumes.reduce((a,b)=>a+b,0) / 20;
    const currentVolume = volumes[volumes.length - 1];

    // 1. Filtro de Segurança Macro (20 pts)
    const macroTrendBuy = currentPrice > ema200;
    const macroTrendSell = currentPrice < ema200;
    
    // 2. Alinhamento de Momentum (20 pts)
    const momentumBuy = ema9 > ema20;
    const momentumSell = ema9 < ema20;

    const lastKline = this.klines[this.klines.length - 1];
    const prevKline = this.klines[this.klines.length - 2];

    // 3. Gatilho de Pullback com Price Action Rejeição (15 pts)
    const touchedEma20Buy = lastKline.low <= (ema20 * 1.0005) && currentPrice > ema20;
    const candleGreen = currentPrice > lastKline.open;
    const pullbackBuy = touchedEma20Buy && candleGreen;

    const touchedEma20Sell = lastKline.high >= (ema20 * 0.9995) && currentPrice < ema20;
    const candleRed = currentPrice < lastKline.open;
    const pullbackSell = touchedEma20Sell && candleRed;

    // 4. Filtro de Tubarões (10 pts)
    const volumeSurge = currentVolume > (avgVolume * 1.5);

    // 5. Combustível no Tanque (15 pts)
    const rsiBuyOk = rsi >= 40 && rsi <= 65;
    const rsiSellOk = rsi >= 35 && rsi <= 60;

    // 6. Bollinger Bands Rejection (25 pts)
    const bbBuy = lastKline.low <= bb.lower && currentPrice > bb.lower;
    const bbSell = lastKline.high >= bb.upper && currentPrice < bb.upper;

    // 7. MACD Confirmation (20 pts)
    const macdBuy = macd.MACD && macd.signal && macd.MACD > macd.signal;
    const macdSell = macd.MACD && macd.signal && macd.MACD < macd.signal;

    // 8. Candlestick Pattern (Engolfo) (15 pts)
    const prevRed = prevKline.close < prevKline.open;
    const patternBuy = candleGreen && prevRed && (currentPrice > prevKline.open);
    
    const prevGreen = prevKline.close > prevKline.open;
    const patternSell = candleRed && prevGreen && (currentPrice < prevKline.open);

    // 9. ATR Volatility Filter (10 pts)
    // Se o ATR estiver acima de ~0.03% do preço, o mercado tem fôlego
    const atrActive = atr > (currentPrice * 0.0003);

    let buyScore = 0;
    if (macroTrendBuy) buyScore += 20;
    if (momentumBuy) buyScore += 20;
    if (pullbackBuy) buyScore += 15;
    if (volumeSurge) buyScore += 10;
    if (rsiBuyOk) buyScore += 15;
    if (bbBuy) buyScore += 25;
    if (macdBuy) buyScore += 20;
    if (patternBuy) buyScore += 15;
    if (atrActive) buyScore += 10;

    let sellScore = 0;
    if (macroTrendSell) sellScore += 20;
    if (momentumSell) sellScore += 20;
    if (pullbackSell) sellScore += 15;
    if (volumeSurge) sellScore += 10;
    if (rsiSellOk) sellScore += 15;
    if (bbSell) sellScore += 25;
    if (macdSell) sellScore += 20;
    if (patternSell) sellScore += 15;
    if (atrActive) sellScore += 10;

    let score = 0;
    let action: 'STRONG_BUY' | 'WEAK_BUY' | 'STRONG_SELL' | 'WEAK_SELL' | 'NEUTRAL' = 'NEUTRAL';

    // ---- INTELIGÊNCIA ANTI-LOSS ----
    // Analisamos os últimos 5 trades. Se o bot perdeu a maioria (>=3 losses), o mercado está ruim.
    // Isso fará com que o bot só entre em operações que acertem TODAS as condições (100 pontos).
    const lastClosedTrades = this.trades.filter(t => t.status !== 'OPEN').slice(0, 5);
    const recentLosses = lastClosedTrades.filter(t => t.status === 'LOSS').length;
    
    // Além de verificar os losses, verificamos se o último trade não foi há muito tempo.
    // Se o mercado ficou mais de 60 minutos sem dar uma entrada "perfeita", 
    // liberamos o robô para tentar uma entrada normal (80 pts) para sondar o mercado novamente.
    let minutesSinceLastTrade = 0;
    if (lastClosedTrades.length > 0) {
      const lastTradeTime = lastClosedTrades[0].exitTime || lastClosedTrades[0].entryTime;
      minutesSinceLastTrade = (Date.now() - lastTradeTime.getTime()) / 1000 / 60;
    }

    let isMarketChoppy = false;
    
    if (this.antiLossMode === 'ON') {
      isMarketChoppy = true;
    } else if (this.antiLossMode === 'OFF') {
      isMarketChoppy = false;
    } else {
      isMarketChoppy = lastClosedTrades.length === 5 && recentLosses >= 3;
    }

    const marketChoppy = isMarketChoppy && (this.antiLossMode === 'ON' || minutesSinceLastTrade < 60); // Desativa se passou 60 min (apenas no modo AUTO)
    // O score máximo agora é 150.
    // Mercado ruidoso exige 130 pontos. Normal exige 110 para Strong, 80 para Weak.
    const requiredScore = marketChoppy ? 130 : 110;

    if (buyScore >= sellScore && buyScore >= 80) {
      score = buyScore;
      action = buyScore >= requiredScore ? 'STRONG_BUY' : 'WEAK_BUY';
    } else if (sellScore > buyScore && sellScore >= 80) {
      score = sellScore;
      action = sellScore >= requiredScore ? 'STRONG_SELL' : 'WEAK_SELL';
    } else {
      score = Math.max(buyScore, sellScore);
      action = 'NEUTRAL';
    }

    // --- Lógica de Simulador de Trades (1 Vela / Retração) ---
    // 1. Atualizar trades abertos APENAS quando a vela atual fechar
    if (isFinal) {
      this.trades.filter(t => t.status === 'OPEN').forEach(trade => {
        // Verifica se a vela que está fechando é a vela seguinte à entrada do trade
        // (Garante que não fechemos no mesmo segundo em que abrimos)
        if (Date.now() - trade.entryTime.getTime() > 30000) {
          let isWin = false;
          if (trade.action === 'STRONG_BUY') {
            isWin = currentPrice > trade.entryPrice;
          } else if (trade.action === 'STRONG_SELL') {
            isWin = currentPrice < trade.entryPrice;
          }

          if (isWin) {
            trade.status = 'WIN';
            trade.exitPrice = currentPrice;
            trade.exitTime = new Date();
            prisma.signalHistory.update({ where: { id: trade.id }, data: { status: 'WIN', exitPrice: currentPrice, exitTime: trade.exitTime } }).catch(console.error);
          } else {
            // Caso dê Loss, aplica Martingale (máximo de 1 para este teste inicial)
            if (trade.mgLevel < 1) {
              trade.mgLevel += 1;
              trade.entryPrice = currentPrice; // Nova entrada na abertura da próxima vela
              trade.entryTime = new Date(); // Reseta o tempo para a nova vela
              prisma.signalHistory.update({ where: { id: trade.id }, data: { mgLevel: trade.mgLevel, entryPrice: currentPrice, entryTime: trade.entryTime } }).catch(console.error);
            } else {
              // Se já fez os gales permitidos e perdeu, assume o LOSS
              trade.status = 'LOSS';
              trade.exitPrice = currentPrice;
              trade.exitTime = new Date();
              prisma.signalHistory.update({ where: { id: trade.id }, data: { status: 'LOSS', exitPrice: currentPrice, exitTime: trade.exitTime } }).catch(console.error);
            }
          }
        }
      });
    }

    // 2. Abrir novos trades se houver sinal forte e NENHUM aberto
    // Dispara a partir dos 45 segundos da vela atual para dar bastante tempo de entrar na corretora
    const hasOpenTrade = this.trades.some(t => t.status === 'OPEN');
    const candleElapsedMs = Date.now() - lastKline.openTime;
    const isTriggerTime = candleElapsedMs >= 45000 && candleElapsedMs < 60000;

    if (!hasOpenTrade && (isFinal || isTriggerTime) && (action === 'STRONG_BUY' || action === 'STRONG_SELL')) {
      // O unshift coloca o mais novo no índice 0, então o último trade é this.trades[0]
      const lastTrade = this.trades[0];
      // Esperar pelo menos 60 segundos entre as entradas para não abrir duplicado no mesmo candle
      const canOpen = !lastTrade || (Date.now() - lastTrade.entryTime.getTime() > 60000);
      if (canOpen) {
        const newTradeId = Math.random().toString(36).substr(2, 9);
        const newTrade: SimulatedTrade = {
          id: newTradeId,
          action: action as 'STRONG_BUY' | 'STRONG_SELL',
          entryPrice: currentPrice,
          entryTime: new Date(),
          status: 'OPEN',
          mgLevel: 0
        };
        this.trades.unshift(newTrade);
        
        // Salva no banco de dados
        prisma.signalHistory.create({
          data: {
            id: newTradeId,
            action: newTrade.action,
            entryPrice: newTrade.entryPrice,
            entryTime: newTrade.entryTime,
            status: newTrade.status,
            mgLevel: 0
          }
        }).catch(console.error);

        if (this.trades.length > 1000) this.trades.pop(); // Mantém as últimas 1000 operações
      }
    }

    const signal: SignalScore = {
      symbol: this.symbol.toUpperCase(),
      timeframe: this.interval,
      score,
      action,
      details: {
        macroTrendBuy,
        macroTrendSell,
        momentumBuy,
        momentumSell,
        pullbackBuy,
        pullbackSell,
        volumeSurge,
        rsiBuyOk,
        rsiSellOk,
        bbBuy,
        bbSell,
        macdBuy: !!macdBuy,
        macdSell: !!macdSell,
        patternBuy,
        patternSell,
        atrActive,
        antiLossMode: this.antiLossMode,
        currentPrice,
        ema9,
        ema20,
        ema200,
        rsi,
        marketChoppy,
        requiredScore
      },
      recentTrades: this.trades,
      timestamp: new Date()
    };

    // Dispara callbacks (pode ser usado para enviar pro Frontend via SSE)
    this.onSignalUpdateCallbacks.forEach(cb => cb(signal));
  }
}

// Exporta uma instância global (Singleton)
export const signalsService = new SignalsService();
