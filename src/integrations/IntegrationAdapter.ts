import { RawEvent } from '@prisma/client';
import { IntegrationRegistry } from './IntegrationRegistry';

export interface IntegrationAdapter {
  process(event: RawEvent): Promise<void>;
}

export const processRawEvent = async (event: RawEvent): Promise<void> => {
  const adapter = IntegrationRegistry.get(event.source);
  
  if (!adapter) {
    throw new Error(`No adapter registered for source: ${event.source}`);
  }

  await adapter.processEvent(event);
};
