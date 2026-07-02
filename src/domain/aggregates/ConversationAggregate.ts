export class ConversationAggregate {
  constructor(
    public readonly externalId: string,
    public readonly inboxReference: string,
    public readonly contactReference: string,
    public readonly labels: string[],
    public readonly startedAt: Date,
    public readonly traceId: string,
    public readonly schemaVersion: number = 1,
    public readonly aggregateVersion: number = 1,
    public readonly integrationVersion: number = 1
  ) {}

  /**
   * Valida se a conversa possui os requisitos mínimos para existir.
   */
  isValid(): boolean {
    return !!this.externalId && !!this.inboxReference && !!this.contactReference;
  }
}
