import { useState, useEffect } from 'react';
import api from '../../services/api';

interface SignalHistoryRecord {
  id: string;
  action: string;
  entryPrice: number;
  entryTime: string;
  status: string;
  exitPrice: number | null;
  exitTime: string | null;
  mgLevel: number;
}

export function SimulatorTab() {
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Funções helper para localStorage
  const getSaved = <T,>(key: string, defaultVal: T): T => {
    const saved = localStorage.getItem(`traderos_sim_${key}`);
    return saved ? JSON.parse(saved) : defaultVal;
  };

  const [startDate, setStartDate] = useState(() => getSaved('startDate', todayStr));
  const [endDate, setEndDate] = useState(() => getSaved('endDate', todayStr));
  const [initialCapital, setInitialCapital] = useState(() => getSaved('capital', 1000));
  const [entryValue, setEntryValue] = useState(() => getSaved('entry', 20));
  const [maxMg, setMaxMg] = useState(() => getSaved('mg', 1));
  const [payout, setPayout] = useState(() => getSaved('payout', 0.85));

  // Salva no localStorage sempre que alterar
  useEffect(() => {
    localStorage.setItem('traderos_sim_startDate', JSON.stringify(startDate));
    localStorage.setItem('traderos_sim_endDate', JSON.stringify(endDate));
    localStorage.setItem('traderos_sim_capital', JSON.stringify(initialCapital));
    localStorage.setItem('traderos_sim_entry', JSON.stringify(entryValue));
    localStorage.setItem('traderos_sim_mg', JSON.stringify(maxMg));
    localStorage.setItem('traderos_sim_payout', JSON.stringify(payout));
  }, [startDate, endDate, initialCapital, entryValue, maxMg, payout]);

  const [loading, setLoading] = useState(false);
  const [hasSimulated, setHasSimulated] = useState(false);
  const [history, setHistory] = useState<SignalHistoryRecord[]>([]);

  const handleSimulate = async () => {
    setLoading(true);
    setHasSimulated(true);
    try {
      const params = new URLSearchParams();
      if (startDate) {
        const start = new Date(startDate + "T00:00:00");
        params.append('startTime', start.toISOString());
      }
      if (endDate) {
        const end = new Date(endDate + "T23:59:59");
        params.append('endTime', end.toISOString());
      }
      
      const response = await api.get(`/signals/history?${params.toString()}`);
      setHistory(response.data || []);
    } catch (error) {
      console.error('Erro ao buscar histórico', error);
      alert('Erro ao buscar o histórico de sinais.');
    } finally {
      setLoading(false);
    }
  };

  // Cálculo da Simulação
  let currentCapital = initialCapital;
  let totalWins = 0;
  let totalLosses = 0;

  const dayStats: Record<string, { wins: number; losses: number }> = {};
  const hourStats: Record<string, { wins: number; losses: number }> = {};

  // O histórico vem ordenado do mais recente para o mais antigo, 
  // para simular a banca precisamos iterar do mais antigo para o mais recente.
  const sortedHistory = [...history].reverse();

  sortedHistory.forEach(trade => {
    if (trade.status === 'OPEN') return; // Ignora trades em andamento

    // Exclui da simulação os que passaram do limite de MG escolhido
    if (trade.mgLevel > maxMg) return;

    // Se ele deu LOSS no nível atual (e vamos assumir que o bot não conseguiu recuperar porque o trade final foi loss)
    // O valor perdido depende de quantos MGs foram feitos até lá. Simplificaremos calculando o total investido.
    let totalInvested = entryValue;
    for (let i = 1; i <= trade.mgLevel; i++) {
      totalInvested += entryValue * Math.pow(2, i); // Simplificação de dobra no MG
    }

    if (trade.status === 'WIN') {
      totalWins++;
      // Recupera o investimento anterior do MG (se houver) e lucra no último nível
      const lastEntry = entryValue * Math.pow(2, trade.mgLevel);
      const profit = lastEntry * payout;
      
      // O capital descontou os investimentos falhos, mas recuperou no win.
      // Lucro líquido aproximado = profit - perdas anteriores
      let previousLosses = 0;
      for (let i = 0; i < trade.mgLevel; i++) previousLosses += entryValue * Math.pow(2, i);
      
      currentCapital += (profit - previousLosses);
    } else if (trade.status === 'LOSS') {
      totalLosses++;
      currentCapital -= totalInvested;
    }

    // Agrupamento para estatísticas (usando entryTime)
    const dateObj = new Date(trade.entryTime);
    const dayOfWeek = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
    const hour = dateObj.getHours().toString().padStart(2, '0') + ':00';

    if (!dayStats[dayOfWeek]) dayStats[dayOfWeek] = { wins: 0, losses: 0 };
    if (!hourStats[hour]) hourStats[hour] = { wins: 0, losses: 0 };

    if (trade.status === 'WIN') {
      dayStats[dayOfWeek].wins++;
      hourStats[hour].wins++;
    } else {
      dayStats[dayOfWeek].losses++;
      hourStats[hour].losses++;
    }
  });

  const winRate = totalWins + totalLosses > 0 ? (totalWins / (totalWins + totalLosses)) * 100 : 0;
  const netProfit = currentCapital - initialCapital;

  // Descobrir Melhor Dia e Horário
  const bestDay = Object.entries(dayStats).sort((a, b) => {
    const rateA = a[1].wins / (a[1].wins + a[1].losses);
    const rateB = b[1].wins / (b[1].wins + b[1].losses);
    return rateB - rateA;
  })[0]?.[0] || 'N/D';

  const bestHour = Object.entries(hourStats).sort((a, b) => {
    const rateA = a[1].wins / (a[1].wins + a[1].losses);
    const rateB = b[1].wins / (b[1].wins + b[1].losses);
    return rateB - rateA;
  })[0]?.[0] || 'N/D';

  const worstHour = Object.entries(hourStats).sort((a, b) => {
    const rateA = a[1].losses / (a[1].wins + a[1].losses);
    const rateB = b[1].losses / (b[1].wins + b[1].losses);
    return rateB - rateA;
  })[0]?.[0] || 'N/D';

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Filtros */}
      <div className="card shadow-lg p-6">
        <h3 className="font-bold text-[var(--text-primary)] mb-4 border-b border-[var(--border)] pb-2">Configurar Simulação</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 items-end">
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Data Inicial</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-hover)] border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Data Final</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-hover)] border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Banca Inicial (R$)</label>
            <input type="number" value={initialCapital} onChange={e => setInitialCapital(Number(e.target.value))} className="w-full px-3 py-2 bg-[var(--bg-hover)] border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Entrada (R$)</label>
            <input type="number" value={entryValue} onChange={e => setEntryValue(Number(e.target.value))} className="w-full px-3 py-2 bg-[var(--bg-hover)] border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Max MG permitidos</label>
            <input type="number" min="0" max="2" value={maxMg} onChange={e => setMaxMg(Number(e.target.value))} className="w-full px-3 py-2 bg-[var(--bg-hover)] border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Payout (%)</label>
            <input type="number" min="0" max="100" value={payout * 100} onChange={e => setPayout(Number(e.target.value) / 100)} className="w-full px-3 py-2 bg-[var(--bg-hover)] border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <button onClick={handleSimulate} disabled={loading} className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors disabled:opacity-50">
              {loading ? 'Analisando...' : 'Simular'}
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      )}

      {!loading && hasSimulated && history.length === 0 && (
        <div className="card shadow-lg p-8 text-center text-[var(--text-muted)]">
          <div className="text-4xl mb-3">📭</div>
          <p>Nenhum sinal registrado para o período selecionado.</p>
        </div>
      )}

      {!loading && history.length > 0 && (
        <>
          {/* Resultados Projetados */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card shadow p-5 border-l-4 border-blue-500">
              <p className="text-xs text-[var(--text-secondary)] uppercase font-semibold">Banca Projetada</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentCapital)}
              </p>
            </div>
            <div className={`card shadow p-5 border-l-4 ${netProfit >= 0 ? 'border-emerald-500' : 'border-rose-500'}`}>
              <p className="text-xs text-[var(--text-secondary)] uppercase font-semibold">Lucro / Prejuízo</p>
              <p className={`text-2xl font-bold mt-1 ${netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {netProfit > 0 ? '+' : ''}{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(netProfit)}
              </p>
            </div>
            <div className="card shadow p-5 border-l-4 border-purple-500">
              <p className="text-xs text-[var(--text-secondary)] uppercase font-semibold">Taxa de Acerto (C/ MG)</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                {winRate.toFixed(1)}%
              </p>
            </div>
            <div className="card shadow p-5 border-l-4 border-amber-500">
              <p className="text-xs text-[var(--text-secondary)] uppercase font-semibold">Total de Sinais</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                {totalWins + totalLosses} <span className="text-sm font-normal text-[var(--text-muted)]">({totalWins}W / {totalLosses}L)</span>
              </p>
            </div>
          </div>

          {/* Insights */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="card shadow-lg p-6 bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-3xl mb-3">🏆</div>
              <h4 className="font-bold text-[var(--text-primary)] mb-1">Melhor Dia</h4>
              <p className="text-[var(--text-muted)] text-sm mb-2">Dia da semana com maior win-rate.</p>
              <p className="text-xl font-bold text-emerald-500 capitalize">{bestDay}</p>
            </div>
            <div className="card shadow-lg p-6 bg-blue-500/10 border border-blue-500/20">
              <div className="text-3xl mb-3">⏰</div>
              <h4 className="font-bold text-[var(--text-primary)] mb-1">Melhor Horário</h4>
              <p className="text-[var(--text-muted)] text-sm mb-2">Faixa de hora mais lucrativa.</p>
              <p className="text-xl font-bold text-blue-500">{bestHour}</p>
            </div>
            <div className="card shadow-lg p-6 bg-rose-500/10 border border-rose-500/20">
              <div className="text-3xl mb-3">📉</div>
              <h4 className="font-bold text-[var(--text-primary)] mb-1">Pior Horário</h4>
              <p className="text-[var(--text-muted)] text-sm mb-2">Horário ruidoso, evite operar.</p>
              <p className="text-xl font-bold text-rose-500">{worstHour}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
