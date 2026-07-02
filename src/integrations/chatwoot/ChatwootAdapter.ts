import { IIntegrationAdapter } from '../IIntegrationAdapter';
import { RawEvent } from '@prisma/client';
import { ChatwootParser } from './ChatwootParser';
import { UpsertContactCommand } from '@/commands/customer/UpsertContactCommand';
import { UpsertConversationCommand } from '@/commands/conversation/UpsertConversationCommand';
import { CreateMessageCommand } from '@/commands/message/CreateMessageCommand';
import { Logger } from '@/shared/logger';

export class ChatwootAdapter implements IIntegrationAdapter {
  async processEvent(rawEvent: RawEvent): Promise<void> {
    const payload = rawEvent.payload_json as any;

    switch (rawEvent.event_type) {
      case 'conversation_created':
      case 'conversation_updated':
      case 'conversation_status_changed': {
        // 1. Extrair
        const contactData = ChatwootParser.parseContact(payload);
        const convData = ChatwootParser.parseConversation(payload);

        // 2. Executar atomicamente via Comandos Seguros (UPSERT)
        const cliente = await UpsertContactCommand.execute({
          name: contactData.name,
          phone_number: contactData.phone_number,
          chatwoot_id: contactData.id
        });

        await UpsertConversationCommand.execute({
          chatwoot_id: convData.id!,
          inbox_id: convData.inbox_id,
          status: convData.status,
          cliente_id: cliente.id,
          created_at: convData.created_at
        });

        break;
      }
      
      case 'message_created':
      case 'message_updated': {
        // 1. Extrair os 3 níveis
        const contactData = ChatwootParser.parseContact(payload);
        const convData = ChatwootParser.parseConversation(payload);
        const msgData = ChatwootParser.parseMessage(payload);

        // 2. Integridade Relacional: Cliente -> Conversa -> Mensagem
        const cliente = await UpsertContactCommand.execute({
          name: contactData.name,
          phone_number: contactData.phone_number,
          chatwoot_id: contactData.id
        });

        const conversa = await UpsertConversationCommand.execute({
          chatwoot_id: convData.id || msgData.conversation_id!,
          inbox_id: convData.inbox_id,
          status: convData.status,
          cliente_id: cliente.id,
          created_at: convData.created_at
        });

        if (msgData.id) {
          await CreateMessageCommand.execute({
            chatwoot_message_id: msgData.id,
            conversation_id: conversa.id,
            content: msgData.content,
            message_type: msgData.message_type,
            is_private: msgData.is_private,
            sender_type: msgData.sender_type,
            payload_json: payload
          });
        }

        break;
      }

      default:
        Logger.info(`[ChatwootAdapter] Evento ignorado ou não suportado: ${rawEvent.event_type} (ID: ${rawEvent.id})`);
        break;
    }
  }
}
