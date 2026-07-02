import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/config/prisma';
import { Logger } from '@/shared/logger';
import { IdempotencyService } from '@/services/idempotency.service';

export async function POST(request: Request) {
  const startTime = Date.now();
  let payloadJson;
  let headersJson;
  
  try {
    payloadJson = await request.json();
    headersJson = Object.fromEntries(request.headers.entries());
    
    // Gerar um Hash SHA256 do payload para garantir idempotência em payloads exatamente iguais
    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(payloadJson)).digest('hex');
    
    const context = {
      source: 'CHATWOOT',
      integration: 'Webhook',
      event: payloadJson?.event || 'unknown',
    };

    Logger.info('Receiving Chatwoot webhook', context);

    // 1. Busca a Integração Chatwoot configurada (hardcoded 1 para MVP, mas deveria ser query)
    let integration = await prisma.integration.findFirst({ where: { tipo: 'CHATWOOT' } });
    if (!integration) {
      integration = await prisma.integration.create({
        data: { nome: 'Chatwoot Default', tipo: 'CHATWOOT', status: 'ACTIVE' }
      });
    }

    // 2. Registra o WebhookLog no estado PENDING
    const traceId = crypto.randomUUID();
    
    // Idempotência
    const externalId = payloadJson?.id ? String(payloadJson.id) : undefined;
    const isDuplicate = await IdempotencyService.checkDuplicate({
      integration: 'CHATWOOT',
      eventType: context.event,
      externalId,
      payloadHash
    });

    // 2. Registra RawEvent (SSOT) garantindo que nunca existirá mutação nesta fase
    const rawEvent = await prisma.rawEvent.create({
      data: {
        integration_id: integration.id,
        source: 'CHATWOOT',
        event_type: context.event,
        external_id: externalId,
        payload_json: payloadJson,
        headers_json: headersJson,
        trace_id: traceId,
        status: isDuplicate ? 'PROCESSED' : 'PENDING'
      }
    });

    if (isDuplicate) {
      Logger.warn('Webhook duplicado interceptado na origem', { ...context, traceId });
      
      // Cria WebhookLog mas não lança o worker
      await prisma.webhookLog.create({
        data: {
          raw_event_id: rawEvent.id,
          source: 'CHATWOOT',
          event: context.event,
          payload_hash: payloadHash,
          headers_json: headersJson,
          payload_json: payloadJson,
          status: 'DUPLICATE',
          trace_id: traceId,
          http_status: 200,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
        }
      });

      return NextResponse.json({ message: 'Idempotency caught duplicate request' }, { status: 200 });
    }

    // 3. Registra a trilha de Auditoria (WebhookLog)
    await prisma.webhookLog.create({
      data: {
        raw_event_id: rawEvent.id,
        source: 'CHATWOOT',
        event: context.event,
        payload_hash: payloadHash,
        headers_json: headersJson,
        payload_json: payloadJson,
        status: 'PENDING',
        trace_id: traceId,
        http_status: 200,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      }
    });

    // 4. Fast HTTP 200 Response.
    // Nenhuma regra de negócio é processada aqui. O Worker assumirá o RawEvent.
    Logger.info('Webhook recorded successfully as RawEvent', context, Date.now() - startTime);
    return NextResponse.json({ success: true, trace_id: traceId }, { status: 200 });

  } catch (err) {
    Logger.error('Critical failure in Chatwoot API Route', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
