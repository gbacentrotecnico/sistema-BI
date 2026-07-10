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

export default function ConfigPage() {
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  
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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const lojasRes = await fetch('/api/lojas');
      const lojasData = await lojasRes.json();
      if (lojasData.success) {
        setLojas(lojasData.lojas || []);
      }

      const colabsRes = await fetch('/api/colaboradores');
      const colabsData = await colabsRes.json();
      if (colabsData.success) {
        setColaboradores(colabsData.colaboradores || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      <header>
        <h1 className="text-xl font-bold text-white font-display">⚙️ Configurações do Sistema</h1>
        <p className="text-xs text-neutral-400 font-mono mt-1">Gerencie lojas físicas e apelidos das fontes de vendas</p>
      </header>

      {loading ? (
        <div className="text-center py-20 text-xs text-neutral-400 font-mono">Carregando dados...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lojas CRUD */}
          <div className="bg-abucci-card border border-abucci-border rounded-xl p-6 shadow-xl space-y-6">
            <h2 className="text-sm font-bold text-white border-b border-abucci-border pb-3 font-display">
              Unidades / Lojas
            </h2>
            
            <form onSubmit={handleAddStore} className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1 font-mono">Código Identificador</label>
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

            <div className="space-y-2 pt-3 border-t border-abucci-border/40">
              <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono block">Lojas Cadastradas</span>
              <div className="space-y-2">
                {lojas.map(loja => (
                  <div key={loja.id} className="bg-neutral-950/60 border border-abucci-border/40 p-3 rounded-lg flex justify-between items-center text-xs font-mono">
                    <span className="text-white font-semibold">{loja.nome}</span>
                    <span className="text-[10px] text-neutral-500">{loja.codigo}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Colaboradores & Apelidos */}
          <div className="lg:col-span-2 bg-abucci-card border border-abucci-border rounded-xl p-6 shadow-xl">
            <h2 className="text-sm font-bold text-white border-b border-abucci-border pb-3 font-display">
              👥 Mapeamento de Colaboradores & Apelidos
            </h2>
            <p className="text-xs text-neutral-400 mt-2 mb-4 leading-relaxed font-mono">
              Use esta seção para fundir aliases duplicados gerados nas planilhas.
            </p>

            {editingColab && (
              <form onSubmit={handleUpdateColab} className="bg-neutral-950/80 border border-abucci-gold/30 p-4 rounded-lg mb-6 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-abucci-border/40">
                  <span className="text-xs font-bold text-abucci-gold">Editando Colaborador: {editingColab.nome}</span>
                  <button type="button" onClick={() => setEditingColab(null)} className="text-neutral-500 hover:text-white text-xs">Cancelar</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1 font-mono">Nome de Exibição</label>
                    <input
                      type="text"
                      value={editColabName}
                      onChange={(e) => setEditColabName(e.target.value)}
                      className="w-full bg-neutral-900 border border-abucci-border rounded-lg px-4 py-2 text-neutral-100 text-xs focus:outline-none focus:border-abucci-gold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1 font-mono">Cargo/Tipo</label>
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
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1 font-mono">Apelidos/Aliases (separados por vírgula)</label>
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

            <div className="overflow-y-auto max-h-[400px] border border-abucci-border/40 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-neutral-500 border-b border-abucci-border bg-neutral-950/20 font-mono">
                    <th className="py-2.5 px-3">Nome Principal</th>
                    <th className="py-2.5 px-3">Cargo</th>
                    <th className="py-2.5 px-3">Sinônimos / Apelidos</th>
                    <th className="py-2.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {colaboradores.map(colab => (
                    <tr key={colab.id} className="border-b border-abucci-border/40 hover:bg-neutral-900/40">
                      <td className="py-3 px-3 font-semibold text-white">{colab.nome}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${colab.tipo === 'TELE' ? 'bg-indigo-950 text-indigo-300' : colab.tipo === 'VENDEDOR' ? 'bg-amber-950 text-amber-300' : 'bg-emerald-950 text-emerald-300'}`}>
                          {colab.tipo}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-neutral-400 font-mono truncate max-w-[200px]">{colab.aliases.join(', ') || '-'}</td>
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
    </div>
  );
}
