# Chatwoot Integration

A integração padrão atual da Sprint 1A/B.
Ela obedece a uma Matriz Estrita de Eventos do Chatwoot (o `event_type`):
- `conversation_created` -> `parseConversation` -> `CreateConversationCommand`
- `message_created` -> `parseMessage` -> `CreateMessageCommand`
- `conversation_status_changed` -> `parseConversation` -> `ChangeConversationStatusCommand`

A Idempotência é barrada estritamente (200 OK sem processar). Os DTOs emitidos pelo parser são limpos do formato "Chatwoot", entrando no domínio como `MessageDTO` padronizado.
