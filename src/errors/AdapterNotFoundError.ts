export class AdapterNotFoundError extends Error {
  constructor(provider: string) {
    super(`No integration adapter registered for provider: ${provider}`);
    this.name = 'AdapterNotFoundError';
  }
}
