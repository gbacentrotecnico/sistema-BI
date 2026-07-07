import fs from 'fs';
import path from 'path';
import { prisma } from '../src/config/prisma';
import { parseSpreadsheet } from '../src/utils/spreadsheet';

const folderPath = path.join(__dirname, '../Aniversariantes + Geral');

async function importAll() {
  console.log('--- Iniciando Importação de Planilhas ---');
  console.log(`Buscando arquivos na pasta: ${folderPath}`);

  if (!fs.existsSync(folderPath)) {
    console.error('Pasta "Aniversariantes + Geral" não encontrada.');
    return;
  }

  const files = fs.readdirSync(folderPath);
  console.log('Arquivos encontrados:', files);

  let totalImported = 0;
  let totalUpdated = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (ext !== '.csv' && ext !== '.xlsx') {
      console.log(`[Pular] Arquivo não suportado: ${file}`);
      continue;
    }

    const filePath = path.join(folderPath, file);
    console.log(`\nProcessando arquivo: ${file}...`);

    try {
      const buffer = fs.readFileSync(filePath);
      const parsedRows = parseSpreadsheet(buffer);

      console.log(`Encontrados ${parsedRows.length} contatos potenciais no arquivo.`);

      let fileImported = 0;
      let fileUpdated = 0;

      for (const row of parsedRows) {
        if (!row.telefone) continue;

        // Procura cliente existente por telefone principal ou secundário
        const existingClient = await prisma.cliente.findFirst({
          where: {
            OR: [
              { telefone: row.telefone },
              { telefone2: row.telefone },
              ...(row.telefone2 ? [
                { telefone: row.telefone2 },
                { telefone2: row.telefone2 }
              ] : [])
            ]
          }
        });

        const updateData: any = {};
        if (row.nome) updateData.nome = row.nome;
        if (row.dataNascimento) updateData.data_nascimento = row.dataNascimento;
        if (row.dataUltimaCompra) updateData.data_ultima_compra = row.dataUltimaCompra;
        if (row.placaVeiculo) updateData.placa_veiculo = row.placaVeiculo;
        if (row.telefone2) updateData.telefone2 = row.telefone2;

        if (existingClient) {
          await prisma.cliente.update({
            where: { id: existingClient.id },
            data: updateData
          });
          fileUpdated++;
        } else {
          await prisma.cliente.create({
            data: {
              nome: row.nome,
              telefone: row.telefone,
              telefone2: row.telefone2 || null,
              data_nascimento: row.dataNascimento,
              data_ultima_compra: row.dataUltimaCompra,
              placa_veiculo: row.placaVeiculo
            }
          });
          fileImported++;
        }
      }

      console.log(`[Resultado ${file}]: ${fileImported} novos, ${fileUpdated} atualizados.`);
      totalImported += fileImported;
      totalUpdated += fileUpdated;

    } catch (error: any) {
      console.error(`Erro ao importar ${file}:`, error.message);
    }
  }

  console.log('\n=========================================');
  console.log('IMPORTAÇÃO CONCLUÍDA!');
  console.log(`Total de novos clientes inseridos: ${totalImported}`);
  console.log(`Total de clientes atualizados: ${totalUpdated}`);
  console.log('=========================================');
}

importAll()
  .catch(err => {
    console.error('Erro fatal no importador:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
