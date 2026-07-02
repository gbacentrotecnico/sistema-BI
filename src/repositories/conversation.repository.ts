import { prisma } from '@/config/prisma';
import { Conversa } from '@prisma/client';
import { ConversationAggregate } from '../domain/aggregates/ConversationAggregate';

/**
 * Repository encarregado exclusivamente de interagir com o Prisma.
 * Recebe APENAS Aggregates. Nenhuma regra de negócio reside aqui.
 */
export class ConversationRepository {
  static async create(aggregate: ConversationAggregate, clienteId: number, inboxId: number): Promise<Conversa> {
    return prisma.conversa.create({
      data: {
        chatwoot_id: aggregate.externalId,
        cliente_id: clienteId,
        inbox_id: inboxId,
        iniciado_em: aggregate.startedAt,
        etiquetas: aggregate.labels,
        created_by: 'WORKER',
        schema_version: aggregate.schemaVersion,
        aggregate_version: aggregate.aggregateVersion,
        integration_version: aggregate.integrationVersion
      }
    });
  }



  static async findByChatwootId(chatwootId: string): Promise<Conversa | null> {
    return prisma.conversa.findUnique({
      where: { chatwoot_id: chatwootId }
    });
  }

  static async updateSla(id: number, primeiraRespostaEm: Date, tempoPrimeiraResposta: number): Promise<Conversa> {
    return prisma.conversa.update({
      where: { id },
      data: {
        primeira_resposta_em: primeiraRespostaEm,
        tempo_primeira_resposta: tempoPrimeiraResposta
      }
    });
  }
}
