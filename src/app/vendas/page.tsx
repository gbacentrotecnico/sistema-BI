'use client';

import React, { useState, useEffect, useCallback } from 'react';

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

interface MetricObj {
  faturamentoReal: number;
  lucroReal: number;
}

export default function VendasPage() {
  const [activeTab, setActiveTab] = useState<'relatorio' | 'config'>('relatorio');
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MetricObj | null>(null);
  const [faturamentoPorLoja, setFaturamentoPorLoja] = useState<{ loja: string; valor: number }[]>([]);

  // States for sales upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDate, setUploadDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [uploadStoreId, setUploadStoreId] = useState('');
  const [uploadOrigin, setUploadOrigin] = useState('TELE');
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success: boolean; message: string } | null>(null);

  // States for stores CRUD
  const [newStoreCode, setNewStoreCode] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [configError, setConfigError] = useState<string | null>(null);
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);

  // States for collaborator mapping edit
  const [editingColab, setEditingColab] = useState<Colaborador | null>(null);
  const [editColabName, setEditColabName] = useState('');
  const [editColabTipo, setEditColabTipo] = useState('TELE');
  const [editColabAliases, setEditColabAliases] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
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

      const metricsRes = await fetch('/api/bi/metrics');
      const metricsData = await metricsRes.json();
      if (metricsData.success) {
        setMetrics(metricsData.metrics);
        setFaturamentoPorLoja(metricsData.faturamentoPorLoja || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [uploadStoreId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // Handle store CRUD
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

  // Handle collaborator alias map update
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

  return (
    <div className="p-8 sm:p-12 space-y-8 max-w-6xl mx-auto">
      {/* Header and Tabs */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-abucci-border pb-6">
        <div>
          <h1 className="text-xl font-bold text-white font-display">💰 Módulo de Vendas</h1>
          <p className="text-xs text-neutral-400 font-mono mt-1">Faturamento real, desempenho de colaboradores e comissões</p>
        </div>

        <nav className="flex bg-neutral-950/60 p-1.5 rounded-lg border border-abucci-border gap-1">
          <button
            onClick={() => { setActiveTab('relatorio'); setConfigError(null); setConfigSuccess(null); }}
            className={`px-4 py-2 rounded-md text-xs font-semibold font-display transition-all ${activeTab === 'relatorio' ? 'bg-abucci-gold text-neutral-950 font-bold' : 'text-neutral-400 hover:text-neutral-200'}`}
          >
            📊 Relatório BI
          </button>
          <button
            onClick={() => { setActiveTab('config'); setConfigError(null); setConfigSuccess(null); }}
            className={`px-4 py-2 rounded-md text-xs font-semibold font-display transition-all ${activeTab === 'config' ? 'bg-abucci-gold text-neutral-950 font-bold' : 'text-neutral-400 hover:text-neutral-200'}`}
          >
            ⚙️ Configurações / Upload
          </button>
        </nav>
      </header>

      {loading ? (
        <div className="text-center py-20 text-xs text-neutral-400 font-mono">Processando informações...</div>
      ) : activeTab === 'relatorio' ? (
        <div className="space-y-8 animate-fade-in">
          {/* Metrics summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-abucci-card border border-abucci-border rounded-xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
              <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono block">Receita Bruta (Vendas TELE)</span>
              <span className="text-2xl font-extrabold text-white font-mono block mt-2">
                R$ {metrics?.faturamentoReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-abucci-card border border-abucci-border rounded-xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
              <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono block">Lucro Real Estimado</span>
              <span className="text-2xl font-extrabold text-emerald-400 font-mono block mt-2">
                R$ {metrics?.lucroReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-abucci-card border border-abucci-border rounded-xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-abucci-gold" />
              <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono block">Total de Colaboradores</span>
              <span className="text-2xl font-extrabold text-white font-mono block mt-2">{colaboradores.length}</span>
            </div>
          </div>

          {/* Breakdown by Store */}
          <div className="bg-abucci-card border border-abucci-border rounded-xl p-6 shadow-xl">
            <h2 className="text-sm font-bold text-white mb-4 font-display">Faturamento Diário por Loja</h2>
            {faturamentoPorLoja.length === 0 ? (
              <div className="text-center py-10 text-xs text-neutral-500 font-mono">Sem dados de vendas integrados.</div>
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
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
          {/* Left panel: Upload sales */}
          <div className="bg-abucci-card border border-abucci-border rounded-xl p-6 shadow-xl relative h-fit space-y-4">
            <div className="absolute top-0 left-0 w-1 h-full bg-abucci-gold" />
            <h2 className="text-sm font-bold text-white font-display">Importação Planilha de Vendas</h2>
            
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1 font-mono">Data Real das Vendas</label>
                <input
                  type="date"
                  value={uploadDate}
                  onChange={(e) => setUploadDate(e.target.value)}
                  className="w-full bg-neutral-950 border border-abucci-border rounded-lg px-4 py-2 text-neutral-100 text-xs focus:outline-none focus:border-abucci-gold font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1 font-mono">Loja / Unidade</label>
                <select
                  value={uploadStoreId}
                  onChange={(e) => setUploadStoreId(e.target.value)}
                  className="w-full bg-neutral-950 border border-abucci-border rounded-lg px-4 py-2 text-neutral-100 text-xs focus:outline-none focus:border-abucci-gold font-mono"
                >
                  {lojas.map(loja => (
                    <option key={loja.id} value={loja.id}>{loja.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1 font-mono">Origem / Setor</label>
                <select
                  value={uploadOrigin}
                  onChange={(e) => setUploadOrigin(e.target.value)}
                  className="w-full bg-neutral-950 border border-abucci-border rounded-lg px-4 py-2 text-neutral-100 text-xs focus:outline-none focus:border-abucci-gold font-mono"
                >
                  <option value="TELE">TELEMARKETING (Teles / Porta)</option>
                  <option value="VENDEDOR">VENDEDORES (Salão)</option>
                  <option value="MECANICO">MECÂNICOS (Oficina)</option>
                </select>
              </div>

              <div className="border border-dashed border-abucci-border hover:border-abucci-gold/40 transition-colors rounded-lg p-6 text-center cursor-pointer relative bg-neutral-950/40 group">
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <span className="text-xs font-semibold text-neutral-300 block">
                  {uploadFile ? uploadFile.name : 'Selecionar arquivo'}
                </span>
              </div>

              <button
                type="submit"
                disabled={!uploadFile || uploading}
                className="w-full bg-abucci-gold hover:bg-amber-600 disabled:opacity-40 text-neutral-950 text-xs font-bold py-2.5 px-4 rounded-lg transition-all flex justify-center items-center gap-2 shadow-md"
              >
                {uploading ? 'Importando...' : 'Fazer Upload'}
              </button>
            </form>

            {uploadStatus && (
              <div className={`p-3 rounded-lg border text-xs leading-relaxed ${uploadStatus.success ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-300' : 'bg-red-950/20 border-red-800/30 text-red-300'}`}>
                {uploadStatus.message}
              </div>
            )}
          </div>

          {/* Right panel: configuration tabs (Lojas, Aliases) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Lojas CRUD */}
            <div className="bg-abucci-card border border-abucci-border rounded-xl p-6 shadow-xl space-y-4">
              <h3 className="text-xs uppercase font-bold text-abucci-gold font-mono">Gerenciar Unidades / Lojas</h3>
              <form onSubmit={handleAddStore} className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-[9px] uppercase font-bold text-neutral-500 block mb-1">Código</label>
                  <input
                    type="text"
                    value={newStoreCode}
                    onChange={(e) => setNewStoreCode(e.target.value)}
                    placeholder="LOJA_CT"
                    className="w-full bg-neutral-950 border border-abucci-border rounded-lg px-3 py-1.5 text-neutral-100 text-xs focus:outline-none focus:border-abucci-gold font-mono"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[9px] uppercase font-bold text-neutral-500 block mb-1">Nome</label>
                  <input
                    type="text"
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    placeholder="Abucci Centro Técnico"
                    className="w-full bg-neutral-950 border border-abucci-border rounded-lg px-3 py-1.5 text-neutral-100 text-xs focus:outline-none focus:border-abucci-gold font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-abucci-gold hover:bg-amber-600 text-neutral-950 text-xs font-bold py-2 px-4 rounded-lg transition-all h-fit"
                >
                  Adicionar
                </button>
              </form>

              <div className="flex flex-wrap gap-2 pt-2">
                {lojas.map(loja => (
                  <span key={loja.id} className="bg-neutral-950 border border-abucci-border/40 px-3 py-1 rounded-lg text-xs font-mono text-neutral-300">
                    {loja.nome} ({loja.codigo})
                  </span>
                ))}
              </div>
            </div>

            {/* Collaborators & Synonyms CRUD */}
            <div className="bg-abucci-card border border-abucci-border rounded-xl p-6 shadow-xl space-y-4">
              <h3 className="text-xs uppercase font-bold text-abucci-gold font-mono">Vínculo de Apelidos dos Colaboradores</h3>
              
              {editingColab && (
                <form onSubmit={handleUpdateColab} className="bg-neutral-950/80 border border-abucci-gold/30 p-4 rounded-lg space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-abucci-border/40">
                    <span className="text-xs font-bold text-abucci-gold">Editando: {editingColab.nome}</span>
                    <button type="button" onClick={() => setEditingColab(null)} className="text-neutral-500 hover:text-white text-xs">Cancelar</button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-mono block mb-1">Nome Principal</label>
                      <input
                        type="text"
                        value={editColabName}
                        onChange={(e) => setEditColabName(e.target.value)}
                        className="w-full bg-neutral-900 border border-abucci-border rounded-lg px-4 py-2 text-neutral-100 text-xs focus:outline-none focus:border-abucci-gold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-mono block mb-1">Cargo/Tipo</label>
                      <select
                        value={editColabTipo}
                        onChange={(e) => setEditColabTipo(e.target.value)}
                        className="w-full bg-neutral-900 border border-abucci-border rounded-lg px-4 py-2 text-neutral-100 text-xs focus:outline-none focus:border-abucci-gold"
                      >
                        <option value="TELE">TELEMARKETING</option>
                        <option value="VENDEDOR">VENDEDOR</option>
                        <option value="MECANICO">MECÂNICO</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-mono block mb-1">Apelidos/Aliases (separados por vírgula)</label>
                    <input
                      type="text"
                      value={editColabAliases}
                      onChange={(e) => setEditColabAliases(e.target.value)}
                      className="w-full bg-neutral-900 border border-abucci-border rounded-lg px-4 py-2 text-neutral-100 text-xs focus:outline-none focus:border-abucci-gold"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-abucci-gold hover:bg-amber-600 text-neutral-950 text-xs font-bold py-2 px-6 rounded-lg transition-all"
                  >
                    Salvar
                  </button>
                </form>
              )}

              <div className="overflow-y-auto max-h-[300px] border border-abucci-border/40 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-neutral-500 border-b border-abucci-border bg-neutral-950/20 font-mono">
                      <th className="py-2.5 px-3">Nome</th>
                      <th className="py-2.5 px-3">Cargo</th>
                      <th className="py-2.5 px-3">Sinônimos</th>
                      <th className="py-2.5 px-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colaboradores.map(colab => (
                      <tr key={colab.id} className="border-b border-abucci-border/40 hover:bg-neutral-900/40">
                        <td className="py-2.5 px-3 font-semibold text-white">{colab.nome}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${colab.tipo === 'TELE' ? 'bg-indigo-950 text-indigo-300' : colab.tipo === 'VENDEDOR' ? 'bg-amber-950 text-amber-300' : 'bg-emerald-950 text-emerald-300'}`}>
                            {colab.tipo}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-neutral-400 font-mono truncate max-w-[150px]">{colab.aliases.join(', ') || '-'}</td>
                        <td className="py-2.5 px-3 text-right">
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

              {configError && <div className="p-3 bg-red-950/20 border border-red-800/30 text-red-300 text-xs rounded-lg">{configError}</div>}
              {configSuccess && <div className="p-3 bg-emerald-950/20 border border-emerald-800/30 text-emerald-300 text-xs rounded-lg">{configSuccess}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
