import { PollingWorker } from './PollingWorker';
import { Logger } from '../shared/logger';

/**
 * Ponto de entrada (Entrypoint) exclusivo para rodar o Worker de forma standalone.
 * Desacoplado da API Web do Next.js.
 */
async function run() {
  Logger.info('Initializing Worker Runner...');

  // Pode-se injetar qualquer WorkerEngine aqui futuramente (ex: BullMQWorker)
  const worker = new PollingWorker(3000); // Poll a cada 3 segundos

  // Lidar com Graceful Shutdown (SIGINT/SIGTERM)
  process.on('SIGINT', async () => {
    Logger.info('Received SIGINT. Stopping worker...');
    await worker.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    Logger.info('Received SIGTERM. Stopping worker...');
    await worker.stop();
    process.exit(0);
  });

  try {
    await worker.start();
  } catch (err) {
    Logger.error('Fatal error in Worker Runner', err);
    process.exit(1);
  }
}

// Inicia o processo apenas se for executado diretamente (ex: via ts-node)
if (require.main === module) {
  run();
}

export { run };
