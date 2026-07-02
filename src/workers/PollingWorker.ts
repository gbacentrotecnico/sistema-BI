import { WorkerEngine } from './WorkerEngine';
import { prisma } from '@/config/prisma';
import { Logger } from '@/shared/logger';
// O orquestrador central que roteará o processamento
import { processRawEvent } from '@/integrations/IntegrationAdapter';

export class PollingWorker implements WorkerEngine {
  private isRunning = false;
  private intervalMs: number;

  constructor(intervalMs: number = 5000) {
    this.intervalMs = intervalMs;
  }

  async start(): Promise<void> {
    this.isRunning = true;
    Logger.info('PollingWorker started', { worker: 'PollingWorker' });

    // Roda em loop contínuo enquanto isRunning = true
    while (this.isRunning) {
      try {
        await this.pollAndProcess();
      } catch (err) {
        Logger.error('Critical failure in PollingWorker loop. Queue will NOT stop.', err);
      }
      
      // Delay entre as buscas
      await new Promise(res => setTimeout(res, this.intervalMs));
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    Logger.info('PollingWorker gracefully stopping...', { worker: 'PollingWorker' });
  }

  getStatus() {
    return { isRunning: this.isRunning, type: 'PollingWorker' };
  }

  /**
   * Busca eventos pendentes (um a um para evitar concorrência no MVP)
   * e processa de forma resiliente.
   */
  private async pollAndProcess(): Promise<void> {
    // 1. Busca o evento mais antigo pendente
    const event = await prisma.rawEvent.findFirst({
      where: { processed: false },
      orderBy: { received_at: 'asc' }
    });

    if (!event) return;

    const startTime = Date.now();
    Logger.info(`Processing RawEvent ${event.id}`, { 
      traceId: event.trace_id || undefined, 
      integration: event.source, 
      event: event.event_type 
    });

    try {
      // 2. Delega para a Factory Central de Adapters
      await processRawEvent(event);

      // 3. Sucesso: marca como processado
      await prisma.rawEvent.update({
        where: { id: event.id },
        data: { 
          processed: true, 
          processed_at: new Date() 
        }
      });
      
      // Atualiza também o WebhookLog para tracking rápido
      await prisma.webhookLog.updateMany({
        where: { id: event.webhook_log_id },
        data: { status: 'PROCESSED', processed_at: new Date() }
      });

      Logger.info(`RawEvent ${event.id} successfully processed`, { traceId: event.trace_id || undefined }, Date.now() - startTime);

    } catch (processError) {
      // 4. Falha: Cria DeadLetter e move o erro, NUNCA derruba o loop
      Logger.error(`Failed to process RawEvent ${event.id}. Sending to DeadLetter.`, processError, { traceId: event.trace_id || undefined });

      const errorMessage = processError instanceof Error ? processError.message : String(processError);
      const stacktrace = processError instanceof Error ? processError.stack : undefined;

      await prisma.deadLetter.create({
        data: {
          raw_event_id: event.id,
          reason: errorMessage,
          last_error: errorMessage,
          stacktrace,
          worker_name: 'PollingWorker',
          payload_json: event.payload_json as any,
          retry_count: 0
        }
      });

      // Marca o RawEvent como processado para não cair no loop infinito
      // O reprocessamento acontecerá via tela lendo a DeadLetter
      await prisma.rawEvent.update({
        where: { id: event.id },
        data: { processed: true, processed_at: new Date() }
      });

      await prisma.webhookLog.updateMany({
        where: { id: event.webhook_log_id },
        data: { status: 'FAILED' }
      });
    }
  }
}
