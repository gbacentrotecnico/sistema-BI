# Integrações (Registry Pattern)

A Plataforma foi criada para evitar `if (source === 'CHATWOOT')` infinito nos Services.

Toda integração é registrada via `IntegrationRegistry.register()`. O banco guarda a tabela **Integration** parametrizável por DB (sem precisar de hardcode ou enums complexos para provedores, ex: Meta Ads 1, Meta Ads 2).

## Ciclo de Vida da Execução
Toda rodada pesada de processamento em batch via Worker é registrada em `IntegrationExecution`. Isto permite que analistas de BI digam: "O processamento ERP demorou 1.2s com 5 erros hoje".
