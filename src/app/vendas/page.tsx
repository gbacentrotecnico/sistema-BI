'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface Loja {
  id: number;
  codigo: string;
  nome: string;
}

interface SalesRecord {
  id: number;
  data_venda: string;
  origem_planilha: string;
  qtd_vendas: number;
  total_liquido: string;
  lucro: string;
  colaborador: {
    nome: string;
  };
  loja: {
    nome: string;
  };
}

export default function VendasPage() {
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [loading, setLoading] = useState(true);

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
      const lojasRes = await fetch('/api/lojas');
      const lojasData = await lojasRes.json();
      if (lojasData.success) {
        setLojas(lojasData.lojas || []);
        if (lojasData.lojas.length > 0 && !uploadStoreId) {
          setUploadStoreId(String(lojasData.lojas[0].id));
        }
      }

      // Vamos criar uma rota simples para listar as últimas vendas ou rodamos inline
      const salesRes = await fetch('/api/bi/metrics'); // Busca métricas gerais e podemos estender
      // Ou criar um endpoint específico de vendas futuramente
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [uploadStoreId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    <div className="p-8 sm:p-12 space-y-8 max-w-5xl mx-auto">
      <header>
        <h1 className="text-xl font-bold text-white font-display">💰 Módulo de Vendas</h1>
        <p className="text-xs text-neutral-400 font-mono mt-1">Fato_Vendas por colaborador, mecânico e loja</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload form */}
        <div className="lg:col-span-1 bg-abucci-card border border-abucci-border rounded-xl p-6 shadow-xl relative h-fit">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-abucci-gold" />
          <h2 className="text-sm font-bold text-white mb-3 font-display">Importar Vendas Diárias</h2>
          <p className="text-xs text-neutral-400 mb-5 leading-relaxed">
            Selecione a data de ocorrência real do fechamento, a unidade física e a origem dos colaboradores.
          </p>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1 font-mono">Data das Vendas</label>
              <input
                type="date"
                value={uploadDate}
                onChange={(e) => setUploadDate(e.target.value)}
                className="w-full bg-neutral-950 border border-abucci-border rounded-lg px-4 py-2 text-neutral-100 text-xs focus:outline-none focus:border-abucci-gold transition-colors font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1 font-mono">Loja / Unidade</label>
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

            <div>
              <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1 font-mono">Origem da Planilha</label>
              <select
                value={uploadOrigin}
                onChange={(e) => setUploadOrigin(e.target.value)}
                className="w-full bg-neutral-950 border border-abucci-border rounded-lg px-4 py-2 text-neutral-100 text-xs focus:outline-none focus:border-abucci-gold transition-colors font-mono"
              >
                <option value="TELE">TELEMARKETING (Teles / Porta)</option>
                <option value="VENDEDOR">VENDEDORES (Loja Física)</option>
                <option value="MECANICO">MECÂNICOS (Oficina / Serviços)</option>
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
                {uploadFile ? uploadFile.name : 'Selecionar planilha (.xlsx)'}
              </span>
            </div>

            <button
              type="submit"
              disabled={!uploadFile || uploading}
              className="w-full bg-abucci-gold hover:bg-amber-600 disabled:opacity-40 text-neutral-950 text-xs font-bold py-2.5 px-4 rounded-lg transition-all flex justify-center items-center gap-2 shadow-md shadow-abucci-gold/10"
            >
              {uploading ? 'Importando...' : 'Fazer Upload'}
            </button>
          </form>

          {uploadStatus && (
            <div className={`mt-4 p-3 rounded-lg border text-xs leading-relaxed ${uploadStatus.success ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-300' : 'bg-red-950/20 border-red-800/30 text-red-300'}`}>
              {uploadStatus.message}
            </div>
          )}
        </div>

        {/* Info panel */}
        <div className="lg:col-span-2 bg-abucci-card border border-abucci-border rounded-xl p-6 shadow-xl">
          <h2 className="text-sm font-bold text-white mb-4 font-display">Performance de Vendas e Atribuição</h2>
          <p className="text-xs text-neutral-400 leading-relaxed mb-6">
            As planilhas importadas criam um registro na tabela fato de faturamento diário. Para cruzar esses dados com atendimentos do Chatwoot ou calcular o faturamento global consolidado por unidade, utilize os filtros do painel **Geral**.
          </p>

          <div className="border border-abucci-border/40 rounded-lg p-4 bg-neutral-950/20 text-xs leading-relaxed text-neutral-300 space-y-2">
            <span className="font-bold text-abucci-gold block font-mono">Regras de Atribuição no BI:</span>
            <p>1. 💰 **Faturamento Consolidado:** Soma apenas registros vindos da planilha **Tele** (vendedores + Loja Tele).</p>
            <p>2. 🛠️ **Mecânicos e Vendedores:** Contam apenas para metas e comissão, sem gerar sobreposição na receita total.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
