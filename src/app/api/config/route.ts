import { NextResponse } from 'next/server';
import { prisma } from '@/config/prisma';

export async function GET() {
  try {
    const integrations = await prisma.integration.findMany({
      where: {
        tipo: { in: ['CHATWOOT', 'META_ADS'] }
      }
    });

    const config: Record<string, any> = {
      CHATWOOT: { apiUrl: '', apiToken: '', accountId: '' },
      META_ADS: { accessToken: '', adAccountIdCt: '', adAccountIdMec: '' }
    };

    integrations.forEach(item => {
      const configJson = item.config_json as any;
      if (item.tipo === 'CHATWOOT' && configJson) {
        config.CHATWOOT = {
          apiUrl: configJson.apiUrl || '',
          // Mascarar o token ao enviar para o frontend
          apiToken: configJson.apiToken ? `${configJson.apiToken.slice(0, 4)}...${configJson.apiToken.slice(-4)}` : '',
          accountId: configJson.accountId || ''
        };
      } else if (item.tipo === 'META_ADS' && configJson) {
        config.META_ADS = {
          accessToken: configJson.accessToken ? `${configJson.accessToken.slice(0, 4)}...${configJson.accessToken.slice(-4)}` : '',
          adAccountIdCt: configJson.adAccountIdCt || '',
          adAccountIdMec: configJson.adAccountIdMec || ''
        };
      }
    });

    return NextResponse.json({ success: true, config }, { status: 200 });
  } catch (error: any) {
    console.error('[Config GET Error]', error);
    return NextResponse.json({ error: 'Erro ao buscar configurações', details: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { tipo, data } = await request.json();

    if (!tipo || !['CHATWOOT', 'META_ADS'].includes(tipo)) {
      return NextResponse.json({ error: 'Tipo de integração inválido.' }, { status: 400 });
    }

    let integration = await prisma.integration.findFirst({
      where: { tipo }
    });

    let currentConfig: any = {};
    if (integration && integration.config_json) {
      currentConfig = integration.config_json;
    }

    // Se o token vier mascarado (ex: "7cjz...LGMi"), mantemos o token anterior do banco
    const updatedConfig = { ...currentConfig };

    if (tipo === 'CHATWOOT') {
      updatedConfig.apiUrl = data.apiUrl || '';
      updatedConfig.accountId = data.accountId || '';
      if (data.apiToken && !data.apiToken.includes('...')) {
        updatedConfig.apiToken = data.apiToken;
      }
    } else if (tipo === 'META_ADS') {
      updatedConfig.adAccountIdCt = data.adAccountIdCt || '';
      updatedConfig.adAccountIdMec = data.adAccountIdMec || '';
      if (data.accessToken && !data.accessToken.includes('...')) {
        updatedConfig.accessToken = data.accessToken;
      }
    }

    if (integration) {
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          config_json: updatedConfig,
          status: 'ACTIVE'
        }
      });
    } else {
      await prisma.integration.create({
        data: {
          nome: tipo === 'CHATWOOT' ? 'Chatwoot Global' : 'Meta Ads Global',
          tipo,
          status: 'ACTIVE',
          config_json: updatedConfig
        }
      });
    }

    return NextResponse.json({ success: true, message: 'Configurações atualizadas com sucesso.' }, { status: 200 });
  } catch (error: any) {
    console.error('[Config POST Error]', error);
    return NextResponse.json({ error: 'Erro ao salvar configurações', details: error.message }, { status: 500 });
  }
}
