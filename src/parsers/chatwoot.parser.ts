import { ConversationDTO, ContactDTO, MessageDTO } from '@/dtos/domain.dtos';
import { normalizePhone } from '@/normalizers/phone.normalizer';
import { normalizeLabels } from '@/normalizers/labels.normalizer';
import { normalizeDate } from '@/normalizers/date.normalizer';

export interface ChatwootRawPayload {
  event?: string;
  id?: number | string;
  conversation_id?: number | string;
  contact?: {
    id?: number;
    phone_number?: string;
    name?: string;
  };
  messages?: Array<any>;
  inbox_id?: number;
  assignee_id?: number;
  labels?: string[];
  created_at?: number;
}

export const parseChatwootEvent = (payload: any): { 
  contact: ContactDTO | null, 
  conversation: ConversationDTO | null 
} => {
  const rawPayload = payload as ChatwootRawPayload;

  const contact: ContactDTO | null = rawPayload.contact?.id ? {
    externalId: String(rawPayload.contact.id),
    phone: normalizePhone(rawPayload.contact.phone_number),
    name: rawPayload.contact.name || null
  } : null;

  const conversation: ConversationDTO | null = rawPayload.id ? {
    externalId: String(rawPayload.id),
    inboxReference: String(rawPayload.inbox_id),
    contactReference: String(rawPayload.contact?.id),
    labels: normalizeLabels(rawPayload.labels),
    startedAt: normalizeDate(rawPayload.created_at ? rawPayload.created_at * 1000 : new Date()) || new Date()
  } : null;

  return { contact, conversation };
};
