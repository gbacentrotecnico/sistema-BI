'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface SummaryObj {
  totalConversas: number;
  custoMedioConversa: number;
  totalCliques: number;
  cpcMedio: number;
  totalAlcance: number;
  totalImpressoes: number;
  totalInvestimento: number;
}

interface DailyRecord {
  dataStr: string;
  conversas: number;
  cliques: number;
  investimento: number;
  impressoes: number;
}

interface TableRecord {
  criativo: string;
  conversas: number;
  custoConversa: number;
  cliques: number;
  cpc: number;
  impressoes: number;
  frequencia: number;
  alcance: number;
  investimento: number;
}

export default function MarketingCampanhasPage() {
  const [startDate, setStartDate] = useState('2026-07-01');
  const [endDate, setEndDate] = useState('2026-07-10');
  const [storeFilter, setStoreFilter] = useState<'all' | 'mecanica' | 'ct'>('mecanica'); // Default to Mecânica as shown in user image
  
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SummaryObj | null>(null);
  const [dailyData, setDailyData] = useState<DailyRecord[]>([]);
  const [tableData, setTableData] = useState<TableRecord[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bi/marketing?startDate=${startDate}&endDate=${endDate}&store=${storeFilter}`);
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary);
        setDailyData(data.dailyData);
        setTableData(data.tableData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, storeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Encontra valores máximos para escalar os gráficos SVG de forma dinâmica
  const maxConversas = Math.max(...dailyData.map(d => d.conversas), 1);
  const maxCliques = Math.max(...dailyData.map(d => d.cliques), 1);
  const maxInvestimento = Math.max(...dailyData.map(d => d.investimento), 1);
  const maxImpressoes = Math.max(...dailyData.map(d => d.impressoes), 1);

  return (
    <div className="p-8 sm:p-10 bg-[#0c0d12] text-neutral-200 min-h-screen font-sans space-y-8 select-none">
      {/* 1. Header Section */}
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 border-b border-[#1e2230]/40 pb-6">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl font-extrabold text-white font-display tracking-tight">
              Meta Ads - GBA {storeFilter === 'mecanica' ? 'Mecânica' : storeFilter === 'ct' ? 'Centro Técnico' : 'Grupo'}
            </h1>
            <span className="text-xs text-neutral-500 font-mono">Fulvio</span>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="flex flex-wrap items-center gap-4 bg-neutral-950/60 p-2.5 rounded-xl border border-[#1e2230]">
          {/* Calendars */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-[#12141c] border border-[#1e2230] rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-abucci-gold"
            />
            <span className="text-neutral-600 text-xs font-mono">a</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-[#12141c] border border-[#1e2230] rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-abucci-gold"
            />
          </div>

          {/* Unit selection toggles */}
          <div className="flex bg-[#12141c] p-1 rounded-lg border border-[#1e2230] gap-1">
            <button
              onClick={() => setStoreFilter('mecanica')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${storeFilter === 'mecanica' ? 'bg-[#f39c12] text-neutral-950 shadow-md' : 'text-neutral-400 hover:text-neutral-200'}`}
            >
              Mecânica
            </button>
            <button
              onClick={() => setStoreFilter('ct')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${storeFilter === 'ct' ? 'bg-[#f39c12] text-neutral-950 shadow-md' : 'text-neutral-400 hover:text-neutral-200'}`}
            >
              Centro Técnico
            </button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="text-center py-32 text-xs text-neutral-500 font-mono">Calculando métricas das campanhas...</div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          {/* 2. KPI Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {/* Card 1 */}
            <div className="bg-[#12141c] border border-[#1e2230] rounded-xl p-4 shadow-lg flex flex-col justify-between hover:border-[#f39c12]/30 transition-all duration-300">
              <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider font-mono">Conversas Iniciadas</span>
              <span className="text-2xl font-black text-white font-mono mt-3">{summary?.totalConversas}</span>
            </div>

            {/* Card 2 */}
            <div className="bg-[#12141c] border border-[#1e2230] rounded-xl p-4 shadow-lg flex flex-col justify-between hover:border-[#f39c12]/30 transition-all duration-300">
              <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider font-mono">Custo Médio/Conversa</span>
              <span className="text-2xl font-black text-white font-mono mt-3">
                R$ {summary?.custoMedioConversa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Card 3 */}
            <div className="bg-[#12141c] border border-[#1e2230] rounded-xl p-4 shadow-lg flex flex-col justify-between hover:border-[#f39c12]/30 transition-all duration-300">
              <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider font-mono">Cliques</span>
              <span className="text-2xl font-black text-white font-mono mt-3">{summary?.totalCliques.toLocaleString('pt-BR')}</span>
            </div>

            {/* Card 4 */}
            <div className="bg-[#12141c] border border-[#1e2230] rounded-xl p-4 shadow-lg flex flex-col justify-between hover:border-[#f39c12]/30 transition-all duration-300">
              <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider font-mono">Custo por Clique</span>
              <span className="text-2xl font-black text-white font-mono mt-3">
                R$ {summary?.cpcMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Card 5 */}
            <div className="bg-[#12141c] border border-[#1e2230] rounded-xl p-4 shadow-lg flex flex-col justify-between hover:border-[#f39c12]/30 transition-all duration-300">
              <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider font-mono">Alcance</span>
              <span className="text-2xl font-black text-white font-mono mt-3">{summary?.totalAlcance.toLocaleString('pt-BR')}</span>
            </div>

            {/* Card 6 */}
            <div className="bg-[#12141c] border border-[#1e2230] rounded-xl p-4 shadow-lg flex flex-col justify-between hover:border-[#f39c12]/30 transition-all duration-300">
              <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider font-mono">Impressões</span>
              <span className="text-2xl font-black text-white font-mono mt-3">{summary?.totalImpressoes.toLocaleString('pt-BR')}</span>
            </div>

            {/* Card 7 */}
            <div className="bg-[#12141c] border border-[#1e2230] rounded-xl p-4 shadow-lg flex flex-col justify-between hover:border-[#f39c12]/30 transition-all duration-300">
              <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider font-mono">Investimento Total</span>
              <span className="text-2xl font-black text-abucci-gold font-mono mt-3">
                R$ {summary?.totalInvestimento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* 3. Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Conversas e Cliques */}
            <div className="bg-[#12141c] border border-[#1e2230] rounded-xl p-6 shadow-xl space-y-4">
              <h2 className="text-sm font-bold text-white font-display">Conversas Iniciadas e Cliques no Link por Dia</h2>
              
              <div className="h-64 w-full relative flex items-end justify-between pt-8 border-b border-[#1e2230] pb-2">
                {dailyData.map((d, idx) => {
                  const barHeight = (d.conversas / maxConversas) * 160 || 5;
                  
                  // Calcular pontos da linha (Cliques)
                  const colWidthPercent = 100 / dailyData.length;
                  const x = (idx + 0.5) * colWidthPercent;
                  const y = 200 - (d.cliques / maxCliques) * 160;

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 bg-neutral-950 border border-[#1e2230] px-3 py-1.5 rounded-lg text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none text-left min-w-[120px] shadow-2xl">
                        <span className="font-bold text-neutral-200 block mb-1">{d.dataStr}</span>
                        <span className="text-[#f39c12] block">Conversas: {d.conversas}</span>
                        <span className="text-rose-400 block">Cliques: {d.cliques}</span>
                      </div>

                      {/* Bar (Conversas Iniciadas) */}
                      <div
                        className="w-8 bg-[#f39c12]/20 border border-[#f39c12]/40 rounded-t-sm transition-all duration-300 relative group-hover:bg-[#f39c12]/35"
                        style={{ height: `${barHeight}px` }}
                      >
                        {d.conversas > 0 && (
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-neutral-300">
                            {d.conversas}
                          </span>
                        )}
                      </div>

                      {/* Label */}
                      <span className="text-[10px] text-neutral-500 font-mono mt-2 block">{d.dataStr.split('/')[0]}</span>
                    </div>
                  );
                })}

                {/* SVG Overlay Line for Cliques */}
                <svg className="absolute inset-x-0 bottom-6 h-56 w-full pointer-events-none overflow-visible">
                  <path
                    d={dailyData.map((d, idx) => {
                      const colWidth = 100 / dailyData.length;
                      const x = `${(idx + 0.5) * colWidth}%`;
                      const y = 200 - (d.cliques / maxCliques) * 160;
                      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#f87171"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Points on Line */}
                  {dailyData.map((d, idx) => {
                    const colWidth = 100 / dailyData.length;
                    const x = `${(idx + 0.5) * colWidth}%`;
                    const y = 200 - (d.cliques / maxCliques) * 160;
                    return (
                      <g key={idx}>
                        <circle cx={x} cy={y} r="4" fill="#ef4444" stroke="#0c0d12" strokeWidth="1.5" />
                        {d.cliques > 0 && (
                          <text x={x} y={y - 8} textAnchor="middle" fill="#f87171" className="text-[9px] font-mono font-bold">
                            {d.cliques}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Legends */}
              <div className="flex gap-4 text-[10px] font-mono font-semibold justify-center pt-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-[#f39c12]/20 border border-[#f39c12]/40 rounded-sm" />
                  <span className="text-neutral-400">Conversas Iniciadas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 bg-[#f87171] inline-block" />
                  <span className="text-neutral-400">Cliques no Link</span>
                </div>
              </div>
            </div>

            {/* Chart 2: Investimento x Impressões */}
            <div className="bg-[#12141c] border border-[#1e2230] rounded-xl p-6 shadow-xl space-y-4">
              <h2 className="text-sm font-bold text-white font-display">Investimento x Impressões</h2>
              
              <div className="h-64 w-full relative flex items-end justify-between pt-8 border-b border-[#1e2230] pb-2">
                {dailyData.map((d, idx) => {
                  const barHeight = (d.investimento / maxInvestimento) * 160 || 5;

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 bg-neutral-950 border border-[#1e2230] px-3 py-1.5 rounded-lg text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none text-left min-w-[120px] shadow-2xl">
                        <span className="font-bold text-neutral-200 block mb-1">{d.dataStr}</span>
                        <span className="text-emerald-400 block">Investimento: R$ {d.investimento.toFixed(2)}</span>
                        <span className="text-blue-400 block">Impressões: {d.impressoes.toLocaleString()}</span>
                      </div>

                      {/* Bar (Investimento) */}
                      <div
                        className="w-8 bg-rose-950/40 border border-rose-800/40 rounded-t-sm transition-all duration-300 relative group-hover:bg-rose-900/50"
                        style={{ height: `${barHeight}px` }}
                      >
                        {d.investimento > 0 && (
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-emerald-400 font-bold">
                            R${Math.round(d.investimento)}
                          </span>
                        )}
                      </div>

                      {/* Label */}
                      <span className="text-[10px] text-neutral-500 font-mono mt-2 block">{d.dataStr.split('/')[0]}</span>
                    </div>
                  );
                })}

                {/* SVG Overlay Line for Impressões */}
                <svg className="absolute inset-x-0 bottom-6 h-56 w-full pointer-events-none overflow-visible">
                  <path
                    d={dailyData.map((d, idx) => {
                      const colWidth = 100 / dailyData.length;
                      const x = `${(idx + 0.5) * colWidth}%`;
                      const y = 200 - (d.impressoes / maxImpressoes) * 160;
                      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#4ade80"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Points on Line */}
                  {dailyData.map((d, idx) => {
                    const colWidth = 100 / dailyData.length;
                    const x = `${(idx + 0.5) * colWidth}%`;
                    const y = 200 - (d.impressoes / maxImpressoes) * 160;
                    return (
                      <g key={idx}>
                        <circle cx={x} cy={y} r="4" fill="#22c55e" stroke="#0c0d12" strokeWidth="1.5" />
                        {d.impressoes > 0 && (
                          <text x={x} y={y - 8} textAnchor="middle" fill="#4ade80" className="text-[8px] font-mono font-semibold">
                            {d.impressoes >= 1000 ? `${(d.impressoes / 1000).toFixed(1)}k` : d.impressoes}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Legends */}
              <div className="flex gap-4 text-[10px] font-mono font-semibold justify-center pt-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-rose-900/40 border border-rose-800/40 rounded-sm" />
                  <span className="text-neutral-400">Investimento</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 bg-[#4ade80] inline-block" />
                  <span className="text-neutral-400">Impressões</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Table Section */}
          <div className="bg-[#12141c] border border-[#1e2230] rounded-xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-neutral-400 border-b border-[#1e2230] bg-[#161922] font-mono text-[10px]">
                    <th className="py-3 px-4 font-bold">Criativos</th>
                    <th className="py-3 px-4 font-bold text-center">Conversas Iniciadas</th>
                    <th className="py-3 px-4 font-bold text-center">Custo por Conversa</th>
                    <th className="py-3 px-4 font-bold text-center">Cliques no Link</th>
                    <th className="py-3 px-4 font-bold text-center">CPC</th>
                    <th className="py-3 px-4 font-bold text-center">Impressões</th>
                    <th className="py-3 px-4 font-bold text-center">Frequência</th>
                    <th className="py-3 px-4 font-bold text-center">Alcance</th>
                    <th className="py-3 px-4 font-bold text-right">Investimento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2230]/40 font-mono">
                  {tableData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#161922]/20 transition-colors">
                      <td className="py-3 px-4 text-white font-semibold">{row.criativo}</td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-bold bg-[#15803d]/10">{row.conversas}</td>
                      <td className="py-3 px-4 text-center text-neutral-300 font-bold">
                        R$ {row.custoConversa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center text-sky-400 font-bold bg-[#0369a1]/10">{row.cliques}</td>
                      <td className="py-3 px-4 text-center text-neutral-300">{row.cpc.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 text-center text-neutral-300">{row.impressoes.toLocaleString('pt-BR')}</td>
                      <td className="py-3 px-4 text-center text-neutral-300 bg-neutral-950/20">{row.frequencia}</td>
                      <td className="py-3 px-4 text-center text-neutral-300">{row.alcance.toLocaleString('pt-BR')}</td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-bold">
                        R$ {row.investimento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
