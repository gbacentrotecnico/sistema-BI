# Event Store (SSOT da Inteligência)

Toda mutação no sistema gera um registro na tabela `Evento`.

- **Regra Básica**: Tabela *Append-Only*. Nunca faça `UPDATE` ou `DELETE` nesta tabela.
- **Agregação**: O evento diz *o que* aconteceu (`tipo: CONVERSATION_CREATED`), com *qual agregado* (`aggregate_type: CONVERSATION`, `aggregate_id: 123`).
- **Rastreabilidade**: `trace_id` original do Webhook é propagado. Assim, o erro em um pipeline ERP pode ser cruzado com o Evento na UI.
- **Versão Tripla**: Cada evento possui `schema_version` (prisma struct), `aggregate_version` (evolução do negócio) e `integration_version` (ex: Chatwoot V2/V3).
