import { prisma } from '@/config/prisma';

export class DomainValidator {
  /**
   * Checa regras de negócio contra o banco de dados (CORE DOMAIN).
   * Ex: O inbox que veio do Webhook existe no nosso sistema?
   */
  static async validateInboxExists(inboxReference: string): Promise<boolean> {
    const inbox = await prisma.inbox.findUnique({
      where: { chatwoot_inbox_id: inboxReference }
    });

    return !!inbox;
  }
}
