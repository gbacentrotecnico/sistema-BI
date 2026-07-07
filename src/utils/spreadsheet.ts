import * as XLSX from 'xlsx';
import { normalizePhone } from '@/normalizers/phone.normalizer';

export interface ParsedClientRow {
  nome: string | null;
  telefone: string | null;
  telefone2: string | null;
  dataNascimento: Date | null;
  dataUltimaCompra: Date | null;
  placaVeiculo: string | null;
}

function parseExcelDate(val: any): Date | null {
  if (val === undefined || val === null || val === '') return null;

  // Se for número (serial date do Excel)
  if (typeof val === 'number') {
    // Corrige para fuso local do Brasil se necessário, mas new Date padrão resolve a maioria
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(date.getTime()) ? null : date;
  }

  // Se for string
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;

    // Tenta formato DD/MM/YYYY ou DD/MM
    const parts = trimmed.split(/[-/]/);
    if (parts.length >= 2) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parts.length === 3 ? parseInt(parts[2], 10) : new Date().getFullYear();
      
      const parsedDate = new Date(year, month, day);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }

    // Fallback para Date parser padrão
    const parsedDate = new Date(trimmed);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }

  return null;
}

export function parseSpreadsheet(buffer: Buffer): ParsedClientRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) return [];

  // Converte para matriz de arrays (header: 1) para termos acesso direto a todas as colunas
  const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
  if (rows.length === 0) return [];

  // Encontra os cabeçalhos na primeira linha preenchida (geralmente index 0, mas pulamos vazias)
  let headerRowIndex = 0;
  while (headerRowIndex < rows.length && (!rows[headerRowIndex] || rows[headerRowIndex].length === 0)) {
    headerRowIndex++;
  }

  if (headerRowIndex >= rows.length) return [];

  const headers: string[] = rows[headerRowIndex].map(h => String(h || '').trim().toUpperCase());

  // Mapeadores de Índices das Colunas
  let nameIdx = -1;
  let phone1Idx = -1;
  let phone2Idx = -1;
  let birthIdx = -1;
  let purchaseIdx = -1;
  let vehicleIdx = -1;

  headers.forEach((header, idx) => {
    // 1. Nome/Razão Social
    if (nameIdx === -1 && (header.includes('NOME') || header.includes('CLIENTE') || header.includes('RAZAO SOCIAL') || header.includes('RAZÃO SOCIAL') || header.includes('FANTASIA'))) {
      nameIdx = idx;
    }
    // 2. Telefones
    else if (header.includes('TELEFONE 1') || header.includes('TEL 1') || header === 'TELEFONE') {
      if (phone1Idx === -1) {
        phone1Idx = idx;
      } else if (phone2Idx === -1) {
        phone2Idx = idx;
      }
    } else if (header.includes('TELEFONE 2') || header.includes('TEL 2') || header.includes('CELULAR') || header.includes('WHATSAPP') || header.includes('CONTATO')) {
      if (phone1Idx === -1) {
        phone1Idx = idx;
      } else if (phone2Idx === -1) {
        phone2Idx = idx;
      }
    }
    // 3. Nascimento / Aniversário
    else if (birthIdx === -1 && (header.includes('NASC') || header.includes('DATA') || header.includes('ANIV') || header.includes('ANIVERSARIO') || header.includes('NASCIMENTO'))) {
      birthIdx = idx;
    }
    // 4. Última Compra
    else if (purchaseIdx === -1 && (header.includes('ULT') || header.includes('COMPRA') || header.includes('EMISSAO') || header.includes('EMISSÃO'))) {
      purchaseIdx = idx;
    }
    // 5. Veículo
    else if (vehicleIdx === -1 && (header.includes('VEICULO') || header.includes('VEÍCULO') || header.includes('PLACA') || header.includes('CARRO'))) {
      vehicleIdx = idx;
    }
  });

  const parsedRows: ParsedClientRow[] = [];

  // Percorre as linhas após os cabeçalhos
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    // Pega o nome do cliente
    let nome = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : null;
    if (!nome) continue; // Pula se não tiver nome

    // Telefones
    const rawPhone1 = phone1Idx !== -1 ? String(row[phone1Idx] || '').trim() : null;
    const rawPhone2 = phone2Idx !== -1 ? String(row[phone2Idx] || '').trim() : null;

    const phone1 = normalizePhone(rawPhone1);
    const phone2 = normalizePhone(rawPhone2);

    // Se não tiver nenhum telefone válido, não adianta cadastrar para campanha
    if (!phone1 && !phone2) continue;

    // Datas
    const birthVal = birthIdx !== -1 ? row[birthIdx] : null;
    const purchaseVal = purchaseIdx !== -1 ? row[purchaseIdx] : null;

    const dataNascimento = parseExcelDate(birthVal);
    const dataUltimaCompra = parseExcelDate(purchaseVal);

    // Placa / Veículo
    const placaVeiculo = vehicleIdx !== -1 ? String(row[vehicleIdx] || '').trim() : null;

    parsedRows.push({
      nome,
      telefone: phone1 || phone2, // Garante que telefone principal está preenchido
      telefone2: phone1 ? phone2 : null, // Se usou o phone2 como principal, telefone2 fica nulo
      dataNascimento,
      dataUltimaCompra,
      placaVeiculo
    });
  }

  return parsedRows;
}
