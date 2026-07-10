'use client';

import React, { useState, useEffect } from 'react';

export default function ConfigPage() {
  const [configApiUrl, setConfigApiUrl] = useState('');
  const [configApiToken, setConfigApiToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [configAccountId, setConfigAccountId] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configStatus, setConfigStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Carrega configurações da API ao iniciar
  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch('/api/config');
        const data = await res.json();
        if (data.success && data.config?.CHATWOOT) {
          setConfigApiUrl(data.config.CHATWOOT.apiUrl || '');
          setConfigApiToken(data.config.CHATWOOT.apiToken || '');
          setConfigAccountId(data.config.CHATWOOT.accountId || '');
        }
      } catch (err) {
        console.error('Erro ao buscar configuração', err);
      }
    }
    fetchConfig();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigStatus(null);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'CHATWOOT',
          data: {
            apiUrl: configApiUrl,
            apiToken: configApiToken,
            accountId: configAccountId
          }
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConfigStatus({ success: true, message: 'Configurações salvas com sucesso!' });
      } else {
        setConfigStatus({ success: false, message: data.error || 'Erro ao salvar.' });
      }
    } catch (err) {
      setConfigStatus({ success: false, message: 'Erro ao conectar ao servidor.' });
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="p-8 sm:p-12 space-y-8 max-w-xl mx-auto">
      <header>
        <h1 className="text-xl font-bold text-white font-display">⚙️ Configurações de Integrações</h1>
        <p className="text-xs text-neutral-400 font-mono mt-1">Gerencie credenciais e tokens das conexões ativas</p>
      </header>

      <div className="bg-abucci-card border border-abucci-border rounded-xl p-6 shadow-xl relative">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-abucci-gold" />
        <h2 className="text-sm font-bold text-white mb-4 font-display">Conexão Chatwoot API</h2>

        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div>
            <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1 font-mono">
              URL da API Chatwoot
            </label>
            <input
              type="text"
              value={configApiUrl}
              onChange={(e) => setConfigApiUrl(e.target.value)}
              placeholder="https://atendimento.gbamecanica.com.br"
              className="w-full bg-neutral-950 border border-abucci-border rounded-lg px-4 py-2 text-neutral-100 text-xs focus:outline-none focus:border-abucci-gold transition-colors font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1 font-mono">
              Token de Acesso API
            </label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={configApiToken}
                onChange={(e) => setConfigApiToken(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full bg-neutral-950 border border-abucci-border rounded-lg pl-4 pr-10 py-2 text-neutral-100 text-xs focus:outline-none focus:border-abucci-gold transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                {showToken ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1 font-mono">
              ID da Conta (Account ID)
            </label>
            <input
              type="text"
              value={configAccountId}
              onChange={(e) => setConfigAccountId(e.target.value)}
              placeholder="1"
              className="w-full bg-neutral-950 border border-abucci-border rounded-lg px-4 py-2 text-neutral-100 text-xs focus:outline-none focus:border-abucci-gold transition-colors font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={savingConfig}
            className="w-full bg-abucci-gold hover:bg-amber-600 disabled:opacity-40 text-neutral-950 text-xs font-bold py-2.5 px-4 rounded-lg transition-all flex justify-center items-center gap-2 shadow-md shadow-abucci-gold/10"
          >
            {savingConfig ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </form>

        {configStatus && (
          <div className={`mt-4 p-3 rounded-lg border text-xs leading-relaxed ${configStatus.success ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-300' : 'bg-red-950/20 border-red-800/30 text-red-300'}`}>
            {configStatus.message}
          </div>
        )}
      </div>
    </div>
  );
}
