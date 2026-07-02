# Diagramas de Arquitetura Final - Sprint 1 (Versão Congelada)

Conforme sua última orientação para a IDE, antes de iniciarmos qualquer codificação do domínio, apresentamos os diagramas arquiteturais para validação final.

## 1. Diagrama de Fluxo e Camadas (CQRS/Event-Driven)

Este diagrama representa a jornada estrita e obrigatória de um dado ao entrar no sistema (via Webhook) até se tornar um registro consolidado no Banco de Dados.

```mermaid
graph TD
    %% Entradas Externas
    EXT_CHATWOOT[Chatwoot Webhook]
    EXT_ERP[ERP Webhook]

    %% Camada de API (Apenas Orquestração Inicial)
    subgraph API_LAYER [1. API Route Layer]
        API_CONTROLLER(Next.js App Router)
    end
    
    %% Camada RAW & Ingestão Segura
    subgraph INGESTION_LAYER [2. Ingestion & Audit Layer]
        WL[(WebhookLog)]
        RAW[(RawEvent)]
        DL[(DeadLetter)]
        IDEMP(Idempotency Service)
    end

    %% Camadas Puras (Sem Banco de Dados)
    subgraph PURE_LAYER [3. Transformation Layer - Pure Functions]
        PARSER(Parser)
        NORM(Normalizer)
        CMD(Command Factory)
    end

    %% Camada de Negócio
    subgraph DOMAIN_LAYER [4. Domain Services Layer]
        SVC(Domain Services)
    end

    %% Camada de Persistência Restrita
    subgraph DATA_LAYER [5. Repository Layer]
        REPO(Repositories)
    end
    
    %% Banco de Dados Core (SSOT)
    subgraph DB_LAYER [6. Core Database]
        DB_ENTITIES[(Domain Entities)]
        DB_EVENT[(Event Store - Imutável)]
    end

    %% Fluxo Feliz
    EXT_CHATWOOT --> API_CONTROLLER
    EXT_ERP --> API_CONTROLLER
    
    API_CONTROLLER -- Registra Requisição --> WL
    WL -- Verifica Hash Único --> IDEMP
    
    IDEMP -- Hash Inédito (Continua) --> RAW
    IDEMP -. Hash Duplicado (Aborta) .-> FIM((Fim))
    
    RAW -- Extrai Payload --> PARSER
    PARSER -- Converte p/ Objeto Interno --> NORM
    NORM -- Limpa (Fone, Datas, Enums) --> CMD
    CMD -- Gera Intenção (Ex: CreateConversation) --> SVC
    
    SVC -- Aplica Lógica (Aprova, Vincula) --> REPO
    REPO -- Prisma/SQL --> DB_ENTITIES
    REPO -- Grava Rastro Imutável --> DB_EVENT
    
    %% Tratamento de Falhas (DeadLetter)
    PARSER -. Falha de Estrutura .-> DL
    SVC -. Falha de Negócio .-> DL
    REPO -. Falha de Persistência .-> DL
```

---

## 2. Relacionamento entre as Entidades (Domain & Audit)

A modelagem de dados incorpora rigorosamente a rastreabilidade via `Integration`, o isolamento entre `Inbox` e `Loja`, o Event Sourcing (`Evento`) e o log de falhas (`DeadLetter`).

```mermaid
erDiagram
    %% ======= ENTIDADES DE AUDITORIA & INGESTÃO =======
    INTEGRATION {
        int id PK
        string nome
        string tipo "CHATWOOT|ERP"
        string status
        json config_json
    }

    WEBHOOK_LOG {
        int id PK
        int integration_id FK
        string event
        string payload_hash
        string status "PENDING|PROCESSED|FAILED"
        string trace_id
    }

    RAW_EVENT {
        int id PK
        int webhook_log_id FK
        string event_type
        json payload_json
        string trace_id
    }

    DEAD_LETTER {
        int id PK
        int raw_event_id FK
        string reason
        json payload_json
    }

    %% ======= ENTIDADES DE DOMÍNIO CORE =======
    LOJA {
        int id PK
        string codigo
        string nome
    }

    INBOX {
        int id PK
        int loja_id FK
        string nome
        string chatwoot_inbox_id
    }

    TELE {
        int id PK
        string nome
        string tipo
    }

    CLIENTE {
        int id PK
        int tele_original_id FK
        string telefone
        string nome
    }

    CONVERSA {
        int id PK
        int cliente_id FK
        int inbox_id FK
        int tele_responsavel_id FK
        string chatwoot_id
    }

    MENSAGEM {
        int id PK
        int conversation_id FK
        string chatwoot_message_id
        string sender_type
        string message_type
        json payload_json
    }

    CUPOM {
        int id PK
        string codigo
        boolean utilizado
    }

    OPORTUNIDADE {
        int id PK
        int cliente_id FK
        int loja_id FK
        int tele_conversao_id FK
        int conversa_id FK
        int cupom_id FK
        string status
        decimal valor_faturamento
    }

    %% ======= EVENT STORE (CORAÇÃO IMUTÁVEL) =======
    EVENTO {
        int id PK
        string tipo "LEAD_RECEBIDO | OPORTUNIDADE_CRIADA | etc"
        string trace_id
        string correlation_id
        string causation_id
        int conversa_id FK
        int cliente_id FK
        int oportunidade_id FK
        json payload_json
    }

    %% ======= RELACIONAMENTOS =======
    %% Ingestão
    INTEGRATION ||--o{ WEBHOOK_LOG : "Gera"
    WEBHOOK_LOG ||--o| RAW_EVENT : "Origina"
    RAW_EVENT ||--o| DEAD_LETTER : "Pode falhar para"

    %% Domínio
    LOJA ||--o{ INBOX : "Possui"
    INBOX ||--o{ CONVERSA : "Contém"
    CLIENTE ||--o{ CONVERSA : "Participa de"
    TELE ||--o{ CLIENTE : "Capta"
    TELE ||--o{ CONVERSA : "Atende"
    CONVERSA ||--o{ MENSAGEM : "Possui"
    
    CLIENTE ||--o{ OPORTUNIDADE : "Gera"
    LOJA ||--o{ OPORTUNIDADE : "Sedia"
    TELE ||--o{ OPORTUNIDADE : "Converte"
    CONVERSA ||--o| OPORTUNIDADE : "Resulta em"
    CUPOM ||--o| OPORTUNIDADE : "Vinculado a"

    %% Rastreabilidade Event Sourcing
    CONVERSA ||--o{ EVENTO : "Rastreia vida"
    CLIENTE ||--o{ EVENTO : "Rastreia vida"
    OPORTUNIDADE ||--o{ EVENTO : "Rastreia vida"
```

## User Review Required

> [!IMPORTANT]
> Avalie os diagramas Mermaid acima. O fluxo em 6 camadas restritas e os relacionamentos de domínio refletem exatamente a sua especificação? Após a aprovação, criaremos o repositório Next.js, geraremos os `.md` documentais e as migrações do Prisma com o Repository Pattern e Event Sourcing V1 final.
