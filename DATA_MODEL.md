# Modelagem de Domínio V3 (Final & Congelado): Grupo Abucci

Este documento define a versão final do modelo de dados focado nas regras de negócio para Atendimento x Conversão, rigorosamente revisado para suportar milhões de linhas, integrações de IA e extrema precisão financeira.

---

## 1. Alterações Realizadas (Revisão Arquitetural V3) e Justificativas Técnicas

### 1.1 Entidade Cupom: Remoção do `cliente_id`
*   **Ação:** O campo `cliente_id` foi excluído de `Cupom`.
*   **Justificativa:** Redundância estrutural. Uma vez que o Cupom possui relação estrita 1:1 com a Oportunidade, e a Oportunidade já possui uma FK obrigatória de Cliente, acessar o cliente de um cupom tornou-se trivial através do join (`cupom.oportunidade.cliente`). Remover essa FK evita anomalias (ex: um Cupom ter cliente X e sua Oportunidade ter cliente Y).

### 1.2 Auditoria: Inclusão de `created_by` e `updated_by`
*   **Ação:** Adicionados campos de string `created_by` e `updated_by` nas tabelas `Oportunidade` e `Cupom`.
*   **Justificativa:** Oportunidades (status de conversão) e Cupons muitas vezes sofrem manipulação e ajustes manuais ou por meio de fluxos auxiliares (como troca de datas, edições gerenciais). Em um ecossistema com 100 teles, rastrear "quem alterou" um ticket ou status manualmente é crucial para a V1, evitando acusações infundadas de adulteração de conversão.

### 1.3 Escalabilidade do BI: Criação de `@@index`
*   **Ação:** Adicionamos índices nas colunas `aprovado_em`, `agendado_em`, `status`, `tele_conversao_id`, `loja_id`, `tele_responsavel_id`, `loja_origem_id`, e `iniciado_em`.
*   **Justificativa:** O PostgreSQL, sem índices, escaneia a tabela inteira (Seq Scan). Num cenário futuro com milhões de conversas, gerar um dashboard agrupado por mês e loja travaria o servidor. Os índices garantem respostas em milissegundos, independente do volume.

### 1.4 Padronização de Datas
*   **Ação:** Os nomes foram consolidados para `_em` (ex: `data_aprovacao` virou `aprovado_em`, `data_agendada` virou `agendado_em`). Mantivemos `created_at` e `updated_at` (padrões nativos que todo ORM lida bem).
*   **Justificativa:** Consistência léxica. `aprovado_em` / `agendado_em` / `iniciado_em` formam um padrão semântico claro, facilitando para novos desenvolvedores entenderem o que representa um evento no tempo.

### 1.5 Tipos Monetários Precisos
*   **Ação:** O campo `valor_faturamento` mudou de `Float` para `Decimal @db.Decimal(10, 2)`.
*   **Justificativa:** O tipo `Float` no banco sofre do mal da precisão de ponto flutuante (ex: `0.1 + 0.2 = 0.30000000000000004`). Em BI, agregações pesadas de faturamento e comissões com `Float` gerariam centavos ou reais de divergência anual. O `Decimal(10,2)` força a precisão financeira absoluta no motor do banco.

### 1.6 Preparação para IA (Batch Processing)
*   **Ação:** A entidade `Conversa` recebeu os campos `ai_processado (Boolean)`, `ai_processado_em (DateTime?)` e `ai_resumo (Json?)`, além de um índice em `ai_processado`.
*   **Justificativa:** Processar IA em tempo real bloqueia os fluxos do Chatwoot. Com essa modelagem, estabelecemos o padrão "Batch": um Cron Job puxa apenas as conversas `ai_processado = false` (voando no banco graças ao índice!), manda para OpenAI, grava o JSON na coluna de resumo e marca o boolean como `true`. Zero gargalo, escalabilidade máxima.

### 1.7 Status da Oportunidade
*   **Ação:** Validado o enum (`AGENDADA`, `COMPARECEU`, `NO_SHOW`, `CANCELADA`).
*   **Justificativa:** Esse funil reflete a vida exata da mecânica de loja: o cliente marcou, o cliente foi, o cliente sumiu ou o cliente avisou ativamente que não ia. Não há necessidade de mais steps complexos (como EM_ANDAMENTO) que exijam micro-gestão das recepcionistas no MVP.

---

## 3. Por que o modelo V3 está 100% pronto para iniciar as Migrations?

Como arquiteto, a visão final deste diagrama me dá segurança para aprovar a primeira migration por três motivos essenciais:

1.  **Imutabilidade do Domínio:** As chaves estrangeiras (`loja`, `tele`, `cliente`) não têm mais pontas soltas. Retiramos as redundâncias (como a do Cupom), o que significa que o banco por si só garantirá a integridade referencial.
2.  **Preparado para "Read-Heavy":** Um sistema de BI tem como gargalo a **leitura** (SELECTs com SUM/GROUP BY). Como indexamos precisamente todos os campos de agregação, filtros e datas, não teremos que fazer uma refatoração traumática daqui a 2 anos adicionando tabelas agregadas para contornar lentidão.
3.  **Expansão Acoplada:** Se amanhã o Grupo Abucci quiser plugar um agente de Inteligência Artificial para responder o cliente, o campo `ai_processado` gerencia a fila. Se quiserem comissionamento financeiro, o `Decimal` no faturamento garante o centavo exato.

**Status Final:** O domínio está validado, enxuto e escalável. O código Prisma foi ajustado milimetricamente para isso. Prisma Migrations estão liberadas!
