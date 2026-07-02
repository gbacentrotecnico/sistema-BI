import { IIntegrationAdapter } from './IIntegrationAdapter';
import { AdapterNotFoundError } from '@/errors/AdapterNotFoundError';
import { Logger } from '@/shared/logger';

class Registry {
  private adapters = new Map<string, IIntegrationAdapter>();

  register(provider: string, adapter: IIntegrationAdapter) {
    if (this.adapters.has(provider)) {
      Logger.warn(`Adapter for ${provider} is being overwritten.`);
    }
    this.adapters.set(provider, adapter);
    Logger.info(`IntegrationAdapter registered: ${provider}`);
  }

  get(provider: string): IIntegrationAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new AdapterNotFoundError(provider);
    }
    return adapter;
  }
}

export const IntegrationRegistry = new Registry();
