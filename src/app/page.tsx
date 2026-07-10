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

interface Loja {
  id: number;
  codigo: string;
  nome: string;
}

interface Colaborador {
  id: number;
  nome: string;
  tipo: string;
  aliases: string[];
}

export default function BIDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'import' | 'config'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MetricObj | null>(null);
  const [faturamentoPorLoja, setFaturamentoPorLoja] = useState<{ loja: string; valor: number }[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  
  // State for config inputs
  const [newStoreCode, setNewStoreCode] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [configError, setConfigError] = useState<string | null>(null);
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);

  // States for collaborator mapping edit
  const [editingColab, setEditingColab] = useState<Colaborador | null>(null);
  const [editColabName, setEditColabName] = useState('');
  const [editColabTipo, setEditColabTipo] = useState('TELE');
  const [editColabAliases, setEditColabAliases] = useState('');

  // States for sales upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDate, setUploadDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [uploadStoreId, setUploadStoreId] = useState('');
  const [uploadOrigin, setUploadOrigin] = useState('TELE');
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success: boolean; message: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const metricsRes = await fetch('/api/bi/metrics');
      const metricsData = await metricsRes.json();
      if (metricsData.success) {
        setMetrics(metricsData.metrics);
        setFaturamentoPorLoja(metricsData.faturamentoPorLoja || []);
      }

      const lojasRes = await fetch('/api/lojas');
      const lojasData = await lojasRes.json();
      if (lojasData.success) {
        setLojas(lojasData.lojas || []);
        if (lojasData.lojas.length > 0 && !uploadStoreId) {
          setUploadStoreId(String(lojasData.lojas[0].id));
        }
      }

      const colabsRes = await fetch('/api/colaboradores');
      const colabsData = await colabsRes.json();
      if (colabsData.success) {
        setColaboradores(colabsData.colaboradores || []);
      }
    } catch (err) {
      console.error('Erro ao buscar dados do dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [uploadStoreId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle store registration
  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigError(null);
    setConfigSuccess(null);
    try {
      const res = await fetch('/api/lojas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: newStoreCode, nome: newStoreName }),
      });
      const data = await res.json();
      if (data.success) {
        setConfigSuccess('Loja cadastrada com sucesso!');
        setNewStoreCode('');
        setNewStoreName('');
        loadData();
      } else {
        setConfigError(data.error || 'Erro ao cadastrar loja.');
      }
    } catch (err) {
      setConfigError('Erro de rede ao salvar loja.');
    }
  };

  // Handle collaborator update
  const handleUpdateColab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingColab) return;
    setConfigError(null);
    setConfigSuccess(null);

    const aliasesArr = editColabAliases
      .split(',')
      .map(a => a.trim())
      .filter(a => a.length > 0);

    try {
      const res = await fetch('/api/colaboradores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingColab.id,
          nome: editColabName,
          tipo: editColabTipo,
          aliases: aliasesArr
        })
      });
      const data = await res.json();
      if (data.success) {
        setConfigSuccess('Colaborador atualizado com sucesso!');
        setEditingColab(null);
        loadData();
      } else {
        setConfigError(data.error || 'Erro ao atualizar.');
      }
    } catch (err) {
      setConfigError('Erro de rede ao atualizar colaborador.');
    }
  };

  // Handle sales upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setUploadStatus(null);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('data_venda', uploadDate);
    formData.append('loja_id', uploadStoreId);
    formData.append('origem_planilha', uploadOrigin);

    try {
      const res = await fetch('/api/marketing/sales/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setUploadStatus({
          success: true,
          message: data.message,
        });
        setUploadFile(null);
        loadData();
      } else {
        setUploadStatus({
          success: false,
          message: data.error || 'Erro ao processar planilha de vendas.',
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

  return (
    <div className="min-h-screen bg-abucci-dark text-neutral-200 font-sans p-6 sm:p-10 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-abucci-gold/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-neutral-900/40 rounded-full blur-[140px] pointer-events-none" />

      {/* Brand Header */}
      <header className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-abucci-border pb-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-16 h-12 flex items-center justify-center overflow-hidden bg-neutral-950 p-2 rounded-lg border border-abucci-border">
            <img src="/logo-abucci.png" alt="Grupo Abucci Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-base tracking-wider text-neutral-100 uppercase">GRUPO ABUCCI</span>
              <span className="text-[10px] text-abucci-gold bg-abucci-gold/10 border border-abucci-gold/20 px-2 py-0.5 rounded font-mono font-medium">
                BI ENGINE V1
              </span>
            </div>
            <span className="text-xs text-neutral-400 font-mono tracking-widest uppercase mt-0.5">
              Business Intelligence & Gestão Unificada
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex bg-neutral-950/60 p-1.5 rounded-lg border border-abucci-border gap-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-md text-xs font-semibold font-display transition-all ${activeTab === 'dashboard' ? 'bg-abucci-gold text-neutral-950 font-bold' : 'text-neutral-400 hover:text-neutral-200'}`}
          >
            📊 Dashboard BI
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 rounded-md text-xs font-semibold font-display transition-all ${activeTab === 'import' ? 'bg-abucci-gold text-neutral-950 font-bold' : 'text-neutral-400 hover:text-neutral-200'}`}
          >
            📥 Importar Vendas
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 rounded-md text-xs font-semibold font-display transition-all ${activeTab === 'config' ? 'bg-abucci-gold text-neutral-950 font-bold' : 'text-neutral-400 hover:text-neutral-200'}`}
          >
            ⚙️ Configurações
          </button>
        </nav>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto relative z-10">
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <svg className="animate-spin h-8 w-8 text-abucci-gold" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-xs text-neutral-400 font-mono">Processando métricas do banco de dados...</span>
          </div>
        )}

        {!loading && activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fade-in">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1 */}
              <div className="bg-abucci-card border border-abucci-border rounded-xl p-5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-abucci-gold" />
                <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono tracking-wider block">Leads Atendidos</span>
                <span className="text-3xl font-extrabold text-white font-mono block mt-2">{metrics?.leadsAtendidos}</span>
                <span className="text-[10px] text-neutral-400 mt-2 block font-mono">Fato Conversas SSOT</span>
              </div>

              {/* Card 2 */}
              <div className="bg-abucci-card border border-abucci-border rounded-xl p-5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono tracking-wider block">Carro em Loja (Porta)</span>
                <span className="text-3xl font-extrabold text-white font-mono block mt-2">{metrics?.carrosEmLoja}</span>
                <span className="text-[10px] text-neutral-400 mt-2 block font-mono">Agendados que compareceram</span>
              </div>

              {/* Card 3 */}
              <div className="bg-abucci-card border border-abucci-border rounded-xl p-5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono tracking-wider block">Taxa de Conversão Real</span>
                <span className="text-3xl font-extrabold text-emerald-400 font-mono block mt-2">
                  {metrics?.conversaoReal.toFixed(2)}%
                </span>
                <span className="text-[10px] text-neutral-400 mt-2 block font-mono">Descontado Leads não qualificados</span>
              </div>

              {/* Card 4 */}
              <div className="bg-abucci-card border border-abucci-border rounded-xl p-5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono tracking-wider block">Faturamento Real</span>
                <span className="text-3xl font-extrabold text-white font-mono block mt-2">
                  R$ {metrics?.faturamentoReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-neutral-400 mt-2 block font-mono">Origem Planilhas TELE</span>
              </div>
            </div>

            {/* Faturamento por Loja & CAC Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Pizza/Bar Table for Store Faturamento */}
              <div className="lg:col-span-2 bg-abucci-card border border-abucci-border rounded-xl p-6 shadow-xl">
                <h2 className="text-md font-bold text-white mb-4 flex items-center gap-2 font-display">
                  Faturamento Consolidado por Unidade
                </h2>
                {faturamentoPorLoja.length === 0 ? (
                  <div className="text-center py-10 text-xs text-neutral-500 font-mono">
                    Nenhuma venda registrada até o momento.
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

              {/* CAC & Lucro Card */}
              <div className="bg-abucci-card border border-abucci-border rounded-xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <h2 className="text-md font-bold text-white mb-4 font-display">Custos de Aquisição (CAC)</h2>
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono block">Investimento Total Marketing</span>
                      <span className="text-xl font-bold text-white font-mono">
                        R$ {metrics?.totalGastoMarketing.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono block">CAC por Carro Convertido</span>
                      <span className="text-xl font-bold text-abucci-gold font-mono">
                        R$ {metrics?.cac.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-abucci-border/40 pt-4 mt-4 text-[11px] text-neutral-500 font-mono leading-relaxed">
                  Calculado cruzando o gasto total do Meta Ads dividido pelo total de Oportunidades com status "COMPARECEU".
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && activeTab === 'import' && (
          <div className="max-w-xl mx-auto bg-abucci-card border border-abucci-border rounded-xl p-6 shadow-xl animate-fade-in relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-abucci-gold" />
            <h2 className="text-md font-bold text-white mb-4 flex items-center gap-2 font-display">
              Importação de Planilha de Vendas (Colaboradores)
            </h2>
            <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
              Carregue a planilha diária de vendas (Tabela 2). Certifique-se de associar a Data de Competência real e a Loja específica antes de enviar.
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1 font-mono">
                    Data da Planilha (Vendas)
                  </label>
                  <input
                    type="date"
                    value={uploadDate}
                    onChange={(e) => setUploadDate(e.target.value)}
                    className="w-full bg-neutral-950 border border-abucci-border rounded-lg px-4 py-2 text-neutral-100 text-xs focus:outline-none focus:border-abucci-gold transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1 font-mono">
                    Selecione a Loja
                  </label>
                  <select
                    value={uploadStoreId}
                    onChange={(e) => setUploadStoreId(e.target.value)}
                    className="w-full bg-neutral-950 border border-abucci-border rounded-lg px-4 py-2 text-neutral-100 text-xs focus:outline-none focus:border-abucci-gold transition-colors font-mono"
                  >
                    {lojas.map(loja => (
                      <option key={loja.id} value={loja.id}>{loja.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1 font-mono">
                  Origem / Canal de Vendas
                </label>
                <select
                  value={uploadOrigin}
                  onChange={(e) => setUploadOrigin(e.target.value)}
                  className="w-full bg-neutral-950 border border-abucci-border rounded-lg px-4 py-2 text-neutral-100 text-xs focus:outline-none focus:border-abucci-gold transition-colors font-mono"
                >
                  <option value="TELE">TELEMARKETING (Campanhas/Porta)</option>
                  <option value="VENDEDOR">VENDEDOR (Salão de Vendas)</option>
                  <option value="MECANICO">MECÂNICO (Mão de Obra/Serviço)</option>
                </select>
              </div>

              <div className="border border-dashed border-abucci-border hover:border-abucci-gold/40 transition-colors rounded-lg p-8 text-center cursor-pointer relative bg-neutral-950/40 group">
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
                  {uploadFile ? uploadFile.name : 'Clique para arrastar o arquivo de vendas'}
                </span>
                <span className="text-[10px] text-neutral-500 block mt-1">
                  Formatos aceitos: CSV, XLSX
                </span>
              </div>

              <button
                type="submit"
                disabled={!uploadFile || uploading}
                className="w-full bg-abucci-gold hover:bg-amber-600 disabled:opacity-40 text-neutral-950 text-xs font-bold py-2.5 px-4 rounded-lg transition-all flex justify-center items-center gap-2 shadow-md shadow-abucci-gold/10"
              >
                {uploading ? 'Processando e Cruzando Dados...' : 'Importar Planilha de Vendas'}
              </button>
            </form>

            {uploadStatus && (
              <div className={`mt-4 p-3 rounded-lg border text-xs leading-relaxed ${uploadStatus.success ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-300' : 'bg-red-950/20 border-red-800/30 text-red-300'}`}>
                {uploadStatus.message}
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === 'config' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            {/* Lojas CRUD Column */}
            <div className="bg-abucci-card border border-abucci-border rounded-xl p-6 shadow-xl space-y-6">
              <h2 className="text-sm font-bold text-white border-b border-abucci-border pb-3 flex items-center gap-2 font-display">
                ⚙️ Unidades / Lojas
              </h2>
              
              {/* Form to add store */}
              <form onSubmit={handleAddStore} className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1 font-mono">Código Identificador (Único)</label>
                  <input
                    type="text"
                    value={newStoreCode}
                    onChange={(e) => setNewStoreCode(e.target.value)}
                    placeholder="Ex: LOJA_CT"
                    className="w-full bg-neutral-950 border border-abucci-border rounded-lg px-4 py-2 text-neutral-100 text-xs focus:outline-none focus:border-abucci-gold transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1 font-mono">Nome da Loja</label>
                  <input
                    type="text"
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    placeholder="Ex: Abucci Centro Técnico"
                    className="w-full bg-neutral-950 border border-abucci-border rounded-lg px-4 py-2 text-neutral-100 text-xs focus:outline-none focus:border-abucci-gold transition-colors font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-abucci-gold hover:bg-amber-600 text-neutral-950 text-xs font-bold py-2 px-4 rounded-lg transition-all shadow-md shadow-abucci-gold/10"
                >
                  Adicionar Loja
                </button>
              </form>

              {/* Lojas List */}
              <div className="space-y-2 pt-3 border-t border-abucci-border/40">
                <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono block">Lojas Cadastradas</span>
                {lojas.length === 0 ? (
                  <span className="text-xs text-neutral-500 italic block">Nenhuma loja cadastrada.</span>
                ) : (
                  <div className="space-y-2">
                    {lojas.map(loja => (
                      <div key={loja.id} className="bg-neutral-950/60 border border-abucci-border/40 p-3 rounded-lg flex justify-between items-center text-xs font-mono">
                        <span className="text-white font-semibold">{loja.nome}</span>
                        <span className="text-[10px] text-neutral-500">{loja.codigo}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Colaboradores Mapping Panel */}
            <div className="lg:col-span-2 bg-abucci-card border border-abucci-border rounded-xl p-6 shadow-xl">
              <h2 className="text-sm font-bold text-white border-b border-abucci-border pb-3 flex items-center gap-2 font-display">
                👥 Gestão de Colaboradores & Apelidos (BI Cleaning)
              </h2>
              <p className="text-xs text-neutral-400 mt-2 mb-4 leading-relaxed">
                Edite os cargos e crie mapeamentos de sinônimos/apelidos (Aliases). Isso garante que variações de escrita de nomes em diferentes planilhas apontem para o mesmo registro unificado no BI.
              </p>

              {/* Edit Form Modal/Area */}
              {editingColab && (
                <form onSubmit={handleUpdateColab} className="bg-neutral-950/80 border border-abucci-gold/30 p-4 rounded-lg mb-6 space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center pb-2 border-b border-abucci-border/40">
                    <span className="text-xs font-bold text-abucci-gold">Editando Colaborador: {editingColab.nome}</span>
                    <button type="button" onClick={() => setEditingColab(null)} className="text-neutral-500 hover:text-white text-xs">Cancelar</button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1 font-mono font-medium">Nome Exibição</label>
                      <input
                        type="text"
                        value={editColabName}
                        onChange={(e) => setEditColabName(e.target.value)}
                        className="w-full bg-neutral-900 border border-abucci-border rounded-lg px-4 py-2 text-neutral-100 text-xs focus:outline-none focus:border-abucci-gold transition-colors font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1 font-mono font-medium">Cargo/Tipo</label>
                      <select
                        value={editColabTipo}
                        onChange={(e) => setEditColabTipo(e.target.value)}
                        className="w-full bg-neutral-900 border border-abucci-border rounded-lg px-4 py-2 text-neutral-100 text-xs focus:outline-none focus:border-abucci-gold transition-colors font-mono"
                      >
                        <option value="TELE">TELEMARKETING</option>
                        <option value="VENDEDOR">VENDEDOR</option>
                        <option value="MECANICO">MECÂNICO</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1 font-mono font-medium">Variações de Nome/Apelidos (Separados por vírgula)</label>
                    <input
                      type="text"
                      value={editColabAliases}
                      onChange={(e) => setEditColabAliases(e.target.value)}
                      placeholder="Ex: MARIA E. LAZARI, M. EUGENIA, MARIA SALOMAO"
                      className="w-full bg-neutral-900 border border-abucci-border rounded-lg px-4 py-2 text-neutral-100 text-xs focus:outline-none focus:border-abucci-gold transition-colors font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-abucci-gold hover:bg-amber-600 text-neutral-950 text-xs font-bold py-2 px-6 rounded-lg transition-all"
                  >
                    Salvar Alterações
                  </button>
                </form>
              )}

              {/* Colaboradores List */}
              <div className="overflow-y-auto max-h-[400px] border border-abucci-border/40 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-neutral-500 border-b border-abucci-border bg-neutral-950/20 font-mono">
                      <th className="py-2.5 px-3 font-semibold">Nome Principal</th>
                      <th className="py-2.5 px-3 font-semibold">Cargo</th>
                      <th className="py-2.5 px-3 font-semibold">Apelidos/Aliases Mapeados</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colaboradores.map(colab => (
                      <tr key={colab.id} className="border-b border-abucci-border/40 hover:bg-neutral-900/40">
                        <td className="py-3 px-3 font-semibold text-white">{colab.nome}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${colab.tipo === 'TELE' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800/30' : colab.tipo === 'VENDEDOR' ? 'bg-amber-950 text-amber-300 border border-amber-800/30' : 'bg-emerald-950 text-emerald-300 border border-emerald-800/30'}`}>
                            {colab.tipo}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-neutral-400 font-mono truncate max-w-[200px]" title={colab.aliases.join(', ')}>
                          {colab.aliases.join(', ') || '-'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              setEditingColab(colab);
                              setEditColabName(colab.nome);
                              setEditColabTipo(colab.tipo);
                              setEditColabAliases(colab.aliases.join(', '));
                            }}
                            className="text-abucci-gold hover:underline font-mono text-[11px]"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {configError && <div className="mt-4 p-3 bg-red-950/20 border border-red-800/30 text-red-300 text-xs rounded-lg">{configError}</div>}
              {configSuccess && <div className="mt-4 p-3 bg-emerald-950/20 border border-emerald-800/30 text-emerald-300 text-xs rounded-lg">{configSuccess}</div>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
