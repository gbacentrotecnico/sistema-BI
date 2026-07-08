import { NextResponse } from 'next/server';
import { prisma } from '@/config/prisma';

async function createLabelGlobally(cleanUrl: string, accountId: string, token: string, title: string) {
  try {
    const url = `${cleanUrl}/api/v1/accounts/${accountId}/labels`;
    await fetch(url, {
      method: 'POST',
      headers: {
        'api_access_token': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: title.trim(),
        description: 'Criada automaticamente pelo Sistema BI',
        color: '#f39c12',
        show_on_sidebar: true
      })
    });
  } catch (err) {
    console.error(`Erro ao criar etiqueta global ${title}:`, err);
  }
}

export async function POST(request: Request) {
  try {
    const { clientIds, tag } = await request.json();

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json({ error: 'Nenhum cliente selecionado para sincronização.' }, { status: 400 });
    }

    if (!tag || typeof tag !== 'string' || !tag.trim()) {
      return NextResponse.json({ error: 'Etiqueta inválida ou não informada.' }, { status: 400 });
    }

    // Busca a integração ativa do Chatwoot no banco de dados
    const chatwootIntegration = await prisma.integration.findFirst({
      where: { tipo: 'CHATWOOT', status: 'ACTIVE' }
    });

    const integrationConfig = chatwootIntegration?.config_json as any;

    const chatwootUrl = integrationConfig?.apiUrl || process.env.CHATWOOT_API_URL;
    const chatwootToken = integrationConfig?.apiToken || process.env.CHATWOOT_API_TOKEN;
    const chatwootAccountId = integrationConfig?.accountId || process.env.CHATWOOT_ACCOUNT_ID;

    if (!chatwootUrl || !chatwootToken || !chatwootAccountId) {
      return NextResponse.json({ 
        error: 'Configurações da API do Chatwoot ausentes (configure na tela ou no arquivo .env).' 
      }, { status: 500 });
    }

    const cleanUrl = chatwootUrl.endsWith('/') ? chatwootUrl.slice(0, -1) : chatwootUrl;

    const cleanTag = tag.trim().toLowerCase();
    const cleanBIMarketing = 'bi_marketing';

    // Garante que as etiquetas existam globalmente no painel do Chatwoot antes de associá-las
    await createLabelGlobally(cleanUrl, String(chatwootAccountId), chatwootToken, cleanTag);
    await createLabelGlobally(cleanUrl, String(chatwootAccountId), chatwootToken, cleanBIMarketing);

    // Busca os clientes no banco de dados local
    const clients = await prisma.cliente.findMany({
      where: {
        id: { in: clientIds }
      }
    });

    let successCount = 0;
    let errorCount = 0;
    const logs: string[] = [];

    for (const client of clients) {
      const phone = client.telefone;
      if (!phone) {
        errorCount++;
        logs.push(`Cliente ${client.nome || client.id} não possui telefone válido.`);
        continue;
      }

      // Adiciona o '+' no telefone para o padrão exigido pelo Chatwoot
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;

      try {
        // 1. Procura se o contato já existe no Chatwoot pelo telefone
        const searchUrl = `${cleanUrl}/api/v1/accounts/${chatwootAccountId}/contacts/search?q=${encodeURIComponent(formattedPhone)}`;
        const searchRes = await fetch(searchUrl, {
          method: 'GET',
          headers: {
            'api_access_token': chatwootToken,
            'Content-Type': 'application/json'
          }
        });

        if (!searchRes.ok) {
          throw new Error(`Erro na busca do Chatwoot (HTTP ${searchRes.status})`);
        }

        const searchData = await searchRes.json();
        // O Chatwoot pode retornar os contatos dentro de searchData.payload ou diretamente como array
        const foundContacts = searchData.payload || (Array.isArray(searchData) ? searchData : []);

        let contactId: number | null = null;

        if (foundContacts.length > 0) {
          // Contato existe! Pega o ID dele
          contactId = foundContacts[0].id;
          logs.push(`Contato existente encontrado no Chatwoot para ${client.nome} (ID: ${contactId})`);
        } else {
          // Contato não existe! Vamos criá-lo
          const createUrl = `${cleanUrl}/api/v1/accounts/${chatwootAccountId}/contacts`;
          const createRes = await fetch(createUrl, {
            method: 'POST',
            headers: {
              'api_access_token': chatwootToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: client.nome || 'Cliente Importado',
              phone_number: formattedPhone,
              custom_attributes: client.placa_veiculo ? { placa_veiculo: client.placa_veiculo } : undefined
            })
          });

          if (!createRes.ok) {
            const errBody = await createRes.text();
            throw new Error(`Erro ao criar contato no Chatwoot (HTTP ${createRes.status}): ${errBody}`);
          }

          const createData = await createRes.json();
          // Chatwoot retorna o contato criado no nó 'payload.contact', 'payload' ou diretamente
          const createdContact = createData.payload?.contact || createData.payload || createData;
          contactId = createdContact.id;
          logs.push(`Novo contato criado no Chatwoot para ${client.nome} (ID: ${contactId})`);
        }

        if (contactId) {
          // 2. Aplica a Etiqueta (Tag) ao Contato no Chatwoot
          const labelUrl = `${cleanUrl}/api/v1/accounts/${chatwootAccountId}/contacts/${contactId}/labels`;
          const labelRes = await fetch(labelUrl, {
            method: 'POST',
            headers: {
              'api_access_token': chatwootToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              labels: [cleanTag, cleanBIMarketing]
            })
          });

          if (!labelRes.ok) {
            throw new Error(`Erro ao aplicar etiqueta (HTTP ${labelRes.status})`);
          }

          successCount++;
        } else {
          throw new Error('Não foi possível obter o ID do contato.');
        }

      } catch (err: any) {
        errorCount++;
        console.error(`[Chatwoot Sync Error] Cliente: ${client.nome}`, err);
        logs.push(`Erro ao sincronizar ${client.nome}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      successCount,
      errorCount,
      logs
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Sync Chatwoot Endpoint Error]', error);
    return NextResponse.json({ error: 'Erro interno ao sincronizar contatos', details: error.message }, { status: 500 });
  }
}
