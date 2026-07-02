# Arquitetura (V2 / Final)

Padrão: **Event-Driven CQRS + Repository Pattern**.

## Fluxo
1. **WebhookRoute**: Validação, Idempotência (Hash+ID), salva `RawEvent` (estado PENDING), salva `WebhookLog`, retorna HTTP 200.
2. **WorkerRunner**: Motor Node.js (não bloqueia Next.js) que escuta fila de `RawEvent`.
3. **IntegrationRegistry**: Identifica o Evento (`CHATWOOT`) e roteia para o `ChatwootAdapter`.
4. **Adapter**: Parser(JSON Instável -> DTO) -> Validador(DTO) -> Command(`CreateConversationCommand`).
5. **Service & Aggregate**: Executa o Domínio, chama o Repository e gera a Trilha de Auditoria no `Evento` (Event Store).
6. **DeadLetter**: Falhas de negócio ou infra isoladas caem aqui sem derrubar o loop de fila.
