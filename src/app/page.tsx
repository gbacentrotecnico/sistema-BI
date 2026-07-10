'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface MetricObj {
  leadsAtendidos: number;
  cuponsGerados: number;
  carrosEmLoja: number;
  conversaoGeral: number;
  conversaoReal: number;
  leadsQualificados: number;
  faturamentoReal: number;
  lucroReal: number;
  cac: number;
  totalGastoMarketing: number;
}

export default function BIDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MetricObj | null>(null);
  const [faturamentoPorLoja, setFaturamentoPorLoja] = useState<{ loja: string; valor: number }[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const metricsRes = await fetch('/api/bi/metrics');
      const metricsData = await metricsRes.json();
      if (metricsData.success) {
        setMetrics(metricsData.metrics);
        setFaturamentoPorLoja(metricsData.faturamentoPorLoja || []);
      }
    } catch (err) {
      console.error('Erro ao buscar dados do dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="p-8 sm:p-12 space-y-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <header className="flex justify-between items-center border-b border-abucci-border pb-6">
        <div>
          <h1 className="text-xl font-bold text-white font-display">📊 Dashboard Geral Consolidado</h1>
          <p className="text-xs text-neutral-400 font-mono mt-1">Métricas integradas de marketing, atendimento e conversão</p>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <svg className="animate-spin h-8 w-8 text-abucci-gold" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs text-neutral-400 font-mono">Consolidando bases de dados...</span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="bg-abucci-card border border-abucci-border rounded-xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-abucci-gold" />
              <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono tracking-wider block">Leads Atendidos</span>
              <span className="text-3xl font-extrabold text-white font-mono block mt-2">{metrics?.leadsAtendidos}</span>
              <span className="text-[10px] text-neutral-400 mt-2 block font-mono">Chatwoot SSOT</span>
            </div>

            {/* Card 2 */}
            <div className="bg-abucci-card border border-abucci-border rounded-xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
              <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono tracking-wider block">Carro em Loja</span>
              <span className="text-3xl font-extrabold text-white font-mono block mt-2">{metrics?.carrosEmLoja}</span>
              <span className="text-[10px] text-neutral-400 mt-2 block font-mono">Status COMPARECEU</span>
            </div>

            {/* Card 3 */}
            <div className="bg-abucci-card border border-abucci-border rounded-xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
              <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono tracking-wider block">Taxa de Conversão Real</span>
              <span className="text-3xl font-extrabold text-emerald-400 font-mono block mt-2">
                {metrics?.conversaoReal.toFixed(2)}%
              </span>
              <span className="text-[10px] text-neutral-400 mt-2 block font-mono">Dedução de não qualificados</span>
            </div>

            {/* Card 4 */}
            <div className="bg-abucci-card border border-abucci-border rounded-xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
              <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono tracking-wider block">Receita Consolidada</span>
              <span className="text-3xl font-extrabold text-white font-mono block mt-2">
                R$ {metrics?.faturamentoReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-neutral-400 mt-2 block font-mono">Faturamento das Lojas (TELE)</span>
            </div>
          </div>

          {/* Faturamento por Loja & CAC Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Store Faturamento Breakdown */}
            <div className="lg:col-span-2 bg-abucci-card border border-abucci-border rounded-xl p-6 shadow-xl">
              <h2 className="text-sm font-bold text-white mb-4 font-display">Faturamento Consolidado por Unidade</h2>
              {faturamentoPorLoja.length === 0 ? (
                <div className="text-center py-10 text-xs text-neutral-500 font-mono">
                  Sem dados de vendas diárias.
                </div>
              ) : (
                <div className="space-y-4">
                  {faturamentoPorLoja.map((item, idx) => {
                    const percentage = metrics?.faturamentoReal && metrics.faturamentoReal > 0 
                      ? (item.valor / metrics.faturamentoReal) * 100 
                      : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-neutral-300 font-semibold">{item.loja}</span>
                          <span className="text-white">
                            R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-neutral-900 rounded-full h-2">
                          <div className="bg-abucci-gold h-2 rounded-full" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* CAC details */}
            <div className="bg-abucci-card border border-abucci-border rounded-xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-bold text-white mb-4 font-display">Custo de Aquisição de Clientes (CAC)</h2>
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono block">Investimento Total Meta Ads</span>
                    <span className="text-lg font-bold text-white font-mono">
                      R$ {metrics?.totalGastoMarketing.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono block">CAC Médio por Carro</span>
                    <span className="text-lg font-bold text-abucci-gold font-mono">
                      R$ {metrics?.cac.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="border-t border-abucci-border/40 pt-4 mt-4 text-[10px] text-neutral-500 font-mono leading-relaxed">
                Fórmula de CAC: Investimento Total Ads / Total COMPARECEU.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
