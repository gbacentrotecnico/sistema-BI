const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseBR(val) {
  if (val === undefined || val === null || val === '') return null;
  const cleaned = val.replace(',', '.').replace(/"/g, '').trim();
  if (cleaned.toLowerCase() === 'nan' || cleaned.toLowerCase() === 'null') return null;
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

function parseBRRequired(val, defaultVal = 0) {
  const parsed = parseBR(val);
  return parsed === null ? defaultVal : parsed;
}

function parseIntSafe(val) {
  if (val === undefined || val === null || val === '') return null;
  const cleaned = val.replace(/"/g, '').trim();
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? null : parsed;
}

function parseIntRequired(val, defaultVal = 0) {
  const parsed = parseIntSafe(val);
  return parsed === null ? defaultVal : parsed;
}

async function importFile(filePath, integrationId) {
  console.log(`Importando arquivo: ${filePath}...`);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  if (lines.length < 2) return;
  
  const headers = parseCSVLine(lines[0]);
  console.log(`Cabeçalhos detectados:`, headers);

  let importedCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx];
    });

    const dayVal = row['Day'] || row['day'] || row['data'];
    if (!dayVal) continue;

    const data = new Date(dayVal);
    const adSetName = row['Ad Set Name'] || 'N/A';
    const campaignName = row['Campaign Name'] || 'N/A';

    // Obter campos numéricos
    const alcance = parseIntRequired(row['Reach'] || row['alcance']);
    const impressoes = parseIntRequired(row['Impressions'] || row['impressoes']);
    const frequencia = parseBRRequired(row['Frequency'] || row['frequencia']);
    const resultados = parseBR(row['Results'] || row['resultados']);
    const custoPorResultado = parseBR(row['Cost per Result'] || row['custoPorResultado']);
    const valorGasto = parseBRRequired(row['Amount Spent'] || row['valorGasto']);
    const cpm = parseBRRequired(row['CPM (Cost per 1,000 Impressions)'] || row['cpm']);
    const cliquesLink = parseIntRequired(row['Link Clicks'] || row['cliquesLink']);
    const cpc = parseBR(row['CPC (Cost per Link Click)'] || row['cpc']);
    const ctr = parseBRRequired(row['CTR (Link Click-Through Rate)'] || row['ctr']);
    const videoWatches25 = parseIntSafe(row['Video Watches at 25%']);
    const videoWatches50 = parseIntSafe(row['Video Watches at 50%']);
    const videoWatches75 = parseIntSafe(row['Video Watches at 75%']);
    const videoWatches95 = parseIntSafe(row['Video Watches at 95%']);
    const conversoesMensagens = parseIntSafe(row['Messaging Conversations Started'] || row['conversoesMensagens']);
    const custoPorConversaoMensagem = parseBR(row['Cost per Messaging Conversations Started'] || row['custoPorConversaoMensagem']);

    await prisma.performanceCampanha.upsert({
      where: {
        data_adSetName_campaignName_integrationId: {
          data,
          adSetName,
          campaignName,
          integrationId
        }
      },
      update: {
        alcance,
        impressoes,
        frequencia,
        resultados,
        custoPorResultado,
        valorGasto,
        cpm,
        cliquesLink,
        cpc,
        ctr,
        videoWatches25,
        videoWatches50,
        videoWatches75,
        videoWatches95,
        conversoesMensagens,
        custoPorConversaoMensagem
      },
      create: {
        data,
        adSetName,
        campaignName,
        alcance,
        impressoes,
        frequencia,
        resultados,
        custoPorResultado,
        valorGasto,
        cpm,
        cliquesLink,
        cpc,
        ctr,
        videoWatches25,
        videoWatches50,
        videoWatches75,
        videoWatches95,
        conversoesMensagens,
        custoPorConversaoMensagem,
        integrationId
      }
    });

    importedCount++;
  }

  console.log(`Sucesso: ${importedCount} registros importados/atualizados.`);
}

async function main() {
  // 1. Encontrar ou criar integrações
  let ctIntegration = await prisma.integration.findFirst({
    where: { nome: 'META_ADS - Centro Técnico' }
  });
  if (!ctIntegration) {
    ctIntegration = await prisma.integration.create({
      data: {
        nome: 'META_ADS - Centro Técnico',
        tipo: 'META_ADS',
        status: 'ACTIVE'
      }
    });
  }

  let mecIntegration = await prisma.integration.findFirst({
    where: { nome: 'META_ADS - Mecânica' }
  });
  if (!mecIntegration) {
    mecIntegration = await prisma.integration.create({
      data: {
        nome: 'META_ADS - Mecânica',
        tipo: 'META_ADS',
        status: 'ACTIVE'
      }
    });
  }

  // 2. Importar arquivos locais se existirem
  const ctPath = path.join(__dirname, '../Dados para BI - GBA CT.csv');
  const mecPath = path.join(__dirname, '../Dados para BI - GBA MEC.csv');

  if (fs.existsSync(ctPath)) {
    await importFile(ctPath, ctIntegration.id);
  } else {
    console.log(`Arquivo CT não encontrado em: ${ctPath}`);
  }

  if (fs.existsSync(mecPath)) {
    await importFile(mecPath, mecIntegration.id);
  } else {
    console.log(`Arquivo MEC não encontrado em: ${mecPath}`);
  }

  console.log('Importação histórica concluída com sucesso!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
