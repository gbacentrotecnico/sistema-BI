import { ConversationAggregate } from '../../domain/aggregates/ConversationAggregate';
import { ConversationRepository } from '../../repositories/conversation.repository';
import { CreateConversationCommand } from '../../commands/conversation.commands';
import { prisma } from '@/config/prisma';
import { Logger } from '@/shared/logger';

export class ConversationService {
  /**
   * Transforma o Command em Aggregate e orquestra a persistência
   * tanto da Entidade CORE quanto do Event Store.
   */
  static async handleCreate(command: CreateConversationCommand): Promise<void> {
    // 1. Cria o Aggregate Root
    const aggregate = new ConversationAggregate(
      command.chatwootConversationId,
      command.chatwootInboxId,
      command.contactPhone || 'unknown',
      command.labels,
      command.startedAt,
      command.traceId
    );

    if (!aggregate.isValid()) {
      throw new Error('Invalid Conversation Aggregate');
    }

    // 2. Resolve dependências de negócio
    const inbox = await prisma.inbox.findUnique({ where: { chatwoot_inbox_id: aggregate.inboxReference }});
    if (!inbox) throw new Error(`Inbox not found: ${aggregate.inboxReference}`);

    const cliente = await prisma.cliente.findFirst(); // Mock simples, na vida real busca por telefone
    if (!cliente) throw new Error('Cliente not found');

    // 3. Persiste via Repository (Nenhuma chamada Prisma direta na entidade alvo)
    const conversa = await ConversationRepository.create(aggregate, cliente.id, inbox.id);

    // 4. Salva no Event Store (SSOT) garantindo a imutabilidade do acontecimento
    await prisma.evento.create({
      data: {
        aggregate_type: 'CONVERSATION',
        aggregate_id: conversa.id.toString(),
        tipo: 'CONVERSATION_CREATED',
        schema_version: aggregate.schemaVersion,
        aggregate_version: aggregate.aggregateVersion,
        integration: 'CHATWOOT',
        origin: 'WORKER',
        trace_id: command.traceId,
        conversa_id: conversa.id,
        cliente_id: cliente.id,
        loja_id: inbox.loja_id,
        payload_json: JSON.parse(JSON.stringify(aggregate)),
        ocorrido_em: aggregate.startedAt,
        worker_name: 'PollingWorker',
        processing_time_ms: 0, // calculado no adapter
      }
    });

    Logger.info(`Conversation ${conversa.id} created and event logged (Trace: ${command.traceId})`);
  }
}
