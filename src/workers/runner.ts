import { WorkerEngine } from './WorkerEngine';
import { Logger } from '@/utils/logger';
import { prisma } from '@/config/prisma';
import '@/integrations/chatwoot/ChatwootAdapter'; // Carrega para garantir registro, caso usemos decoradores ou auto-registro (como vamos simplificar, injetaremos aqui)
import { IntegrationRegistry } from '@/integrations/IntegrationRegistry';
import { ChatwootAdapter } from '@/integrations/chatwoot/ChatwootAdapter';

// Registro manual para garantir que o adaptador esteja disponível
IntegrationRegistry.register('CHATWOOT', new ChatwootAdapter());

const engine = new WorkerEngine('NodeDaemon-01');

// Controle de graceful shutdown
let isRunning = true;

async function start() {
  Logger.worker('Worker iniciado. Aguardando eventos...');
  
  while (isRunning) {
    try {
      const processedCount = await engine.processPendingEvents(50);
      
      if (processedCount > 0) {
        // Se processou, dá um respiro rápido e continua imediatamente
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        // Se a fila está vazia, dorme mais tempo para economizar CPU/DB
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error: any) {
      Logger.error(`Falha crítica no loop do worker: ${error.message}`);
      // Em caso de erro fatal (banco caiu), dorme para não gerar loop infinito de exceções
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  Logger.worker('Loop do Worker encerrado pacificamente.');
  // Desconectar o prisma graciosamente
  await prisma.$disconnect();
  process.exit(0);
}

// Intercepta SIGINT (Ctrl+C) e SIGTERM (Docker stop)
function handleShutdown(signal: string) {
  Logger.warn(`Sinal de parada recebido (${signal}). Iniciando Graceful Shutdown... aguarde o fim do lote atual.`);
  isRunning = false;
  
  // Timeout de segurança: Se demorar mais de 30s para fechar pacificamente, força
  setTimeout(() => {
    Logger.error('Forçando encerramento após timeout do Graceful Shutdown.');
    process.exit(1);
  }, 30000);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

start();
