import { NextResponse } from 'next/server';
import { prisma } from '@/config/prisma';
import * as XLSX from 'xlsx';

// Helper para converter string de número no formato PT-BR para float/number
function parseNumberPTBR(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') {
    // Ex: "7.838,60" -> "7838.60"
    const cleaned = val.replace(/\./g, '').replace(',', '.').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

// Normaliza o nome para busca exata/comparativa (maiúsculas, sem acentos, sem espaços extras)
function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9\s]/g, '') // remove caracteres especiais
    .toUpperCase()
    .trim();
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const dateStr = formData.get('data_venda') as string;
    const storeIdStr = formData.get('loja_id') as string;
    const originStr = formData.get('origem_planilha') as string; // 'TELE', 'VENDEDOR', 'MECANICO'

    if (!file || !dateStr || !storeIdStr || !originStr) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando: file, data_venda, loja_id, origem_planilha' },
        { status: 400 }
      );
    }

    const dataVenda = new Date(dateStr);
    if (isNaN(dataVenda.getTime())) {
      return NextResponse.json({ error: 'Data de venda inválida.' }, { status: 400 });
    }

    const lojaId = parseInt(storeIdStr, 10);
    const loja = await prisma.loja.findUnique({ where: { id: lojaId } });
    if (!loja) {
      return NextResponse.json({ error: 'Loja informada não cadastrada no sistema.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Leitura da Planilha
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      return NextResponse.json({ error: 'Planilha vazia ou sem abas válidas.' }, { status: 400 });
    }

    // Convertemos para matriz de arrays
    const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Planilha sem dados.' }, { status: 400 });
    }

    // Achar o cabeçalho
    let headerRowIndex = 0;
    while (headerRowIndex < rows.length && (!rows[headerRowIndex] || rows[headerRowIndex].length === 0)) {
      headerRowIndex++;
    }

    if (headerRowIndex >= rows.length) {
      return NextResponse.json({ error: 'Cabeçalho da planilha não encontrado.' }, { status: 400 });
    }

    const headers: string[] = rows[headerRowIndex].map(h => String(h || '').trim().toUpperCase());

    // Mapeamos os índices
    let nameIdx = headers.findIndex(h => h === 'FUNCIONARIO' || h === 'DESCRIÇÃO' || h === 'DESCRICAO' || h === 'VENDEDOR' || h === 'MECANICO');
    let qtyIdx = headers.findIndex(h => h === 'QTD' || h === 'QTD.' || h === 'QTD. VENDAS' || h === 'VENDAS_QTD');
    let serviceIdx = headers.findIndex(h => h === 'SERVICOS' || h === 'SERVIÇOS' || h === 'VALOR SERVICOS');
    let productIdx = headers.findIndex(h => h === 'PRODUTOS' || h === 'VALOR PRODUTOS');
    let totalIdx = headers.findIndex(h => h === 'TOT LIQ' || h === 'TOT. LIQ' || h === 'VENDAS' || h === 'TOTAL LIQUIDO' || h === 'TOT BRUTO');
    let profitIdx = headers.findIndex(h => h === 'LUCRO');
    let discountIdx = headers.findIndex(h => h === 'DESCONTO');

    if (nameIdx === -1) {
      return NextResponse.json({ error: 'Coluna de Funcionário/Descrição não identificada na planilha.' }, { status: 400 });
    }

    // Carregar colaboradores cadastrados para normalização inteligente
    const colaboradores = await prisma.tele.findMany();
    
    // Deletar registros pré-existentes de vendas para essa mesma loja, data e origem (para permitir re-upload de correção)
    await prisma.vendaDiariaColaborador.deleteMany({
      where: {
        data_venda: dataVenda,
        loja_id: lojaId,
        origem_planilha: originStr,
      }
    });

    let recordsCreated = 0;

    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const rawName = String(row[nameIdx] || '').trim();
      if (!rawName || rawName.toUpperCase() === 'TOTAL' || rawName.toUpperCase() === 'TOTAL GERAL') {
        continue; // ignora a linha de total
      }

      // Procura colaborador por nome exato ou apelido/alias cadastrado
      const normalizedRowName = normalizeName(rawName);
      
      let colaborador = colaboradores.find(c => {
        if (normalizeName(c.nome) === normalizedRowName) return true;
        if (c.aliases && c.aliases.map(a => normalizeName(a)).includes(normalizedRowName)) return true;
        return false;
      });

      // Se não achou, cria o colaborador automaticamente
      if (!colaborador) {
        colaborador = await prisma.tele.create({
          data: {
            nome: rawName,
            tipo: originStr, // 'TELE', 'VENDEDOR', 'MECANICO'
            aliases: [rawName]
          }
        });
        // Atualiza a lista em memória
        colaboradores.push(colaborador);
      }

      const qtd_vendas = qtyIdx !== -1 ? Math.round(parseNumberPTBR(row[qtyIdx])) : 0;
      const valor_servicos = serviceIdx !== -1 ? parseNumberPTBR(row[serviceIdx]) : 0;
      const valor_produtos = productIdx !== -1 ? parseNumberPTBR(row[productIdx]) : 0;
      const total_liquido = totalIdx !== -1 ? parseNumberPTBR(row[totalIdx]) : 0;
      const lucro = profitIdx !== -1 ? parseNumberPTBR(row[profitIdx]) : 0;
      const desconto = discountIdx !== -1 ? parseNumberPTBR(row[discountIdx]) : 0;

      await prisma.vendaDiariaColaborador.create({
        data: {
          data_venda: dataVenda,
          loja_id: lojaId,
          colaborador_id: colaborador.id,
          origem_planilha: originStr,
          qtd_vendas,
          valor_servicos,
          valor_produtos,
          total_liquido,
          lucro,
          desconto
        }
      });

      recordsCreated++;
    }

    return NextResponse.json({
      success: true,
      message: `${recordsCreated} registros de vendas importados com sucesso!`,
      imported: recordsCreated
    });

  } catch (error: any) {
    console.error('[Sales Upload Error]', error);
    return NextResponse.json({ error: 'Erro interno ao processar vendas', details: error.message }, { status: 500 });
  }
}
