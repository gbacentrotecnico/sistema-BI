# Brainstorming: Sistema de BI (Central de Inteligência Grupo Abucci)

**Data da Sessão:** 01/06/2026
**Agente:** Orchestrator (Brainstorming Skill)

## 1. Visão Geral e Entendimento Inicial
O objetivo do projeto é desenvolver uma plataforma web de Business Intelligence (BI) privada e customizada. Inicialmente baseada na leitura de planilhas do Google Sheets com dados de relatórios de tráfego pago (Meta Ads), o sistema garantirá segurança (acesso por login), autonomia tecnológica e alta performance no carregamento (< 2s) utilizando um cache de dados em um banco de dados local.

## 2. Decisões Arquiteturais e Evolutivas Discutidas

### 2.1. O "Cérebro" de Dados: PostgreSQL
*   **Decisão:** Utilizaremos um banco de dados relacional **PostgreSQL** para armazenar os dados.
*   **Motivo:** O projeto visa evoluir para uma Central de Inteligência que englobará Vendas, RH, Estoque e Compras. O PostgreSQL atuará como um Data Warehouse, permitindo cruzar essas diferentes frentes de forma confiável (ex: Custo por Conversa de Marketing cruzado com o Ticket Médio de Vendas no ERP).

### 2.2. Extração em Tempo Real: API Oficial da Meta (Bypass do Adveronix)
*   **Problema:** O uso do Adveronix limitava as atualizações a apenas 1 vez por dia, e manter os dados no Google Sheets como etapa intermediária impedia a escalabilidade em tempo real e gerava risco de manipulações indevidas na planilha.
*   **Solução Estratégica:** O backend do nosso sistema se conectará **diretamente à API Oficial da Meta (Graph API)**.
*   **Como vai funcionar:** 
    * Um Cron Job no nosso servidor rodará a cada 1 hora (ou até menos tempo).
    * O servidor puxa os dados direto da conta de anúncios do Facebook/Instagram e injeta diretamente nas tabelas do PostgreSQL.
    * O Google Sheets passará a ser utilizado **apenas para inputs manuais** por humanos (como lançamento de metas ou despesas não rastreáveis).

## 3. Visão de Futuro (Fase 2+)
*   **Unificação de Dados:** Cruzamento entre Marketing, Vendas, RH e Estoque no mesmo ecossistema (PostgreSQL).
*   **Alertas via IA:** Integração de um motor de Inteligência Artificial para ler o banco de dados e gerar alertas proativos.
    *   *Exemplo de alerta planejado:* "O CTR do anúncio caiu, o custo do lead subiu e o estoque do produto está baixo. Sugestão: Pausar campanha."

## 4. Próximos Passos (Para a próxima sessão)
*   Finalizar a definição das tecnologias de Backend (Node.js/Python) e Frontend.
*   Aprovar e atualizar o PRD oficial com a nova arquitetura (API da Meta no lugar do Google Sheets para os relatórios de Ads).
*   Começar a desenhar a modelagem do banco de dados (Tabelas do Postgres).
