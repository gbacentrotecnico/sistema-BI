# ADR: Decision Log

Registro das principais decisões de arquitetura e por quê.

## ADR-001: Padrão Event-Driven Invertido
**Status**: APROVADO
**Contexto**: A API original fazia queries no Prisma direto na rota.
**Decisão**: Ingestão recebe, grava `RawEvent`, depois `WebhookLog` e retorna `200`. Processamento vai para background (Polling/BullMQ).
**Consequência**: A latência de ingestão caiu para microssegundos. Nunca perde eventos.

## ADR-002: Repository Pattern para Aggregates
**Status**: APROVADO
**Contexto**: Serviços passavam JSON puro ou instâncias DTO pro Prisma.
**Decisão**: Prisma só deve receber Classes de Domínio (Aggregates) instanciadas.
**Consequência**: Evita poluição do DB e centraliza lógica de validação no agregado (`Aggregate.isValid()`).

## ADR-003: Versionamento Triplo
**Status**: APROVADO
**Decisão**: Toda entidade (e `Evento`) salva `schema_version`, `aggregate_version`, `integration_version`.
**Consequência**: Migração de dados futura será limpa, permitindo saber se a linha foi feita por um adapter legado (v1) ou moderno (v2).
