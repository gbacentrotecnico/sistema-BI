import { prisma } from '@/config/prisma';
import { MessageDirection, MessageDeliveryStatus } from '@prisma/client';

export class CreateMessageCommand {
  static async execute(data: {
    chatwoot_message_id: string;
    conversation_id: number;
    content: string;
    message_type?: number;
    is_private: boolean;
    sender_type: string;
    payload_json?: any;
  }) {
    if (!data.chatwoot_message_id) throw new Error('chatwoot_message_id é obrigatório para Mensagem');

    // message_type no Chatwoot: 0 = incoming, 1 = outgoing, 2 = template, 3 = activity
    const direction = data.message_type === 0 ? MessageDirection.INBOUND : MessageDirection.OUTBOUND;

    const mensagem = await prisma.mensagem.upsert({
      where: { chatwoot_message_id: data.chatwoot_message_id },
      update: {
        // Se a mensagem já existe, não precisamos alterar direção ou conteúdo bruto,
        // mas podemos registrar o payload mais recente ou mudar status
      },
      create: {
        chatwoot_message_id: data.chatwoot_message_id,
        conversation_id: data.conversation_id,
        content: data.content,
        direction: direction,
        delivery_status: MessageDeliveryStatus.DELIVERED,
        private: data.is_private,
        sender_type: data.sender_type,
        message_type: String(data.message_type),
        payload_json: data.payload_json
      }
    });

    return mensagem;
  }
}
