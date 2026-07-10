'use client';

import React from 'react';

export default function FinanceiroPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4">
      <div className="text-4xl">💳</div>
      <h1 className="text-lg font-bold text-white font-display">Módulo Financeiro</h1>
      <p className="text-xs text-neutral-400 font-mono leading-relaxed">
        Este setor está em fase de integração de APIs de faturamento, fluxo de caixa e conciliação bancária do ERP.
      </p>
      <span className="text-[10px] uppercase font-bold text-abucci-gold bg-abucci-gold/10 border border-abucci-gold/20 px-3 py-1 rounded font-mono">
        Em Construção
      </span>
    </div>
  );
}
