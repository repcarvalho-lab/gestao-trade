import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' }).format(val).replace('US$', '$').trim();
};

const formatTimeWithSeconds = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString('pt-BR');
};

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(', ', ' ');
};

interface SignalDetails {
  macroTrendBuy: boolean;
  macroTrendSell: boolean;
  momentumBuy: boolean;
  momentumSell: boolean;
  pullbackBuy: boolean;
  pullbackSell: boolean;
  volumeSurge: boolean;
  rsiBuyOk: boolean;
  rsiSellOk: boolean;
  currentPrice: number;
  ema9: number;
  ema20: number;
  ema200: number;
  rsi: number;
}

export interface SimulatedTrade {
  id: string;
  action: 'STRONG_BUY' | 'STRONG_SELL';
  entryPrice: number;
  entryTime: string;
  status: 'OPEN' | 'WIN' | 'LOSS';
  exitPrice?: number;
  exitTime?: string;
  mgLevel: number;
}

interface SignalScore {
  symbol: string;
  timeframe: string;
  score: number;
  action: 'STRONG_BUY' | 'WEAK_BUY' | 'STRONG_SELL' | 'WEAK_SELL' | 'NEUTRAL';
  details: SignalDetails;
  recentTrades: SimulatedTrade[];
  timestamp: string;
}

import { SimulatorTab } from './SimulatorTab';

export function RadarPage() {
  const { accessToken } = useAuthStore();
  const [signal, setSignal] = useState<SignalScore | null>(null);
  const [connected, setConnected] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'WIN' | 'LOSS' | 'OPEN'>('ALL');
  const [periodFilter, setPeriodFilter] = useState<'TODAY' | 'ALL_TIME'>('TODAY');
  const [limitFilter, setLimitFilter] = useState<number>(20);
  const [activeTab, setActiveTab] = useState<'LIVE' | 'SIMULATOR'>('LIVE');

  useEffect(() => {
    const token = accessToken || localStorage.getItem('accessToken');
    if (!token) return;

    // Use o token em uma query param ou em cookies caso a API suporte,
    // mas SSE geralmente suporta conexões nativas do navegador.
    // Como usamos o middleware requireAuth, precisamos dar um jeito de passar o token.
    // Para simplificar localmente, passaremos o token via query param (a API pode precisar ser ajustada).
    // Mas no gestao-trade, o auth costuma ser via cookies (refreshToken) + bearer.
    
    // Conecta no stream SSE
    const baseURL = api.defaults.baseURL || 'http://localhost:4000/api';
    const eventSource = new EventSource(`${baseURL}/signals/stream?token=${token}`, {
      withCredentials: true
    });

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.score !== undefined) {
          setSignal(data);
        }
      } catch (err) {
        console.error('Erro ao fazer parse do sinal', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [accessToken]);

  const filteredTrades = signal?.recentTrades
    ?.filter(t => historyFilter === 'ALL' || t.status === historyFilter)
    ?.filter(t => {
      if (periodFilter === 'ALL_TIME') return true;
      const today = new Date().toDateString();
      const tradeDate = new Date(t.entryTime).toDateString();
      return today === tradeDate;
    })
    .slice(0, limitFilter === 0 ? undefined : limitFilter) || [];

  const handleAntiLossChange = async (mode: 'AUTO' | 'ON' | 'OFF') => {
    try {
      await api.post('/signals/settings/anti-loss', { mode });
      // The signal SSE will update the state in the next tick
    } catch (error) {
      console.error('Erro ao alterar modo Anti-Loss', error);
    }
  };

  return (
    <div className="animate-slide-in space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400 flex items-center gap-3">
            Radar de Sinais Cripto
            {activeTab === 'LIVE' && <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`}></span>}
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Analista Quantitativo Automático - 1 Minuto Scalping</p>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-[var(--bg-hover)] p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('LIVE')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'LIVE' ? 'bg-blue-600 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            📡 Radar Ao Vivo
          </button>
          <button 
            onClick={() => setActiveTab('SIMULATOR')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'SIMULATOR' ? 'bg-blue-600 text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            🧪 Simulador & Análise
          </button>
        </div>
      </div>

      {activeTab === 'SIMULATOR' ? (
        <SimulatorTab />
      ) : (
        <>
          {!signal ? (
            <div className="card shadow-lg p-8 flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-[var(--text-muted)]">Conectando aos servidores da Binance e aguardando o primeiro sinal...</p>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Painel Principal */}
          <div className="card shadow-lg flex flex-col p-0 overflow-hidden relative">
            <div className="absolute top-2 right-2 z-20">
              <select 
                className="bg-black/50 text-white text-xs px-2 py-1 rounded border border-white/20 backdrop-blur-sm cursor-pointer outline-none hover:bg-black/70"
                value={signal.details.antiLossMode}
                onChange={(e) => handleAntiLossChange(e.target.value as any)}
                title="Modo Filtro Anti-Loss"
              >
                <option value="AUTO">Anti-Loss: Auto</option>
                <option value="ON">Anti-Loss: Sempre Ligado</option>
                <option value="OFF">Anti-Loss: Desligado</option>
              </select>
            </div>
            {signal.details.marketChoppy && (
              <div className="absolute top-0 left-0 right-0 bg-yellow-500/90 text-black text-xs font-bold py-1 px-3 text-center flex items-center justify-center gap-2 z-10 shadow-md pt-8">
                ⚠️ Filtro Anti-Loss Ativado (Mercado Ruidoso) - Exigência subiu para {signal.details.requiredScore} pts
              </div>
            )}
            <div className={`p-6 text-center text-white ${signal.details.marketChoppy ? 'pt-10' : ''} ${
              signal.action === 'STRONG_BUY' ? 'bg-gradient-to-r from-green-700 to-green-500' :
              signal.action === 'WEAK_BUY' ? 'bg-gradient-to-r from-teal-500 to-emerald-400' : 
              signal.action === 'STRONG_SELL' ? 'bg-gradient-to-r from-red-700 to-red-500' :
              signal.action === 'WEAK_SELL' ? 'bg-gradient-to-r from-orange-500 to-rose-400' : 'bg-gradient-to-r from-gray-700 to-gray-600'
            }`}>
              <h2 className="text-sm font-bold uppercase tracking-wider mb-2 opacity-80">{signal.symbol} • {signal.timeframe}</h2>
              <div className="text-6xl font-black mb-2">{signal.score}</div>
              <div className="text-5xl font-black mb-2 flex items-center justify-center gap-2">
                {signal.action === 'STRONG_BUY' && '🚀 FORTE COMPRA'}
                {signal.action === 'WEAK_BUY' && '📈 LEVE COMPRA'}
                {signal.action === 'STRONG_SELL' && '🩸 FORTE VENDA'}
                {signal.action === 'WEAK_SELL' && '📉 LEVE VENDA'}
                {signal.action === 'NEUTRAL' && '⚖️ NEUTRO'}
              </div>
              <p className="text-white/80 font-medium">
                Score do Algoritmo: <span className="font-bold text-white text-lg">{signal.score} pts</span> 
                <span className="text-xs ml-2 opacity-75">(Exigido: {signal.details.requiredScore})</span>
              </p>
              {signal.details.marketChoppy && (
                <div className="mt-4 bg-black/20 text-[10px] uppercase tracking-widest font-bold py-1 px-3 rounded-full inline-block border border-white/20">
                  ⚠️ Filtro Anti-Loss Ativo
                </div>
              )}
            </div>
            
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[var(--text-secondary)]">Preço Atual:</span>
                <span className="text-2xl font-bold font-mono text-[var(--text-primary)]">{formatCurrency(signal.details.currentPrice)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--text-muted)]">Última atualização:</span>
                <span className="text-[var(--text-primary)]">{formatTimeWithSeconds(signal.timestamp)}</span>
              </div>
            </div>
          </div>

          {/* Checklist de Confluências */}
          <div className="card shadow-lg p-6">
            <h3 className="font-bold text-[var(--text-primary)] mb-4 border-b border-[var(--border)] pb-2">Checklist de Confluências</h3>
            <ul className="space-y-3">
              <li className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)] text-sm">Filtro Macro (Tendência)</span>
                {signal.action.includes('SELL') ? (signal.details.macroTrendSell ? '✅ 20 pts' : '❌ 0 pts') : (signal.details.macroTrendBuy ? '✅ 20 pts' : '❌ 0 pts')}
              </li>
              <li className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)] text-sm">Momentum (EMA 9)</span>
                {signal.action.includes('SELL') ? (signal.details.momentumSell ? '✅ 20 pts' : '❌ 0 pts') : (signal.details.momentumBuy ? '✅ 20 pts' : '❌ 0 pts')}
              </li>
              <li className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)] text-sm">Pullback c/ Rejeição</span>
                {signal.action.includes('SELL') ? (signal.details.pullbackSell ? '✅ 15 pts' : '❌ 0 pts') : (signal.details.pullbackBuy ? '✅ 15 pts' : '❌ 0 pts')}
              </li>
              <li className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)] text-sm">Padrão de Vela (Engolfo)</span>
                {signal.action.includes('SELL') ? (signal.details.patternSell ? '✅ 15 pts' : '❌ 0 pts') : (signal.details.patternBuy ? '✅ 15 pts' : '❌ 0 pts')}
              </li>
              <li className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)] text-sm">Banda de Bollinger</span>
                {signal.action.includes('SELL') ? (signal.details.bbSell ? '✅ 25 pts' : '❌ 0 pts') : (signal.details.bbBuy ? '✅ 25 pts' : '❌ 0 pts')}
              </li>
              <li className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)] text-sm">MACD (Confirmação Institucional)</span>
                {signal.action.includes('SELL') ? (signal.details.macdSell ? '✅ 20 pts' : '❌ 0 pts') : (signal.details.macdBuy ? '✅ 20 pts' : '❌ 0 pts')}
              </li>
              <li className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)] text-sm">Combustível RSI</span>
                {signal.action.includes('SELL') ? (signal.details.rsiSellOk ? '✅ 15 pts' : '❌ 0 pts') : (signal.details.rsiBuyOk ? '✅ 15 pts' : '❌ 0 pts')}
              </li>
              <li className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)] text-sm">Volume Crescente</span>
                {signal.details.volumeSurge ? '✅ 10 pts' : '❌ 0 pts'}
              </li>
              <li className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)] text-sm">Filtro de Volatilidade (ATR)</span>
                {signal.details.atrActive ? '✅ 10 pts' : '❌ 0 pts'}
              </li>
            </ul>

            <div className="mt-6 pt-4 border-t border-[var(--border)] bg-[var(--bg-hover)] p-3 rounded-lg text-xs font-mono text-[var(--text-muted)]">
              <p>EMA 9: {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(signal.details.ema9)}</p>
              <p>EMA 20: {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(signal.details.ema20)}</p>
              <p>EMA 200: {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(signal.details.ema200)}</p>
              <p>RSI: {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(signal.details.rsi)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabela de Backtesting / Histórico */}
      {signal && signal.recentTrades && signal.recentTrades.length > 0 && (
        <div className="card shadow-lg p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 border-b border-[var(--border)] pb-2 gap-4">
            <h3 className="font-bold text-[var(--text-primary)]">Histórico de Gatilhos</h3>
            
            <div className="flex flex-wrap gap-2">
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-[var(--bg-hover)] border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODAY">Apenas Hoje</option>
                <option value="ALL_TIME">Todo o Histórico</option>
              </select>

              <select
                value={limitFilter}
                onChange={(e) => setLimitFilter(Number(e.target.value))}
                className="px-3 py-1.5 bg-[var(--bg-hover)] border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={20}>Últimos 20</option>
                <option value={50}>Últimos 50</option>
                <option value={100}>Últimos 100</option>
                <option value={0}>Todos</option>
              </select>

              <select
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-[var(--bg-hover)] border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Todos os Resultados</option>
                <option value="WIN">Apenas WIN</option>
                <option value="LOSS">Apenas LOSS</option>
                <option value="OPEN">Em Andamento</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-[var(--text-muted)] uppercase bg-[var(--bg-hover)]">
                <tr>
                  <th className="px-4 py-2">Data/Hora</th>
                  <th className="px-4 py-2">Ativo / Sinal</th>
                  <th className="px-4 py-2">Entrada</th>
                  <th className="px-4 py-2">Saída</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map(trade => (
                  <tr key={trade.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-hover)]/50 transition-colors">
                    <td className="px-4 py-3">{formatTime(trade.entryTime)}</td>
                    <td className="px-4 py-3 font-semibold">
                      <span className="text-xs text-[var(--text-muted)] mr-2 font-mono">{signal.symbol}</span>
                      {trade.action === 'STRONG_BUY' ? <span className="text-emerald-500">COMPRA</span> : <span className="text-rose-500">VENDA</span>}
                    </td>
                    <td className="px-4 py-3 font-mono">{formatCurrency(trade.entryPrice)}</td>
                    <td className="px-4 py-3 font-mono text-[var(--text-secondary)]">{trade.exitPrice ? formatCurrency(trade.exitPrice) : '-'}</td>
                    <td className="px-4 py-3 font-bold">
                      {trade.status === 'OPEN' && (
                        <span className={trade.mgLevel > 0 ? "text-amber-500 animate-pulse" : "text-blue-500 animate-pulse"}>
                          EM ANDAMENTO {trade.mgLevel > 0 ? `(MG${trade.mgLevel})` : ''} ⏳
                        </span>
                      )}
                      {trade.status === 'WIN' && (
                        <span className="text-emerald-500">
                          WIN {trade.mgLevel > 0 ? `(MG${trade.mgLevel}) ` : ''}✅
                        </span>
                      )}
                      {trade.status === 'LOSS' && (
                        <span className="text-rose-500">
                          LOSS {trade.mgLevel > 0 ? `(MG${trade.mgLevel}) ` : ''}❌
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredTrades.length === 0 && (
            <p className="text-center text-[var(--text-muted)] py-6">Nenhum resultado encontrado para este filtro.</p>
          )}
          <p className="text-xs text-[var(--text-muted)] mt-4 text-right">
            * Setup Automático: Expiração na próxima vela (1 Minuto)
          </p>
        </div>
      )}
        </>
      )}
    </div>
  );
}
