/**
 * Represents the intention to create a new Conversation in the system.
 */
export class CreateConversationCommand {
  constructor(
    public readonly chatwootConversationId: string,
    public readonly chatwootInboxId: string,
    public readonly contactPhone: string | null,
    public readonly contactName: string | null,
    public readonly labels: string[],
    public readonly startedAt: Date,
    public readonly traceId: string
  ) {}

  /**
   * Factory method para criar o command a partir do objeto já normalizado e validado.
   */
  static fromNormalizedEvent(event: any, traceId: string): CreateConversationCommand {
    return new CreateConversationCommand(
      event.externalConversationId!,
      event.externalInboxId!,
      event.phone,
      event.rawName,
      event.labels,
      new Date(event.rawCreatedAt * 1000), // convertendo Unix Timestamp
      traceId
    );
  }
}
