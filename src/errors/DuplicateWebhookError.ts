export class DuplicateWebhookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateWebhookError';
  }
}
