'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface ClientMarketing {
  id: number;
  nome: string;
  telefone: string;
  telefone2?: string | null;
  data_nascimento?: string | null;
  data_ultima_compra?: string | null;
  placa_veiculo?: string | null;
}

export default function MarketingCampaignsPage() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [aniversariantes, setAniversariantes] = useState<ClientMarketing[]>([]);
  const [revisoes, setRevisoes] = useState<ClientMarketing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de Upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Seleções para Sincronização
  const [selectedClients, setSelectedClients] = useState<Record<number, boolean>>({});
  const [syncTag, setSyncTag] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [viewingClient, setViewingClient] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'aniv' | 'rev'>('aniv');

  // Estados de Configuração Chatwoot
  const [configApiUrl, setConfigApiUrl] = useState('');
  const [configApiToken, setConfigApiToken] = useState('');
  const [configAccountId, setConfigAccountId] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configStatus, setConfigStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Carrega dados da API
  const loadDashboardData = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/marketing/dashboard?date=${date}`);
      if (!res.ok) throw new Error('Erro ao carregar dados do servidor');
      const data = await res.json();
      if (data.success) {
        setAniversariantes(data.aniversariantes || []);
        setRevisoes(data.revisoes || []);
        setSelectedClients({});
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData(selectedDate);
  }, [selectedDate, loadDashboardData]);

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

  // Função de Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setUploadStatus(null);
    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const res = await fetch('/api/marketing/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setUploadStatus({
          success: true,
          message: `Planilha importada com sucesso! Inseridos: ${data.inserted} | Atualizados: ${data.updated} de ${data.total} contatos.`,
        });
        setUploadFile(null);
        loadDashboardData(selectedDate);
      } else {
        setUploadStatus({
          success: false,
          message: data.error || 'Erro ao processar planilha.',
        });
      }
    } catch (err) {
      setUploadStatus({
        success: false,
        message: 'Erro de rede ao fazer upload.',
      });
    } finally {
      setUploading(false);
    }
  };

  const getActiveList = useCallback(() => {
    return activeTab === 'aniv' ? aniversariantes : revisoes;
  }, [activeTab, aniversariantes, revisoes]);

  const handleSelectAll = (checked: boolean) => {
    const list = getActiveList();
    const newSelected = { ...selectedClients };
    list.forEach(item => {
      if (checked) {
        newSelected[item.id] = true;
      } else {
        delete newSelected[item.id];
      }
    });
    setSelectedClients(newSelected);
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    const newSelected = { ...selectedClients };
    if (checked) {
      newSelected[id] = true;
    } else {
      delete newSelected[id];
    }
    setSelectedClients(newSelected);
  };

  const getSelectedCount = () => {
    return Object.keys(selectedClients).length;
  };

  const handleOpenSync = () => {
    if (getSelectedCount() === 0) return;
    
    const today = new Date();
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const currentMonth = monthNames[today.getMonth()];
    
    if (activeTab === 'aniv') {
      setSyncTag(`Aniversariantes_${currentMonth}_Semana_${Math.ceil(today.getDate() / 7)}`);
    } else {
      setSyncTag(`Revisao_90d_${selectedDate}`);
    }
    setSyncResult(null);
    setShowSyncModal(true);
  };

  const handleSyncChatwoot = async () => {
    if (!syncTag.trim()) return;
    setSyncing(true);
    setSyncResult(null);

    const clientIds = Object.keys(selectedClients).map(Number);

    try {
      const res = await fetch('/api/marketing/sync-chatwoot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientIds, tag: syncTag }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSyncResult({
          success: true,
          message: `Sincronização concluída! Sucesso: ${data.successCount} contatos. Falhas: ${data.errorCount}.`,
        });
        setSelectedClients({});
      } else {
        setSyncResult({
          success: false,
          message: data.error || 'Erro na sincronização.',
        });
      }
    } catch (err) {
      setSyncResult({
        success: false,
        message: 'Erro ao conectar com a API de sincronização.',
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-abucci-dark text-neutral-200 font-sans p-6 sm:p-10 relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-abucci-gold/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-neutral-900/40 rounded-full blur-[140px] pointer-events-none" />

      {/* Brand Header Section */}
      <header className="max-w-6xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-abucci-border pb-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-24 h-16 flex items-center justify-center overflow-hidden">
            <img src="/logo-abucci.png" alt="Grupo Abucci Logo" className="w-full h-full object-contain" />
          </div>


          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-base tracking-wider text-neutral-100 uppercase">GRUPO ABUCCI</span>
              <span className="text-[10px] text-abucci-gold bg-abucci-gold/10 border border-abucci-gold/20 px-2 py-0.5 rounded font-mono font-medium">
                MARKETING ENGINE
              </span>
            </div>
            <span className="text-xs text-neutral-400 font-mono tracking-widest uppercase mt-0.5">
              Campanhas Operacionais & Sincronização VPS
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-[11px] text-abucci-gold/90 font-mono bg-abucci-gold/10 border border-abucci-gold/20 py-2 px-4 rounded-lg font-medium tracking-tight shadow-md">
            FORÇA QUE TE LEVA MAIS LONGE
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Left Control Panel (Upload & Filters) */}
        <section className="lg:col-span-1 flex flex-col gap-6">
          
          {/* File Upload Box */}
          <div className="bg-abucci-card border border-abucci-border rounded-xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-abucci-gold" />
            <h2 className="text-md font-bold text-white mb-3 flex items-center gap-2 font-display">
              <svg className="w-5 h-5 text-abucci-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload de Planilha
            </h2>
            <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
              Arraste ou selecione arquivos **XLSX** ou **CSV**. Nosso sistema mapeará automaticamente os dados de Nome, Telefones e datas de aniversário/compra.
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="border border-dashed border-abucci-border hover:border-abucci-gold/40 transition-colors rounded-lg p-6 text-center cursor-pointer relative bg-neutral-950/40 group">
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <svg className="w-8 h-8 text-neutral-600 group-hover:text-abucci-gold transition-colors mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-xs font-semibold text-neutral-300 block">
                  {uploadFile ? uploadFile.name : 'Selecionar arquivo modelo'}
                </span>
                <span className="text-[10px] text-neutral-500 block mt-1">
                  Formatos aceitos: CSV, XLSX
                </span>
              </div>

              <button
                type="submit"
                disabled={!uploadFile || uploading}
                className="w-full bg-abucci-gold hover:bg-amber-600 active:scale-[0.98] disabled:opacity-40 disabled:scale-100 text-neutral-950 text-xs font-bold py-2.5 px-4 rounded-lg transition-all shadow-md shadow-abucci-gold/10 flex justify-center items-center gap-2"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-neutral-950" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processando...
                  </>
                ) : 'Importar Planilha'}
              </button>
            </form>

            {uploadStatus && (
              <div className={`mt-4 p-3 rounded-lg border text-xs leading-relaxed ${uploadStatus.success ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-300' : 'bg-red-950/20 border-red-800/30 text-red-300'}`}>
                {uploadStatus.message}
              </div>
            )}
          </div>

          {/* Configuration / Date Filter */}
          <div className="bg-abucci-card border border-abucci-border rounded-xl p-6 shadow-xl">
            <h2 className="text-md font-bold text-white mb-4 flex items-center gap-2 font-display">
              <svg className="w-5 h-5 text-abucci-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Filtros da Campanha
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                  Data de Referência (Revisão 90d)
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-neutral-950 border border-abucci-border rounded-lg px-4 py-2 text-neutral-100 text-xs focus:outline-none focus:border-abucci-gold transition-colors font-mono"
                />
              </div>
              <span className="text-[10px] text-neutral-500 block leading-relaxed">
                Modifique a data para consultar e agendar campanhas de revisão de 90 dias com antecedência.
              </span>
            </div>
          </div>

          {/* Chatwoot API Configuration */}
          <div className="bg-abucci-card border border-abucci-border rounded-xl p-6 shadow-xl">
            <h2 className="text-md font-bold text-white mb-4 flex items-center gap-2 font-display">
              <svg className="w-5 h-5 text-abucci-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Configuração Chatwoot
            </h2>
            <form onSubmit={handleSaveConfig} className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
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
                <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                  Token de Acesso API
                </label>
                <input
                  type="password"
                  value={configApiToken}
                  onChange={(e) => setConfigApiToken(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full bg-neutral-950 border border-abucci-border rounded-lg px-4 py-2 text-neutral-100 text-xs focus:outline-none focus:border-abucci-gold transition-colors font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
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
              <div className={`mt-3 p-3 rounded-lg border text-xs leading-relaxed ${configStatus.success ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-300' : 'bg-red-950/20 border-red-800/30 text-red-300'}`}>
                {configStatus.message}
              </div>
            )}
          </div>
        </section>

        {/* Right Dashboard Data (Listings & Actions) */}
        <section className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-abucci-card border border-abucci-border rounded-xl shadow-xl flex flex-col overflow-hidden">
            
            {/* Custom Tab selectors */}
            <div className="flex border-b border-abucci-border bg-neutral-950/20 p-2 gap-2">
              <button
                onClick={() => { setActiveTab('aniv'); setSelectedClients({}); }}
                className={`flex-1 text-center py-2.5 rounded-lg text-xs font-semibold font-display transition-all ${activeTab === 'aniv' ? 'bg-gradient-to-r from-abucci-gold/15 to-transparent text-abucci-gold border-b-2 border-abucci-gold font-bold' : 'text-neutral-400 hover:text-neutral-200'}`}
              >
                🎂 Aniversariantes da Semana ({aniversariantes.length})
              </button>
              <button
                onClick={() => { setActiveTab('rev'); setSelectedClients({}); }}
                className={`flex-1 text-center py-2.5 rounded-lg text-xs font-semibold font-display transition-all ${activeTab === 'rev' ? 'bg-gradient-to-r from-abucci-gold/15 to-transparent text-abucci-gold border-b-2 border-abucci-gold font-bold' : 'text-neutral-400 hover:text-neutral-200'}`}
              >
                🚗 Revisão de 90 Dias ({revisoes.length})
              </button>
            </div>

            {/* List Action Bar */}
            <div className="px-6 py-4 flex justify-between items-center bg-neutral-950/40 border-b border-abucci-border gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-neutral-400 bg-neutral-900 border border-abucci-border px-2.5 py-1 rounded">
                  {getSelectedCount()} contatos selecionados
                </span>
              </div>
              <button
                onClick={handleOpenSync}
                disabled={getSelectedCount() === 0}
                className="bg-abucci-gold hover:bg-amber-600 disabled:opacity-40 disabled:scale-100 active:scale-[0.98] text-neutral-950 text-xs font-bold py-2 px-4 rounded-lg transition-all shadow-md shadow-abucci-gold/10 flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Criar Lista no Chatwoot
              </button>
            </div>

            {/* Content Table */}
            <div className="overflow-x-auto overflow-y-auto max-h-[660px] min-h-[340px] relative">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <svg className="animate-spin h-6 w-6 text-abucci-gold" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-xs text-neutral-400 font-mono">Carregando contatos...</span>
                </div>
              ) : error ? (
                <div className="text-center py-24 text-xs text-red-400 font-mono">
                  {error}
                </div>
              ) : getActiveList().length === 0 ? (
                <div className="text-center py-24 text-xs text-neutral-500 font-mono">
                  Nenhum registro para exibir na data selecionada.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-neutral-500 border-b border-abucci-border bg-neutral-950/20 font-mono">
                      <th className="py-3 px-4 w-12 sticky top-0 bg-abucci-card z-10">
                        <input
                          type="checkbox"
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          checked={getActiveList().every(item => selectedClients[item.id])}
                          className="rounded border-abucci-border bg-neutral-950 text-abucci-gold focus:ring-0 focus:ring-offset-0 cursor-pointer w-4 h-4"
                        />
                      </th>
                      <th className="py-3 px-3 font-semibold sticky top-0 bg-abucci-card z-10">Cliente</th>
                      <th className="py-3 px-3 font-semibold sticky top-0 bg-abucci-card z-10">Telefones</th>
                      <th className="py-3 px-3 font-semibold sticky top-0 bg-abucci-card z-10">Veículo</th>
                      <th className="py-3 px-3 font-semibold sticky top-0 bg-abucci-card z-10">
                        {activeTab === 'aniv' ? 'Nascimento' : 'Última Compra'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {getActiveList().map(item => (
                      <tr
                        key={item.id}
                        className="border-b border-abucci-border/40 hover:bg-neutral-900/40 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={!!selectedClients[item.id]}
                            onChange={(e) => handleSelectOne(item.id, e.target.checked)}
                            className="rounded border-abucci-border bg-neutral-950 text-abucci-gold focus:ring-0 focus:ring-offset-0 cursor-pointer w-4 h-4"
                          />
                        </td>
                        <td 
                          onClick={() => setViewingClient(item)}
                          className="py-3.5 px-3 font-semibold text-white truncate max-w-[200px] cursor-pointer hover:text-abucci-gold transition-colors"
                        >
                          {item.nome}
                        </td>
                        <td 
                          onClick={() => setViewingClient(item)}
                          className="py-3.5 px-3 text-neutral-300 font-mono cursor-pointer"
                        >
                          {item.telefone}
                          {item.telefone2 && (
                            <span className="text-[10px] text-neutral-500 block">
                              Alternativo: {item.telefone2}
                            </span>
                          )}
                        </td>
                        <td 
                          onClick={() => setViewingClient(item)}
                          className="py-3.5 px-3 text-neutral-400 font-mono cursor-pointer"
                        >
                          {item.placa_veiculo || '-'}
                        </td>
                        <td 
                          onClick={() => setViewingClient(item)}
                          className="py-3.5 px-3 text-neutral-400 font-mono cursor-pointer"
                        >
                          {activeTab === 'aniv' 
                            ? (item.data_nascimento ? new Date(item.data_nascimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-') 
                            : (item.data_ultima_compra ? new Date(item.data_ultima_compra).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-')
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Sync Chatwoot Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-abucci-card border border-abucci-border rounded-xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-abucci-gold" />
            <h3 className="text-md font-bold text-white mb-2 font-display flex items-center gap-2">
              Sincronizar VPS Chatwoot
            </h3>
            <p className="text-xs text-neutral-400 mb-5 leading-relaxed">
              Exportando **{getSelectedCount()} contatos** do Grupo Abucci para o Chatwoot.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-neutral-500 block mb-1 font-mono">
                  Etiqueta da Campanha (Tag)
                </label>
                <input
                  type="text"
                  value={syncTag}
                  onChange={(e) => setSyncTag(e.target.value)}
                  placeholder="Ex: Aniversariantes_Jul_Semana_1"
                  className="w-full bg-neutral-950 border border-abucci-border rounded-lg px-4 py-2.5 text-neutral-100 text-xs focus:outline-none focus:border-abucci-gold transition-colors font-mono"
                />
              </div>

              {syncResult && (
                <div className={`p-3 rounded-lg border text-xs leading-relaxed ${syncResult.success ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-300' : 'bg-red-950/20 border-red-800/30 text-red-300'}`}>
                  {syncResult.message}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowSyncModal(false)}
                  disabled={syncing}
                  className="flex-1 bg-neutral-900 border border-abucci-border hover:bg-neutral-800 active:scale-[0.98] text-neutral-300 text-xs font-bold py-2.5 rounded-lg transition-all"
                >
                  Fechar
                </button>
                <button
                  onClick={handleSyncChatwoot}
                  disabled={syncing || !syncTag.trim()}
                  className="flex-1 bg-abucci-gold hover:bg-amber-600 disabled:opacity-40 disabled:scale-100 active:scale-[0.98] text-neutral-950 text-xs font-bold py-2.5 rounded-lg transition-all shadow-md shadow-abucci-gold/10 flex justify-center items-center gap-1.5"
                >
                  {syncing ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-neutral-950" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sincronizando...
                    </>
                  ) : 'Exportar Lista'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client Detail Modal */}
      {viewingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-abucci-card border border-abucci-border rounded-xl w-full max-w-lg p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-abucci-gold" />
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] uppercase font-bold text-abucci-gold font-mono tracking-widest block mb-1">
                  Detalhes do Cliente
                </span>
                <h3 className="text-lg font-bold text-white font-display leading-tight">
                  {viewingClient.nome}
                </h3>
              </div>
              <button 
                onClick={() => setViewingClient(null)}
                className="text-neutral-500 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-950/60 p-3 rounded-lg border border-abucci-border/40">
                  <span className="text-[10px] text-neutral-500 uppercase font-mono block mb-0.5">Telefone Principal</span>
                  <span className="text-xs text-white font-mono">{viewingClient.telefone || '-'}</span>
                </div>
                <div className="bg-neutral-950/60 p-3 rounded-lg border border-abucci-border/40">
                  <span className="text-[10px] text-neutral-500 uppercase font-mono block mb-0.5">Telefone Alternativo</span>
                  <span className="text-xs text-white font-mono">{viewingClient.telefone2 || '-'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-950/60 p-3 rounded-lg border border-abucci-border/40">
                  <span className="text-[10px] text-neutral-500 uppercase font-mono block mb-0.5">Data de Nascimento</span>
                  <span className="text-xs text-white font-mono">
                    {viewingClient.data_nascimento ? new Date(viewingClient.data_nascimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
                  </span>
                </div>
                <div className="bg-neutral-950/60 p-3 rounded-lg border border-abucci-border/40">
                  <span className="text-[10px] text-neutral-500 uppercase font-mono block mb-0.5">Última Compra</span>
                  <span className="text-xs text-white font-mono">
                    {viewingClient.data_ultima_compra ? new Date(viewingClient.data_ultima_compra).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-950/60 p-3 rounded-lg border border-abucci-border/40 col-span-2">
                  <span className="text-[10px] text-neutral-500 uppercase font-mono block mb-0.5">Placa do Veículo</span>
                  <span className="text-xs text-white font-mono uppercase font-semibold">{viewingClient.placa_veiculo || '-'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-neutral-500 font-mono text-[9px] pt-2 border-t border-abucci-border/40">
                <div>
                  <span>Cadastrado em: </span>
                  <span className="text-neutral-400">{viewingClient.created_at ? new Date(viewingClient.created_at).toLocaleString('pt-BR') : '-'}</span>
                </div>
                <div className="text-right">
                  <span>Última atualização: </span>
                  <span className="text-neutral-400">{viewingClient.updated_at ? new Date(viewingClient.updated_at).toLocaleString('pt-BR') : '-'}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setViewingClient(null)}
                  className="w-full bg-neutral-900 border border-abucci-border hover:bg-neutral-800 active:scale-[0.98] text-neutral-300 text-xs font-bold py-2.5 rounded-lg transition-all"
                >
                  Fechar Detalhes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
