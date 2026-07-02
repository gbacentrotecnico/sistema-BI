import { parseChatwootPayload } from '@/parsers/chatwoot.parser';
import { normalizePhone } from '@/normalizers/phone.normalizer';
import { normalizeLabels } from '@/normalizers/labels.normalizer';
import { validateChatwootEvent } from '@/validators/chatwoot.validator';

/**
 * O IntegrationAdapter é a porta de entrada lógica após o roteamento.
 * Ele encadeia o pipeline: Parser -> Normalizer -> Validator -> Command Factory -> Service
 */
export const processChatwootEvent = async (payload: any, traceId: string) => {
  // 1. Parser (Tradução pura)
  const parsed = parseChatwootPayload(payload);

  // 2. Normalizer (Limpeza)
  const normalizedPhone = normalizePhone(parsed.rawPhone);
  const normalizedLabels = normalizeLabels(parsed.rawLabels);

  const normalizedEvent = {
    ...parsed,
    phone: normalizedPhone,
    labels: normalizedLabels
  };

  // 3. Validator (Regras de consistência do domínio)
  const isValid = validateChatwootEvent(normalizedEvent);
  
  if (!isValid.success) {
    throw new Error(`Validation failed: ${isValid.errors.join(', ')}`);
  }

  // 4. Transformação em Commands e Delegação para os Services
  // (Nesta Sprint 1 simularemos apenas o log final)
  
  if (normalizedEvent.externalEventName === 'conversation_created') {
    // const command = CreateConversationCommand.from(normalizedEvent);
    // await ConversationService.handleCreate(command, traceId);
  }

  // Se tudo passar sem throw, o processo termina com sucesso.
};
