'use client';

import React, { useEffect, useState } from 'react';

export default function AtendimentoPage() {
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
        <h1 className="text-xl font-bold text-white font-display">💬 Métricas de Atendimento (Chatwoot)</h1>
        <p className="text-xs text-neutral-400 font-mono mt-1">SLA, tempo de resposta e volume de mensagens dos clientes</p>
      </header>

      {loading ? (
        <div className="text-center py-20 text-xs text-neutral-400 font-mono">Carregando dados...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-abucci-card border border-abucci-border rounded-xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
            <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono block">Volume de Leads</span>
            <span className="text-3xl font-extrabold text-white font-mono block mt-2">{data?.leadsAtendidos}</span>
            <span className="text-[10px] text-neutral-400 mt-2 block font-mono">Conversas registradas</span>
          </div>

          <div className="bg-abucci-card border border-abucci-border rounded-xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
            <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono block">Leads Qualificados</span>
            <span className="text-3xl font-extrabold text-white font-mono block mt-2">{data?.leadsQualificados}</span>
            <span className="text-[10px] text-neutral-400 mt-2 block font-mono">Descontado exclusões</span>
          </div>

          <div className="bg-abucci-card border border-abucci-border rounded-xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-abucci-gold" />
            <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono block">Média de Mensagens/Conversa</span>
            <span className="text-3xl font-extrabold text-white font-mono block mt-2">12.5</span>
            <span className="text-[10px] text-neutral-400 mt-2 block font-mono">Índice médio de interações</span>
          </div>
        </div>
      )}
    </div>
  );
}
