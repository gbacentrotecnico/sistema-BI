import { ParsedChatwootEvent } from '@/parsers/chatwoot.parser';

export interface ValidationResult {
  success: boolean;
  errors: string[];
}

/**
 * Valida a integridade do evento normalizado antes de transformá-lo em um Command.
 * Nenhuma regra de negócio de persistência deve existir aqui, apenas garantia
 * de contrato. Ex: ID não pode ser nulo para ConversationCreated.
 */
export const validateChatwootEvent = (event: ParsedChatwootEvent & { phone: string | null; labels: string[] }): ValidationResult => {
  const errors: string[] = [];

  if (!event.externalEventName || event.externalEventName === 'unknown') {
    errors.push('Event name is missing or unknown.');
  }

  // Exemplos de validações específicas por tipo de evento
  if (event.externalEventName.includes('conversation')) {
    if (!event.externalConversationId) {
      errors.push('Conversation events require externalConversationId.');
    }
    if (!event.externalInboxId) {
      errors.push('Conversation events require an inbox reference.');
    }
  }

  // Telefones malformados ou inexistentes num evento de criação de lead
  if (event.externalEventName === 'contact_created' && !event.phone) {
    errors.push('Contact creation requires a valid normalized phone number.');
  }

  return {
    success: errors.length === 0,
    errors
  };
};
