import { ConversationDTO } from '../dtos/domain.dtos';

export class StructuralValidator {
  static validateConversation(dto: ConversationDTO | null): { success: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!dto) {
      return { success: false, errors: ['DTO is null'] };
    }

    if (!dto.externalId) errors.push('Missing externalId');
    if (!dto.inboxReference) errors.push('Missing inboxReference');
    if (!dto.contactReference) errors.push('Missing contactReference');

    return {
      success: errors.length === 0,
      errors
    };
  }
}
