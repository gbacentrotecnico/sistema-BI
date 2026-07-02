import { NextResponse } from 'next/server';
import { prisma } from '@/config/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = new URL(request.url);
    
    // integration_id via header ou query param
    let integrationIdStr = request.headers.get('x-integration-id') || url.searchParams.get('integration_id');
    
    // Fallback amigável caso não seja enviado no teste inicial
    if (!integrationIdStr) {
      const integration = await prisma.integration.findFirst({ where: { tipo: 'CHATWOOT' } });
      if (integration) {
        integrationIdStr = integration.id.toString();
      } else {
        return NextResponse.json({ error: 'integration_id é obrigatório (header x-integration-id ou param integration_id)' }, { status: 400 });
      }
    }

    const integration_id = parseInt(integrationIdStr, 10);
    const { source, event_type, payload_json } = body;

    if (!source || !event_type || !payload_json) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando: source, event_type, payload_json' }, { status: 400 });
    }

    const rawEvent = await prisma.rawEvent.create({
      data: {
        integration_id,
        source: source.toUpperCase(),
        event_type,
        payload_json,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ 
      success: true, 
      id: rawEvent.id,
      message: 'Webhook recebido com sucesso'
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Inbound Webhook Error]', error);
    return NextResponse.json({ status: 'error', message: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
