import { prisma } from '@/config/prisma';
import { generatePayloadHash } from '@/utils/hash';
import { DuplicateWebhookError } from '@/errors/DuplicateWebhookError';
import crypto from 'crypto';

export class WebhookIngestionService {
  /**
   * Ponto de entrada (SSOT) para qualquer webhook recebido.
   * Não processa regras de domínio. Apenas persiste o RawEvent e o Log.
   */
  async processInboundWebhook(provider: string, payload: any, ip: string = 'unknown', userAgent: string = 'unknown'): Promise<number> {
    const hash = generatePayloadHash(payload);
    
    // 1. Regra de Idempotência: Se o hash já existe no WebhookLog, rejeita (Duplicate)
    const existingLog = await prisma.webhookLog.findUnique({
      where: { payload_hash: hash }
    });

    if (existingLog) {
      throw new DuplicateWebhookError(`Webhook já processado. Hash: ${hash}`);
    }

    // 2. Localiza a Integração configurada (ex: CHATWOOT)
    const integration = await prisma.integration.findFirst({
      where: { tipo: provider }
    });

    if (!integration) {
      throw new Error(`Integration provider não encontrado no banco: ${provider}`);
    }

    // Identifica o tipo de evento (ex: message_created) de acordo com o padrão esperado
    const eventType = payload?.body?.event || payload?.event || 'UNKNOWN_EVENT';
    const traceId = crypto.randomUUID();

    // 3. Persistência SSOT em Transação
    const rawEvent = await prisma.$transaction(async (tx) => {
      // a) Cria o Dado Bruto (RawEvent)
      const event = await tx.rawEvent.create({
        data: {
          integration_id: integration.id,
          source: provider,
          event_type: eventType,
          payload_json: payload,
          status: 'PENDING',
          trace_id: traceId,
        }
      });

      // b) Cria a Trilha de Auditoria (WebhookLog)
      await tx.webhookLog.create({
        data: {
          raw_event_id: event.id,
          source: provider,
          event: eventType,
          payload_hash: hash,
          payload_json: payload,
          status: 'PENDING',
          trace_id: traceId,
          http_status: 200,
          ip,
          user_agent: userAgent
        }
      });

      return event;
    });

    return rawEvent.id;
  }
}

export const webhookIngestionService = new WebhookIngestionService();
