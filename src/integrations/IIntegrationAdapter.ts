import { RawEvent } from '@prisma/client';

export interface IIntegrationAdapter {
  /**
   * Processa o RawEvent de forma agnóstica.
   * O adapter é responsável por validar e despachar Commands de Domínio.
   */
  processEvent(rawEvent: RawEvent): Promise<void>;
}
