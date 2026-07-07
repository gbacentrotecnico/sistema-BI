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
  const [activeTab, setActiveTab] = useState<'aniv' | 'rev'>('aniv');

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
        
        // Limpa seleção
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
          message: `Sucesso! Importados: ${data.inserted} | Atualizados: ${data.updated} de ${data.total} contatos.`,
        });
        setUploadFile(null);
        // Recarrega dados
        loadDashboardData(selectedDate);
      } else {
        setUploadStatus({
          success: false,
          message: data.error || 'Erro ao processar planilha.',
        });
      }
    } catch (err: any) {
      setUploadStatus({
        success: false,
        message: 'Erro de rede ao fazer upload.',
      });
    } finally {
      setUploading(false);
    }
  };

  // Lógica de Seleção de Clientes
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

  // Abre Modal de Sincronização
  const handleOpenSync = () => {
    if (getSelectedCount() === 0) return;
    
    // Sugere uma tag padrão baseada no contexto
    const today = new Date();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonth = monthNames[today.getMonth()];
    
    if (activeTab === 'aniv') {
      setSyncTag(`Aniversariantes_${currentMonth}_Semana_${Math.ceil(today.getDate() / 7)}`);
    } else {
      setSyncTag(`Revisao_90d_${selectedDate}`);
    }
    setSyncResult(null);
    setShowSyncModal(true);
  };

  // Executa Sincronização
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
          message: `Sincronizados com sucesso: ${data.successCount} contatos. Falhas: ${data.errorCount}.`,
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-6 sm:p-12 relative overflow-hidden">
      {/* Decorative Radial Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-950/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-teal-950/20 rounded-full blur-[120px] pointer-events-none" />

      <header className="max-w-6xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
        <div>
          <span className="text-emerald-400 text-xs font-semibold uppercase tracking-widest px-2.5 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            Painel Operacional
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-2 text-white bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
            Módulo de Campanhas de Marketing
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Gestão de contatos de aniversários, revisões e sincronização rápida no Chatwoot.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        {/* Upload & Setup Section */}
        <section className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Upload de Planilha
            </h2>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Suba arquivos nos formatos <strong>XLSX</strong> ou <strong>CSV</strong>. O importador mapeará automaticamente colunas de Nome, Telefones, Datas e Veículo.
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 transition-colors rounded-xl p-6 text-center cursor-pointer relative bg-zinc-950/40 group">
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <svg className="w-8 h-8 text-zinc-500 group-hover:text-emerald-400 transition-colors mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-xs font-medium text-zinc-300 block">
                  {uploadFile ? uploadFile.name : 'Clique ou arraste a planilha'}
                </span>
                <span className="text-[10px] text-zinc-500 block mt-1">
                  CSV, XLSX de qualquer exportador
                </span>
              </div>

              <button
                type="submit"
                disabled={!uploadFile || uploading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-50 disabled:scale-100 disabled:bg-emerald-500 text-zinc-950 text-xs font-semibold py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex justify-center items-center gap-2"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-zinc-950" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processando dados...
                  </>
                ) : 'Importar Contatos'}
              </button>
            </form>

            {uploadStatus && (
              <div className={`mt-4 p-3 rounded-lg border text-xs leading-relaxed ${uploadStatus.success ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-300' : 'bg-red-950/20 border-red-800/30 text-red-300'}`}>
                {uploadStatus.message}
              </div>
            )}
          </div>

          <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Filtro de Data
            </h2>
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold block">
                Data de Referência (Revisão 90d)
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-teal-500 transition-colors"
              />
              <span className="text-[10px] text-zinc-500 block leading-relaxed mt-1">
                Ao alterar a data, a tabela de revisão listará clientes que compraram há exatamente 90 dias antes da data escolhida.
              </span>
            </div>
          </div>
        </section>

        {/* Dashboard Lists Section */}
        <section className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl shadow-xl flex flex-col">
            
            {/* Custom Tabs */}
            <div className="flex border-b border-zinc-800/80 p-2 gap-2">
              <button
                onClick={() => { setActiveTab('aniv'); setSelectedClients({}); }}
                className={`flex-1 text-center py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === 'aniv' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                Aniversariantes da Semana ({aniversariantes.length})
              </button>
              <button
                onClick={() => { setActiveTab('rev'); setSelectedClients({}); }}
                className={`flex-1 text-center py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === 'rev' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                Revisão de 90 Dias ({revisoes.length})
              </button>
            </div>

            {/* List Action Bar */}
            <div className="px-6 py-4 flex justify-between items-center bg-zinc-950/20 border-b border-zinc-800/80 gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-1 rounded">
                  {getSelectedCount()} selecionados
                </span>
              </div>
              <button
                onClick={handleOpenSync}
                disabled={getSelectedCount() === 0}
                className="bg-teal-500 hover:bg-teal-600 disabled:opacity-40 disabled:scale-100 active:scale-[0.98] text-zinc-950 text-xs font-bold py-2 px-4 rounded-xl transition-all shadow-md shadow-teal-500/10 flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 10.742l-2.084 1.157M10.166 12.09l-3.566 2.378m3.566-2.378L6.7 15.63m10.6-2.888l-2.084-1.157m0 0L13.8 9.57m1.4 1.157l-3.566 2.378m3.566-2.378l-3.566 2.378M12 5.168V19m0-13.832c.707 0 1.343.284 1.802.742L18.6 12m-6.6-6.832C11.293 5.168 10.657 5.45 10.2 5.91L5.4 12" />
                </svg>
                Criar Lista no Chatwoot
              </button>
            </div>

            {/* Content list */}
            <div className="p-2 overflow-x-auto min-h-[300px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <svg className="animate-spin h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-xs text-zinc-500">Buscando contatos...</span>
                </div>
              ) : error ? (
                <div className="text-center py-20 text-xs text-red-400">
                  {error}
                </div>
              ) : getActiveList().length === 0 ? (
                <div className="text-center py-20 text-xs text-zinc-500">
                  Nenhum cliente atende a esta regra na data/semana selecionada.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-zinc-500 border-b border-zinc-800/80">
                      <th className="py-3 px-4 w-10">
                        <input
                          type="checkbox"
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          checked={getActiveList().every(item => selectedClients[item.id])}
                          className="rounded border-zinc-800 bg-zinc-950 text-teal-500 focus:ring-0 focus:ring-offset-0 cursor-pointer w-4 h-4"
                        />
                      </th>
                      <th className="py-3 px-3 font-semibold">Nome</th>
                      <th className="py-3 px-3 font-semibold">Telefone Principal</th>
                      <th className="py-3 px-3 font-semibold">Veículo</th>
                      <th className="py-3 px-3 font-semibold">
                        {activeTab === 'aniv' ? 'Nascimento' : 'Última Compra'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {getActiveList().map(item => (
                      <tr
                        key={item.id}
                        className="border-b border-zinc-800/40 hover:bg-zinc-800/20 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={!!selectedClients[item.id]}
                            onChange={(e) => handleSelectOne(item.id, e.target.checked)}
                            className="rounded border-zinc-800 bg-zinc-950 text-teal-500 focus:ring-0 focus:ring-offset-0 cursor-pointer w-4 h-4"
                          />
                        </td>
                        <td className="py-3.5 px-3 font-medium text-white truncate max-w-[200px]">
                          {item.nome}
                        </td>
                        <td className="py-3.5 px-3 text-zinc-300">
                          {item.telefone}
                          {item.telefone2 && (
                            <span className="text-[10px] text-zinc-500 block">
                              Secundário: {item.telefone2}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-zinc-400">
                          {item.placa_veiculo || '-'}
                        </td>
                        <td className="py-3.5 px-3 text-zinc-400">
                          {activeTab === 'aniv' 
                            ? (item.data_nascimento ? new Date(item.data_nascimento).toLocaleDateString('pt-BR') : '-') 
                            : (item.data_ultima_compra ? new Date(item.data_ultima_compra).toLocaleDateString('pt-BR') : '-')
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              Sincronizar com Chatwoot
            </h3>
            <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
              Você está prestes a exportar <strong>{getSelectedCount()} contatos</strong> selecionados para a sua VPS do Chatwoot.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                  Defina a Etiqueta (Tag) para a Campanha
                </label>
                <input
                  type="text"
                  value={syncTag}
                  onChange={(e) => setSyncTag(e.target.value)}
                  placeholder="Ex: Aniversariantes_Jul_Semana_1"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-teal-500 transition-colors"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Você poderá usar essa etiqueta no Chatwoot para segmentar seus disparos em massa.
                </span>
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
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-zinc-300 text-xs font-semibold py-2.5 rounded-xl transition-all"
                >
                  Fechar
                </button>
                <button
                  onClick={handleSyncChatwoot}
                  disabled={syncing || !syncTag.trim()}
                  className="flex-1 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 disabled:scale-100 active:scale-[0.98] text-zinc-950 text-xs font-bold py-2.5 rounded-xl transition-all shadow-md shadow-teal-500/10 flex justify-center items-center gap-1.5"
                >
                  {syncing ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-zinc-950" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Enviando...
                    </>
                  ) : 'Exportar Contatos'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
