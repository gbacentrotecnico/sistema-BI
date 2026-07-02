import { prisma } from '@/config/prisma';
import { RawEvent } from '@prisma/client';
import { IntegrationRegistry } from '@/integrations/IntegrationRegistry';
import { Logger } from '@/utils/logger';

export class WorkerEngine {
  private workerName: string;

  constructor(workerName: string = 'default_worker') {
    this.workerName = workerName;
  }

  /**
   * Processa eventos PENDING em lote com controle atômico e tratamento de falhas isolado.
   */
  async processPendingEvents(batchSize: number = 50): Promise<number> {
    // 1. Busca e Lock Atômico (evita concorrência entre múltiplos containers)
    const lockedEvents = await prisma.$transaction(async (tx) => {
      // Utilizamos raw query para FOR UPDATE SKIP LOCKED
      // Casting explicito do Json para evitar conflitos de tipos, ou simplesmente retornamos IDs
      const rawEvents = await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM "RawEvent" 
        WHERE status = 'PENDING' 
        ORDER BY received_at ASC 
        LIMIT ${batchSize} 
        FOR UPDATE SKIP LOCKED
      `;

      if (rawEvents.length === 0) return [];

      const ids = rawEvents.map(e => e.id);

      // Marca como PROCESSING
      await tx.rawEvent.updateMany({
        where: { id: { in: ids } },
        data: { 
          status: 'PROCESSING', 
          processed_at: new Date() 
        }
      });

      // Retorna as entidades completas atualizadas
      return tx.rawEvent.findMany({
        where: { id: { in: ids } }
      });
    });

    if (lockedEvents.length === 0) {
      return 0;
    }

    Logger.worker(`[WorkerEngine] ${this.workerName} iniciando lote de ${lockedEvents.length} eventos.`);

    // 2. Iteração Segura
    for (const event of lockedEvents) {
      try {
        // Resolve a Integração 
        const adapter = IntegrationRegistry.get(event.source);
        
        // Dispara o processamento na camada de domínio
        await adapter.processEvent(event);

        // 3. Finalização Sucesso
        await prisma.rawEvent.update({
          where: { id: event.id },
          data: { status: 'PROCESSED' }
        });

      } catch (error: any) {
        Logger.error(`[WorkerEngine] Falha ao processar RawEvent ${event.id}: ${error.message}`);

        // 4. Falha e DeadLetter
        await prisma.$transaction(async (tx) => {
          await tx.rawEvent.update({
            where: { id: event.id },
            data: { 
              status: 'FAILED',
              last_error: error.message
            }
          });

          await tx.deadLetter.create({
            data: {
              raw_event_id: event.id,
              reason: error.message,
              stacktrace: error.stack,
              worker_name: this.workerName,
              payload_json: event.payload_json || {},
              resolved: false
            }
          });
        });
      }
    }

    return lockedEvents.length;
  }
}
