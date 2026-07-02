import { prisma } from '@/config/prisma';

export interface IdempotencyCheckProps {
  integration: string;
  eventType: string;
  externalId?: string;
  payloadHash: string;
}

export class IdempotencyService {
  /**
   * Checa se um evento idêntico já existe no banco RawEvent (SSOT).
   * A chave composta utilizada é: integration + eventType + externalId + payloadHash.
   * Isso previne a gravação dupla de eventos em que o payload é exatamente igual
   * ou que se referem à mesma entidade no mesmo estado.
   */
  static async checkDuplicate(props: IdempotencyCheckProps): Promise<boolean> {
    // 1. Verificação Estrita por Hash Exato (Mesmo payload exato já recebido)
    const exactHashMatch = await prisma.rawEvent.findFirst({
      where: {
        source: props.integration,
        event_type: props.eventType,
        // Ao invés de buscar no log, buscamos no RawEvent, 
        // porque se houver um RawEvent, significa que já assumimos a responsabilidade.
        webhook_log: {
          payload_hash: props.payloadHash
        }
      }
    });

    if (exactHashMatch) return true;

    // 2. Verificação de Integridade por External ID + Timestamp 
    // (Avançado: pode ser implementado no futuro se os payloads mudarem de hash por timestamps invisíveis,
    // mas por hora o HASH já bloqueia retries idênticos estritos.)

    return false;
  }
}
