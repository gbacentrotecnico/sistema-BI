# Workers Topology

Para suportar escala corporativa, a abstração atual do `WorkerRunner` permite segregação no futuro (múltiplos containers).
Os Workers mapeados fisicamente (mesmo que ainda vazios) são:
1. `chatwoot.worker.ts`: Processa fila nativa do Chatwoot.
2. `erp.worker.ts`: Processa webhooks do ERP.
3. `metrics.worker.ts`: Calcula `MetricsSnapshot` em background de hora em hora.
4. `ai.worker.ts`: Consulta a tabela `AiJob` e chama OpenRouter.
5. `retry.worker.ts`: Varre a tabela `DeadLetter` reprocessando (onde `retry_count < 5` e `next_retry_at < now()`).
6. `cleanup.worker.ts`: Pode expurgar ou arquivar `WebhookLog` muito antigos após 1 ano.
