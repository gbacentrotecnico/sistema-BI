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

    // Processa de forma sequencial ou chunks para evitar sobrecarregar o banco
    for (const row of clientRows) {
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

      const updateData: any = {
        nome: row.nome || undefined,
        data_nascimento: row.dataNascimento || undefined,
        data_ultima_compra: row.dataUltimaCompra || undefined,
        placa_veiculo: row.placaVeiculo || undefined,
      };

      if (row.telefone2) {
        updateData.telefone2 = row.telefone2;
      }

      if (existingClient) {
        await prisma.cliente.update({
          where: { id: existingClient.id },
          data: updateData
        });
        updated++;
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
        inserted++;
      }
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
