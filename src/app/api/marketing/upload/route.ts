import { NextResponse } from 'next/server';
import { prisma } from '@/config/prisma';
import { parseSpreadsheet } from '@/utils/spreadsheet';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const clientRows = parseSpreadsheet(buffer);
    if (clientRows.length === 0) {
      return NextResponse.json({ error: 'Nenhum contato válido encontrado na planilha. Verifique as colunas de Nome e Telefone.' }, { status: 400 });
    }

    let inserted = 0;
    let updated = 0;

    // Carrega todos os clientes existentes em memória para busca rápida por telefone
    const existingDbClients = await prisma.cliente.findMany({
      select: {
        id: true,
        telefone: true,
        telefone2: true,
        nome: true,
        data_nascimento: true,
        data_ultima_compra: true,
        placa_veiculo: true
      }
    });

    const clientByPhone = new Map<string, typeof existingDbClients[0]>();
    for (const c of existingDbClients) {
      if (c.telefone) clientByPhone.set(c.telefone, c);
      if (c.telefone2) clientByPhone.set(c.telefone2, c);
    }

    const newClientsToCreate: any[] = [];
    const updatePromises: any[] = [];

    for (const row of clientRows) {
      if (!row.telefone) continue;

      const existingClient = clientByPhone.get(row.telefone) || (row.telefone2 ? clientByPhone.get(row.telefone2) : null);

      if (existingClient) {
        const updateData: any = {};

        // 1. Nome: atualizar apenas se o nome existente for vazio ou se o novo for mais longo/completo
        if (row.nome && (!existingClient.nome || existingClient.nome.length < row.nome.length)) {
          updateData.nome = row.nome;
        }

        // 2. Data de Nascimento: atualizar se não houver
        if (row.dataNascimento && !existingClient.data_nascimento) {
          updateData.data_nascimento = row.dataNascimento;
        }

        // 3. Data de Última Compra: atualizar apenas se a nova data for mais recente
        if (row.dataUltimaCompra) {
          if (!existingClient.data_ultima_compra || new Date(row.dataUltimaCompra) > new Date(existingClient.data_ultima_compra)) {
            updateData.data_ultima_compra = row.dataUltimaCompra;
          }
        }

        // 4. Placa / Veículo: atualizar apenas se não houver placa cadastrada
        if (row.placaVeiculo && !existingClient.placa_veiculo) {
          updateData.placa_veiculo = row.placaVeiculo;
        }

        // 5. Telefone 2: atualizar apenas se não houver telefone2 cadastrado
        if (row.telefone2 && !existingClient.telefone2 && existingClient.telefone !== row.telefone2) {
          updateData.telefone2 = row.telefone2;
        }

        // Se houver algum campo para atualizar, cria a promise correspondente
        if (Object.keys(updateData).length > 0) {
          updatePromises.push(
            prisma.cliente.update({
              where: { id: existingClient.id },
              data: updateData
            })
          );
          updated++;
        }
      } else {
        newClientsToCreate.push({
          nome: row.nome || 'Cliente Importado',
          telefone: row.telefone,
          telefone2: row.telefone2 || null,
          data_nascimento: row.dataNascimento,
          data_ultima_compra: row.dataUltimaCompra,
          placa_veiculo: row.placaVeiculo
        });

        // Registrar no map temporário para evitar duplicados da mesma planilha
        const tempClient = {
          id: 0,
          nome: row.nome,
          telefone: row.telefone,
          telefone2: row.telefone2 || null,
          data_nascimento: row.dataNascimento,
          data_ultima_compra: row.dataUltimaCompra,
          placa_veiculo: row.placaVeiculo
        };
        clientByPhone.set(row.telefone, tempClient);
        if (row.telefone2) clientByPhone.set(row.telefone2, tempClient);

        inserted++;
      }
    }

    // Executa as inserções em lote
    if (newClientsToCreate.length > 0) {
      await prisma.cliente.createMany({
        data: newClientsToCreate,
        skipDuplicates: true
      });
    }

    // Executa as atualizações em lotes de transação (ex: 200 por vez)
    const chunkSize = 200;
    for (let i = 0; i < updatePromises.length; i += chunkSize) {
      const chunk = updatePromises.slice(i, i + chunkSize);
      await prisma.$transaction(chunk);
    }

    return NextResponse.json({
      success: true,
      message: 'Planilha processada com sucesso!',
      inserted,
      updated,
      total: clientRows.length
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Marketing Upload Error]', error);
    return NextResponse.json({ error: 'Erro interno ao processar planilha', details: error.message }, { status: 500 });
  }
}

