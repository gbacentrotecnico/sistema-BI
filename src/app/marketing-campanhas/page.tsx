'use client';

import React, { useEffect, useState } from 'react';

export default function MarketingCampanhasPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/bi/metrics')
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          setData(resData.metrics);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-8 sm:p-12 space-y-8 max-w-5xl mx-auto">
      <header>
        <h1 className="text-xl font-bold text-white font-display">📢 Performance de Campanhas (Meta Ads)</h1>
        <p className="text-xs text-neutral-400 font-mono mt-1">Custo por clique, CPM, CTR e CAC de leads</p>
      </header>

      {loading ? (
        <div className="text-center py-20 text-xs text-neutral-400 font-mono">Carregando dados...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-abucci-card border border-abucci-border rounded-xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
            <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono block">Investimento no Meta Ads</span>
            <span className="text-3xl font-extrabold text-white font-mono block mt-2">
              R$ {data?.totalGastoMarketing.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-abucci-card border border-abucci-border rounded-xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-abucci-gold" />
            <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono block">CAC (Custo por Carro Convertido)</span>
            <span className="text-3xl font-extrabold text-white font-mono block mt-2">
              R$ {data?.cac.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
