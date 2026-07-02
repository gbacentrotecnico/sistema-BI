/**
 * DTOs puros do domínio.
 * Estes objetos JAMAIS devem conter nomenclaturas de integrações externas
 * como "Chatwoot", "RDStation", "ERP", etc.
 */

export interface ConversationDTO {
  externalId: string;
  inboxReference: string;
  contactReference: string;
  labels: string[];
  startedAt: Date;
}

export interface MessageDTO {
  externalId: string;
  conversationReference: string;
  senderType: 'AGENT' | 'CONTACT' | 'BOT' | 'SYSTEM';
  messageType: 'INCOMING' | 'OUTGOING' | 'TEMPLATE';
  content: string | null;
  attachmentsUrl: string[];
  createdAt: Date;
  rawPayload: any; // Utilizado para preparação IA
}

export interface ContactDTO {
  externalId: string;
  phone: string | null;
  name: string | null;
}
