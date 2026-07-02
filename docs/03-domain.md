# Domínio (Core) e Entidades

O Domínio reflete o negócio Abucci e ignora provedores externos.

- **Cliente**: Entidade suprema.
- **Inbox/Loja**: Estrutura física e lógica.
- **Tele**: A força de vendas, dona de conversões e oportunidades.
- **Conversa**: Agrega o SLA de atendimento (`first_agent_reply_at`, `closed_at`). Calculado ativamente pelos Adapters (e não em relatórios batch).
- **Mensagem**: Célula mínima de contato, contendo flag `direction` e preparação IA (`embedding_status`).
- **Oportunidade**: A conversão propriamente dita com Cupom/Faturamento.

Repositórios recebem APENAS instâncias destas classes de Domínio (Aggregates).
