# Visão do Projeto: Plataforma de Inteligência Operacional

O Grupo Abucci não precisa de um Dashboard. Precisa de uma Plataforma de Inteligência Operacional corporativa capaz de processar milhões de eventos de múltiplas origens (Chatwoot, ERP, Meta Ads, etc.) em tempo real, fornecendo uma base única de verdade (Single Source of Truth - SSOT) para métricas de negócio e Inteligência Artificial.

## Princípios Core
1. **Nunca perder dados**: O RawEvent é a cópia irrefutável do parceiro.
2. **Alta Disponibilidade (Ingestão)**: O parceiro não pode esperar. HTTP 200 rápido e assíncrono.
3. **Imutabilidade**: O Domínio (Event Store) deve contar a história. Updates destrutivos são proibidos.
4. **Desacoplamento Absoluto**: O Domínio de negócio nunca sabe de onde a mensagem veio, apenas sabe qual foi o DTO e Command disparado.
