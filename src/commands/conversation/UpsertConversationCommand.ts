import { prisma } from '@/config/prisma';

export class UpsertConversationCommand {
  static async execute(data: {
    chatwoot_id: string;
    inbox_id?: string;
    status: string;
    cliente_id: number;
    created_at: Date;
  }) {
    if (!data.chatwoot_id) throw new Error('chatwoot_id é obrigatório para Conversa');

    // Recuperar ou criar Inbox de fallback
    let inbox = null;
    if (data.inbox_id) {
      inbox = await prisma.inbox.findUnique({ where: { chatwoot_inbox_id: data.inbox_id } });
    }

    if (!inbox) {
      // Pega a primeira loja genérica ou cria
      let loja = await prisma.loja.findFirst();
      if (!loja) {
        loja = await prisma.loja.create({ data: { codigo: 'DEFAULT', nome: 'Loja Padrão' } });
      }
      
      inbox = await prisma.inbox.upsert({
        where: { chatwoot_inbox_id: data.inbox_id || 'default_inbox' },
        update: {},
        create: {
          chatwoot_inbox_id: data.inbox_id || 'default_inbox',
          nome: `Inbox ${data.inbox_id || 'Default'}`,
          loja_id: loja.id
        }
      });
    }

    const conversa = await prisma.conversa.upsert({
      where: { chatwoot_id: data.chatwoot_id },
      update: {
        status_atual: data.status.toUpperCase(),
        updated_at: new Date(),
        // Exemplo de increment (pode ser gerido de outra forma, mas atende o request)
        quantidade_mensagens: { increment: 1 }
      },
      create: {
        chatwoot_id: data.chatwoot_id,
        cliente_id: data.cliente_id,
        inbox_id: inbox.id,
        status_atual: data.status.toUpperCase(),
        iniciado_em: data.created_at,
        quantidade_mensagens: 1
      }
    });

    return conversa;
  }
}
