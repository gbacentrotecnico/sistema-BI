export class ChatwootParser {
  static parseContact(payload: any) {
    const contact = payload?.sender || payload?.meta?.sender || payload;
    return {
      id: contact?.id ? String(contact.id) : undefined,
      name: contact?.name || 'Desconhecido',
      phone_number: contact?.phone_number || undefined,
    };
  }

  static parseConversation(payload: any) {
    // Alguns webhooks mandam os dados na raiz, outros dentro de 'conversation'
    const conv = payload?.conversation || payload;
    return {
      id: conv?.id ? String(conv.id) : undefined,
      inbox_id: conv?.inbox_id ? String(conv.inbox_id) : undefined,
      status: conv?.status || 'open',
      assignee_id: conv?.meta?.assignee?.id ? String(conv?.meta?.assignee?.id) : undefined,
      created_at: conv?.created_at ? new Date(conv.created_at * 1000) : new Date(),
    };
  }

  static parseMessage(payload: any) {
    return {
      id: payload?.id ? String(payload.id) : undefined,
      conversation_id: payload?.conversation?.id ? String(payload.conversation.id) : String(payload?.conversation_id),
      content: payload?.content || '',
      message_type: payload?.message_type, // 0 = incoming (contact), 1 = outgoing (agent), 2 = template
      is_private: payload?.private || false,
      sender_type: payload?.sender_type || 'Unknown'
    };
  }
}
