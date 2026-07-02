# 📊 Plano de Implementação — Módulo de Atendimento & Leads
## Sistema de BI — Central de Inteligência Grupo Abucci

**Versão:** 1.0  
**Data:** 09/06/2026  
**Responsável Técnico:** Equipe BI Grupo Abucci  
**Status:** 🟡 Aguardando Aprovação

---

## 1. Objetivo do Módulo

Criar um sistema de mensuração que permita ao Grupo Abucci:

1. **Saber exatamente quantos leads a Meta diz entregar** (via Graph API)
2. **Saber quantos leads realmente chegam** no WhatsApp oficial (via EvoAPI)
3. **Cruzar esses dados automaticamente** para calcular a taxa real de entrega e o custo real por lead
4. **Avaliar a qualidade dos leads** recebidos (respondeu? qualificou? converteu?)

### Problema Atual

- Os dados vêm do Adveronix → Google Sheets, com atualização 1x/dia
- Campanhas rodaram com **número errado** (visível nos CSVs: campos "Número errado")
- Campos com **#ERROR!** na planilha indicam falhas no fluxo de dados
- **Não existe forma de confrontar** o que a Meta reporta vs. o que realmente chega
- **Não existe mensuração de qualidade** do lead

---

## 2. Arquitetura Geral

```
                    ┌──────────────┐
                    │   META ADS   │
                    │  Graph API   │
                    └──────┬───────┘
                           │ Pull (a cada 1h)
                           │
     ┌─────────────────────┼─────────────────────┐
     │                     │                      │
     │              ┌──────▼───────┐              │
     │              │    N8N       │              │
     │              │  Fluxo 1:   │              │
     │              │  Meta Data   │              │
     │              └──────┬───────┘              │
     │                     │                      │
     │  ┌──────────────┐   │   ┌──────────────┐   │
     │  │  WhatsApp    │   │   │ Google Sheets │   │
     │  │  (EvoAPI)    │   │   │ (inputs       │   │
     │  │  Nº Oficial  │   │   │  manuais)     │   │
     │  └──────┬───────┘   │   └──────┬────────┘   │
     │         │           │          │             │
     │  ┌──────▼───────┐   │   ┌──────▼────────┐   │
     │  │    N8N       │   │   │    N8N        │   │
     │  │  Fluxo 2:   │   │   │  Fluxo Aux:   │   │
     │  │  WhatsApp    │   │   │  Sheets       │   │
     │  │  Leads       │   │   │  (metas etc)  │   │
     │  └──────┬───────┘   │   └──────┬────────┘   │
     │         │           │          │             │
     │         ▼           ▼          ▼             │
     │  ┌──────────────────────────────────────┐   │
     │  │          POSTGRESQL                  │   │
     │  │                                      │   │
     │  │  ┌─────────────────┐ ┌────────────┐  │   │
     │  │  │meta_ad_insights │ │whatsapp_   │  │   │
     │  │  │                 │ │leads       │  │   │
     │  │  └────────┬────────┘ └─────┬──────┘  │   │
     │  │           │                │         │   │
     │  │     ┌─────▼────────────────▼─────┐   │   │
     │  │     │  Fluxo 3: Cruzamento       │   │   │
     │  │     │  → daily_lead_report       │   │   │
     │  │     └────────────────────────────┘   │   │
     │  │                                      │   │
     │  └──────────────────┬───────────────────┘   │
     │                     │                       │
     └─────────────────────┼───────────────────────┘
                           │
                    ┌──────▼───────┐
                    │  FRONTEND    │
                    │  Dashboard   │
                    │  BI          │
                    └──────────────┘
```

### Stack Tecnológica

| Componente | Tecnologia | Justificativa |
|-----------|-----------|---------------|
| Orquestração de Dados | **N8N** (já ativo em `auto.gbamecanica.com.br`) | Visual, rápido de prototipar, já rodando |
| Banco de Dados | **PostgreSQL** | Decisão da Sessão 1 — Data Warehouse unificado |
| Fonte Meta Ads | **Meta Graph API v21.0** | Dados oficiais, sem intermediários |
| Fonte WhatsApp | **EvoAPI** (WhatsApp oficial) | Captura real de mensagens recebidas |
| Inputs Manuais | **Google Sheets** (via API v4) | Metas, despesas não rastreáveis |
| Frontend (futuro) | **React/Next.js** + Chart.js | Dashboards interativos |

---

## 3. Fontes de Dados

### 3.1 Meta Graph API — Dados de Anúncios

**O que coleta:** Métricas de performance de todas as campanhas de tráfego pago.

| Métrica | Campo na API | Uso |
|---------|-------------|-----|
| Alcance | `reach` | Volume de pessoas impactadas |
| Impressões | `impressions` | Volume total de exibições |
| Frequência | `frequency` | Saturação do público |
| Valor Gasto | `spend` | Investimento real |
| CPM | `cpm` | Custo por mil impressões |
| Cliques no Link | `actions[link_click]` | Engajamento |
| CPC | `cost_per_action_type[link_click]` | Eficiência de clique |
| CTR | `ctr` | Taxa de clique |
| Views de Vídeo (25/50/75/95%) | `video_p25/p50/p75/p95_watched_actions` | Retenção de vídeo |
| **Conversas Iniciadas** | `actions[onsite_conversion.messaging_conversation_started_7d]` | **KPI PRINCIPAL — Leads Meta** |
| **Custo por Conversa** | `cost_per_action_type[...]` | **CPL segundo a Meta** |

**Frequência de coleta:** A cada 1 hora via Cron no N8N  
**Granularidade:** Por anúncio (nível `ad`), por dia

#### Requisitos para Setup

| Item | Descrição | Responsável |
|------|-----------|-------------|
| App Facebook Developers | Criar em developers.facebook.com | Gestor de Tráfego |
| Business Manager Verificado | Conta verificada com acesso à conta de anúncios | Admin |
| System User Token | Token de longa duração (não expira fácil) | Dev/Gestor |
| Permissões | `ads_read`, `ads_management`, `read_insights` | Admin |
| Ad Account ID | Formato `act_XXXXXXXXX` — um por unidade | Gestor |

---

### 3.2 EvoAPI — Leads Reais via WhatsApp

**O que coleta:** Todas as mensagens que chegam no WhatsApp oficial da empresa.

| Dado | Origem | Uso |
|------|--------|-----|
| Número do remetente | Mensagem recebida | Identificar lead único |
| Texto da primeira mensagem | Mensagem recebida | Contexto + classificação |
| Data/hora da chegada | Timestamp do evento | Quando o lead realmente chegou |
| Referência do anúncio | `contextInfo.externalAdReply` | **De qual campanha veio** |
| Tipo de mídia | Mensagem recebida | Texto, áudio, imagem |

**Frequência de coleta:** Tempo real (webhook push)  
**Granularidade:** Por mensagem individual

#### Requisitos para Setup

| Item | Descrição | Responsável |
|------|-----------|-------------|
| EvoAPI instalada e rodando | Servidor com a Evolution API ativa | Infra |
| Número WhatsApp oficial | Conectado à EvoAPI via QR Code | Gestor |
| Webhook configurado | Apontar para URL do N8N | Dev |
| Eventos habilitados | `MESSAGES_UPSERT`, `MESSAGES_UPDATE` | Dev |

---

### 3.3 Google Sheets — Inputs Manuais

**O que coleta:** Dados que não são rastreáveis automaticamente.

| Dado | Exemplo | Uso |
|------|---------|-----|
| Metas mensais | "Meta de leads: 500" | Comparativo meta vs realizado |
| Despesas extras | Produção de criativos | Custo total real |
| Observações qualitativas | "Feriado impactou volume" | Contexto para análise |

**Frequência de coleta:** Diária (Cron às 06:15) ou sob demanda  
**Método:** Google Sheets API v4 via Service Account

---

## 4. Modelagem do Banco de Dados (PostgreSQL)

### 4.1 Tabela: `meta_ad_insights`
> Dados oficiais reportados pela Meta

```sql
CREATE TABLE meta_ad_insights (
    id              SERIAL PRIMARY KEY,
    date            DATE NOT NULL,
    campaign_id     VARCHAR(50),
    campaign_name   VARCHAR(255),
    adset_id        VARCHAR(50),
    adset_name      VARCHAR(255),
    ad_id           VARCHAR(50),
    ad_name         VARCHAR(255),
    reach           INTEGER DEFAULT 0,
    impressions     INTEGER DEFAULT 0,
    frequency       DECIMAL(5,2) DEFAULT 0,
    spend           DECIMAL(10,2) DEFAULT 0,
    cpm             DECIMAL(10,2) DEFAULT 0,
    link_clicks     INTEGER DEFAULT 0,
    cpc             DECIMAL(10,2) DEFAULT 0,
    ctr             DECIMAL(5,2) DEFAULT 0,
    video_p25       INTEGER DEFAULT 0,
    video_p50       INTEGER DEFAULT 0,
    video_p75       INTEGER DEFAULT 0,
    video_p95       INTEGER DEFAULT 0,
    conversations_started   INTEGER DEFAULT 0,
    cost_per_conversation   DECIMAL(10,2) DEFAULT 0,
    unidade         VARCHAR(20) NOT NULL,  -- 'GBA_CT' ou 'GBA_MEC'
    collected_at    TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(ad_id, date, unidade)
);

CREATE INDEX idx_meta_insights_date ON meta_ad_insights(date);
CREATE INDEX idx_meta_insights_unidade ON meta_ad_insights(unidade);
CREATE INDEX idx_meta_insights_campaign ON meta_ad_insights(campaign_name);
```

---

### 4.2 Tabela: `whatsapp_leads`
> Leads reais recebidos via WhatsApp/EvoAPI

```sql
CREATE TABLE whatsapp_leads (
    id              SERIAL PRIMARY KEY,
    phone_number    VARCHAR(20) NOT NULL,
    phone_hash      VARCHAR(64),           -- Para LGPD (hash do telefone)
    first_message   TEXT,
    first_contact_at TIMESTAMP NOT NULL,
    last_message_at TIMESTAMP,
    source          VARCHAR(30) DEFAULT 'unknown',  -- 'meta_ads', 'organic', 'referral', 'unknown'
    ad_reference    VARCHAR(500),          -- Referência do anúncio (se veio do Meta)
    campaign_ref    VARCHAR(255),          -- Nome da campanha detectado
    total_messages  INTEGER DEFAULT 1,
    status          VARCHAR(20) DEFAULT 'new',  -- 'new', 'contacted', 'qualified', 'unqualified', 'converted'
    quality_score   SMALLINT,              -- 1 a 5 (preenchido manualmente ou por IA)
    notes           TEXT,
    unidade         VARCHAR(20) NOT NULL,  -- 'GBA_CT' ou 'GBA_MEC'
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),

    UNIQUE(phone_number, unidade)
);

CREATE INDEX idx_whatsapp_leads_date ON whatsapp_leads(first_contact_at);
CREATE INDEX idx_whatsapp_leads_source ON whatsapp_leads(source);
CREATE INDEX idx_whatsapp_leads_unidade ON whatsapp_leads(unidade);
CREATE INDEX idx_whatsapp_leads_status ON whatsapp_leads(status);
```

---

### 4.3 Tabela: `daily_lead_report`
> Relatório diário de cruzamento Meta vs Real

```sql
CREATE TABLE daily_lead_report (
    id                  SERIAL PRIMARY KEY,
    date                DATE NOT NULL,
    unidade             VARCHAR(20) NOT NULL,
    leads_meta          INTEGER DEFAULT 0,      -- Conversas que a Meta reportou
    leads_reais         INTEGER DEFAULT 0,      -- Leads que realmente chegaram
    leads_meta_ads      INTEGER DEFAULT 0,      -- Leads reais identificados como vindo do Meta
    leads_organicos     INTEGER DEFAULT 0,      -- Leads orgânicos / não rastreados
    diferenca           INTEGER DEFAULT 0,      -- Gap (meta - real)
    taxa_entrega_pct    DECIMAL(5,1) DEFAULT 0, -- % de entrega real
    investimento_total  DECIMAL(10,2) DEFAULT 0,
    cpl_meta            DECIMAL(10,2) DEFAULT 0, -- Custo por lead segundo a Meta
    cpl_real            DECIMAL(10,2) DEFAULT 0, -- Custo por lead real
    qualidade_media     DECIMAL(3,1),            -- Score médio de qualidade dos leads
    classificacao       VARCHAR(10) DEFAULT 'N/A', -- 'BOM', 'ALERTA', 'CRITICO'
    created_at          TIMESTAMP DEFAULT NOW(),

    UNIQUE(date, unidade)
);

CREATE INDEX idx_daily_report_date ON daily_lead_report(date);
CREATE INDEX idx_daily_report_unidade ON daily_lead_report(unidade);
```

---

### 4.4 Tabela: `manual_targets`
> Metas e inputs manuais vindos do Google Sheets

```sql
CREATE TABLE manual_targets (
    id              SERIAL PRIMARY KEY,
    month           DATE NOT NULL,          -- Primeiro dia do mês
    unidade         VARCHAR(20) NOT NULL,
    target_leads    INTEGER,                -- Meta de leads
    target_spend    DECIMAL(10,2),          -- Orçamento planejado
    target_cpl      DECIMAL(10,2),          -- CPL meta
    extra_costs     DECIMAL(10,2) DEFAULT 0, -- Custos extras (criativos etc)
    notes           TEXT,
    synced_at       TIMESTAMP DEFAULT NOW(),

    UNIQUE(month, unidade)
);
```

---

### Diagrama de Relacionamento

```
┌─────────────────────┐     ┌──────────────────────┐
│  meta_ad_insights   │     │   whatsapp_leads      │
│─────────────────────│     │──────────────────────│
│  date               │◄────│  first_contact_at    │
│  unidade            │◄────│  unidade             │
│  conversations_     │     │  source (meta_ads)   │
│    started          │     │  ad_reference        │
│  spend              │     │  quality_score       │
│  campaign_name      │     │  status              │
└────────┬────────────┘     └──────────┬───────────┘
         │                             │
         │    CRUZAMENTO POR           │
         │    date + unidade           │
         │                             │
         └──────────┬──────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  daily_lead_report   │
         │──────────────────────│
         │  leads_meta          │
         │  leads_reais         │
         │  taxa_entrega_pct    │
         │  cpl_real            │
         │  classificacao       │
         └──────────────────────┘
                    │
                    │ comparado com
                    ▼
         ┌──────────────────────┐
         │  manual_targets      │
         │──────────────────────│
         │  target_leads        │
         │  target_cpl          │
         └──────────────────────┘
```

---

## 5. Fluxos N8N (Detalhamento)

### 5.1 🔵 Fluxo 1: Coletor Meta Ads
> **Objetivo:** Buscar métricas de campanhas da Meta e salvar no PostgreSQL  
> **Trigger:** Schedule (a cada 1 hora, das 06:00 às 23:00)

```
⏰ Schedule Trigger (a cada 1h)
    │
    ▼
🔧 Set Node: Configurar parâmetros
    │ - ad_account_id_ct = "act_XXXXXXX"
    │ - ad_account_id_mec = "act_YYYYYYY"
    │ - access_token = "{{$env.META_ACCESS_TOKEN}}"
    │ - date = "{{$today.format('YYYY-MM-DD')}}"
    │
    ▼
🔁 Loop: Para cada conta (CT e MEC)
    │
    ▼
🌐 HTTP Request Node
    │ URL: https://graph.facebook.com/v21.0/{ad_account_id}/insights
    │ Method: GET
    │ Query Params:
    │   fields: campaign_name,adset_name,ad_name,reach,
    │           impressions,frequency,spend,cpm,ctr,
    │           actions,cost_per_action_type,
    │           video_p25_watched_actions,
    │           video_p50_watched_actions,
    │           video_p75_watched_actions,
    │           video_p95_watched_actions
    │   level: ad
    │   time_range: {"since":"{{date}}","until":"{{date}}"}
    │   limit: 500
    │
    ▼
🔄 Split In Batches
    │
    ▼
🧹 Code Node: Transformação e Limpeza
    │
    │  // Extrair conversations_started do array actions
    │  const actions = item.json.actions || [];
    │  const convAction = actions.find(a =>
    │    a.action_type === 'onsite_conversion.messaging_conversation_started_7d'
    │  );
    │  const conversations = convAction ? parseInt(convAction.value) : 0;
    │
    │  // Extrair cost_per_conversation
    │  const costs = item.json.cost_per_action_type || [];
    │  const convCost = costs.find(c =>
    │    c.action_type === 'onsite_conversion.messaging_conversation_started_7d'
    │  );
    │  const costPerConv = convCost ? parseFloat(convCost.value) : 0;
    │
    │  // Extrair link_clicks
    │  const clickAction = actions.find(a => a.action_type === 'link_click');
    │  const linkClicks = clickAction ? parseInt(clickAction.value) : 0;
    │
    │  return {
    │    date: item.json.date_start,
    │    campaign_name: item.json.campaign_name,
    │    adset_name: item.json.adset_name,
    │    ad_name: item.json.ad_name,
    │    ad_id: item.json.ad_id,
    │    reach: parseInt(item.json.reach || 0),
    │    impressions: parseInt(item.json.impressions || 0),
    │    frequency: parseFloat(item.json.frequency || 0),
    │    spend: parseFloat(item.json.spend || 0),
    │    cpm: parseFloat(item.json.cpm || 0),
    │    ctr: parseFloat(item.json.ctr || 0),
    │    link_clicks: linkClicks,
    │    conversations_started: conversations,
    │    cost_per_conversation: costPerConv,
    │    unidade: currentAccount.name  // 'GBA_CT' ou 'GBA_MEC'
    │  };
    │
    ▼
🐘 PostgreSQL Node: UPSERT
    │ INSERT INTO meta_ad_insights (...)
    │ ON CONFLICT (ad_id, date, unidade)
    │ DO UPDATE SET
    │   reach = EXCLUDED.reach,
    │   impressions = EXCLUDED.impressions,
    │   ...
    │   collected_at = NOW()
    │
    ▼
✅ Fim (notificação opcional de sucesso/erro)
```

---

### 5.2 🟢 Fluxo 2: Receptor de Leads WhatsApp (EvoAPI)
> **Objetivo:** Capturar cada mensagem que chega no WhatsApp oficial  
> **Trigger:** Webhook (tempo real, push da EvoAPI)

```
📨 Webhook Trigger
    │ POST https://auto.gbamecanica.com.br/webhook/evoapi-leads
    │ Headers: Authorization: Bearer {{SECRET}}
    │
    ▼
🔍 Switch Node: Tipo de Evento
    │
    ├─ "MESSAGES_UPSERT" ──────────────────────────────────┐
    │                                                       │
    │   ▼                                                   │
    │   ❓ IF Node: É mensagem recebida? (não enviada)      │
    │   │  Condição: key.fromMe === false                   │
    │   │                                                   │
    │   ├─ SIM ─────────────────────────────────────────┐   │
    │   │                                                │   │
    │   │   ▼                                            │   │
    │   │   🧹 Code Node: Extrair e Limpar Dados         │   │
    │   │   │                                            │   │
    │   │   │  // Extrair número do remetente            │   │
    │   │   │  const phone = msg.key.remoteJid           │   │
    │   │   │    .replace('@s.whatsapp.net', '');        │   │
    │   │   │                                            │   │
    │   │   │  // Verificar se veio de anúncio Meta      │   │
    │   │   │  const adRef = msg.message                 │   │
    │   │   │    ?.extendedTextMessage                   │   │
    │   │   │    ?.contextInfo                           │   │
    │   │   │    ?.externalAdReply || null;              │   │
    │   │   │                                            │   │
    │   │   │  const source = adRef                      │   │
    │   │   │    ? 'meta_ads'                            │   │
    │   │   │    : 'unknown';                            │   │
    │   │   │                                            │   │
    │   │   │  // Extrair texto da mensagem              │   │
    │   │   │  const text = msg.message?.conversation    │   │
    │   │   │    || msg.message?.extendedTextMessage     │   │
    │   │   │      ?.text                                │   │
    │   │   │    || '[mídia]';                           │   │
    │   │   │                                            │   │
    │   │   │  return {                                   │   │
    │   │   │    phone_number: phone,                    │   │
    │   │   │    first_message: text,                    │   │
    │   │   │    source: source,                         │   │
    │   │   │    ad_reference: JSON.stringify(adRef),    │   │
    │   │   │    campaign_ref: adRef?.title || null,     │   │
    │   │   │    unidade: instanceName                   │   │
    │   │   │      .includes('CT')                       │   │
    │   │   │        ? 'GBA_CT' : 'GBA_MEC'             │   │
    │   │   │  };                                        │   │
    │   │                                                │   │
    │   │   ▼                                            │   │
    │   │   🐘 PostgreSQL: UPSERT Lead                   │   │
    │   │   │                                            │   │
    │   │   │  INSERT INTO whatsapp_leads                │   │
    │   │   │    (phone_number, first_message,           │   │
    │   │   │     first_contact_at, source,              │   │
    │   │   │     ad_reference, campaign_ref, unidade)   │   │
    │   │   │  VALUES ($1, $2, NOW(), $3, $4, $5, $6)   │   │
    │   │   │  ON CONFLICT (phone_number, unidade)       │   │
    │   │   │  DO UPDATE SET                             │   │
    │   │   │    last_message_at = NOW(),                │   │
    │   │   │    total_messages = whatsapp_leads         │   │
    │   │   │      .total_messages + 1                   │   │
    │   │                                                │   │
    │   │   ▼                                            │   │
    │   │   ✅ Lead salvo                                │   │
    │   │                                                │   │
    │   ├─ NÃO (mensagem enviada por nós) ───────────┐   │   │
    │   │   ▼                                         │   │   │
    │   │   🚫 No Operation (ignorar)                 │   │   │
    │                                                       │
    ├─ Outros eventos ─────────────────────────────────────┐
    │   ▼                                                   │
    │   🚫 No Operation (ignorar)                           │
    │                                                       │
    ▼
✅ Fim
```

---

### 5.3 🔴 Fluxo 3: Cruzamento Diário — Meta vs Real
> **Objetivo:** Gerar relatório diário de confronto de dados  
> **Trigger:** Schedule (todos os dias às 23:00)

```
⏰ Schedule Trigger (diário, 23:00)
    │
    ▼
🐘 PostgreSQL: Query de Cruzamento
    │
    │  SELECT
    │    mi.date,
    │    mi.unidade,
    │    COALESCE(SUM(mi.conversations_started), 0)
    │      AS leads_meta,
    │    COALESCE(COUNT(DISTINCT wl.id), 0)
    │      AS leads_reais,
    │    COALESCE(COUNT(DISTINCT CASE
    │      WHEN wl.source = 'meta_ads' THEN wl.id
    │    END), 0) AS leads_meta_ads,
    │    COALESCE(COUNT(DISTINCT CASE
    │      WHEN wl.source != 'meta_ads' THEN wl.id
    │    END), 0) AS leads_organicos,
    │    COALESCE(SUM(mi.conversations_started), 0)
    │      - COALESCE(COUNT(DISTINCT wl.id), 0)
    │      AS diferenca,
    │    CASE
    │      WHEN SUM(mi.conversations_started) > 0
    │      THEN ROUND(
    │        COUNT(DISTINCT wl.id)::DECIMAL /
    │        SUM(mi.conversations_started) * 100, 1
    │      )
    │      ELSE 0
    │    END AS taxa_entrega_pct,
    │    COALESCE(SUM(mi.spend), 0)
    │      AS investimento_total,
    │    CASE
    │      WHEN SUM(mi.conversations_started) > 0
    │      THEN ROUND(SUM(mi.spend) /
    │        SUM(mi.conversations_started), 2)
    │      ELSE 0
    │    END AS cpl_meta,
    │    CASE
    │      WHEN COUNT(DISTINCT wl.id) > 0
    │      THEN ROUND(SUM(mi.spend) /
    │        COUNT(DISTINCT wl.id), 2)
    │      ELSE 0
    │    END AS cpl_real,
    │    AVG(wl.quality_score) AS qualidade_media
    │  FROM meta_ad_insights mi
    │  LEFT JOIN whatsapp_leads wl
    │    ON wl.first_contact_at::DATE = mi.date
    │    AND wl.unidade = mi.unidade
    │  WHERE mi.date = CURRENT_DATE
    │  GROUP BY mi.date, mi.unidade
    │
    ▼
🧹 Code Node: Classificação
    │
    │  const taxa = item.json.taxa_entrega_pct;
    │  let classificacao = 'N/A';
    │
    │  if (taxa >= 80) classificacao = 'BOM';
    │  else if (taxa >= 60) classificacao = 'ALERTA';
    │  else if (taxa > 0) classificacao = 'CRITICO';
    │
    │  return { ...item.json, classificacao };
    │
    ▼
🐘 PostgreSQL: UPSERT em daily_lead_report
    │  INSERT INTO daily_lead_report (...)
    │  ON CONFLICT (date, unidade)
    │  DO UPDATE SET ...
    │
    ▼
❓ IF Node: Classificação é CRÍTICO?
    │
    ├─ SIM ─────────────────────────────────────────┐
    │   ▼                                            │
    │   💬 Notificação de Alerta                     │
    │   │  Via WhatsApp (EvoAPI) ou E-mail            │
    │   │  Para: Gestor de Tráfego + Diretoria        │
    │   │                                            │
    │   │  "⚠️ ALERTA BI - {unidade}                 │
    │   │   Data: {date}                              │
    │   │   Meta reportou: {leads_meta} leads         │
    │   │   Chegaram de verdade: {leads_reais}        │
    │   │   Taxa de entrega: {taxa}%                  │
    │   │   CPL Real: R$ {cpl_real}"                  │
    │                                                │
    ├─ NÃO ─────────────────────────────────────────┐
    │   ▼                                            │
    │   📝 Log: Dia normal registrado                │
    │                                                │
    ▼
✅ Fim
```

---

### 5.4 🟡 Fluxo Auxiliar: Google Sheets → Metas
> **Objetivo:** Sincronizar metas mensais e inputs manuais  
> **Trigger:** Schedule (diário às 06:15)

```
⏰ Schedule Trigger (06:15)
    │
    ▼
📋 Google Sheets Node: Ler aba "Metas"
    │ Spreadsheet ID: {{$env.SHEETS_ID}}
    │ Sheet Name: "Metas"
    │ Range: A:F
    │
    ▼
🧹 Code Node: Transformar dados
    │
    ▼
🐘 PostgreSQL: UPSERT em manual_targets
    │
    ▼
✅ Fim
```

---

## 6. KPIs do Dashboard de Atendimento

### Cards Principais

| KPI | Fórmula | Meta Ideal |
|-----|---------|-----------|
| **Leads Meta (hoje)** | SUM(conversations_started) WHERE date = today | - |
| **Leads Reais (hoje)** | COUNT(whatsapp_leads) WHERE first_contact_at = today | - |
| **Taxa de Entrega** | (leads_reais / leads_meta) × 100 | > 80% |
| **CPL Meta** | spend / conversations_started | - |
| **CPL Real** | spend / leads_reais | O menor possível |
| **Economia/Prejuízo** | CPL_meta - CPL_real × leads_reais | Positivo = bom |

### Gráficos Planejados

| Gráfico | Tipo | Dados |
|---------|------|-------|
| Leads Meta vs Real (diário) | Linha dupla | 30 dias rolling |
| Taxa de Entrega | Gauge/Velocímetro | Hoje vs meta (80%) |
| CPL Real vs CPL Meta | Barras comparativas | Últimos 30 dias |
| Leads por Campanha | Barras horizontais | Top 10 campanhas |
| Qualidade dos Leads | Pizza/Donut | Distribuição por status |
| Investimento vs Retorno | Área | Acumulado mensal |
| Heatmap de Horários | Mapa de calor | Leads por hora/dia da semana |

---

## 7. Cronograma de Execução

### Fase 1: Infraestrutura (Semana 1)

| # | Tarefa | Duração | Dependência |
|---|--------|---------|-------------|
| 1.1 | Provisionar PostgreSQL | 1 dia | - |
| 1.2 | Executar scripts de criação das tabelas | 0.5 dia | 1.1 |
| 1.3 | Configurar EvoAPI + WhatsApp oficial | 1-2 dias | - |
| 1.4 | Criar App no Facebook Developers | 1 dia | - |
| 1.5 | Obter System User Token (Meta) | 0.5 dia | 1.4 |

### Fase 2: Fluxos N8N (Semana 2)

| # | Tarefa | Duração | Dependência |
|---|--------|---------|-------------|
| 2.1 | Criar Fluxo 2 (EvoAPI → PostgreSQL) | 1 dia | 1.2, 1.3 |
| 2.2 | Testar recepção de leads WhatsApp | 1 dia | 2.1 |
| 2.3 | Criar Fluxo 1 (Meta API → PostgreSQL) | 1 dia | 1.2, 1.5 |
| 2.4 | Testar coleta de dados da Meta | 1 dia | 2.3 |
| 2.5 | Criar Fluxo 3 (Cruzamento diário) | 0.5 dia | 2.2, 2.4 |
| 2.6 | Criar Fluxo auxiliar (Sheets → Metas) | 0.5 dia | 1.2 |

### Fase 3: Validação (Semana 3)

| # | Tarefa | Duração | Dependência |
|---|--------|---------|-------------|
| 3.1 | Rodar fluxos por 5 dias coletando dados | 5 dias | 2.* |
| 3.2 | Validar cruzamento manual vs automático | 1 dia | 3.1 |
| 3.3 | Ajustar regras de detecção de source | 1 dia | 3.2 |

### Fase 4: Dashboard (Semana 4-5)

| # | Tarefa | Duração | Dependência |
|---|--------|---------|-------------|
| 4.1 | Desenvolver backend API (endpoints de dados) | 2 dias | 3.* |
| 4.2 | Desenvolver Dashboard de Atendimento | 3 dias | 4.1 |
| 4.3 | Testes + ajustes visuais | 2 dias | 4.2 |
| 4.4 | Deploy em produção | 1 dia | 4.3 |

```
Semana 1          Semana 2          Semana 3          Semana 4-5
├─ Infra ─────────┤─ Fluxos N8N ────┤─ Validação ─────┤─ Dashboard ─────┤
│ PostgreSQL      │ Fluxo EvoAPI    │ Coleta real     │ API Backend     │
│ EvoAPI          │ Fluxo Meta      │ Cruzamento      │ Frontend BI     │
│ Meta Dev App    │ Cruzamento      │ Ajustes         │ Deploy          │
│ Token           │ Sheets          │                 │                 │
```

---

## 8. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|:---:|:---:|-----------|
| Token da Meta expirar | Média | Alto | Usar System User Token (vida longa) + monitorar via N8N |
| EvoAPI cair e perder leads | Baixa | Alto | Configurar fila de retry no webhook + monitorar uptime |
| Lead não ser identificado como vindo do Meta | Alta | Médio | Campo `externalAdReply` nem sempre presente; criar lógica de janela temporal |
| Rate limit da Graph API | Baixa | Baixo | Coleta a cada 1h está dentro dos limites |
| Duplicação de leads | Média | Baixo | UPSERT com UNIQUE constraint no banco |
| N8N ficar offline | Baixa | Alto | Monitoramento + alertas de saúde |

---

## 9. Perguntas Pendentes (Requerem Decisão)

| # | Pergunta | Impacto | Opções |
|---|----------|---------|--------|
| 1 | **Onde hospedar o PostgreSQL?** | Infraestrutura | Supabase (gerenciado) / Railway / VPS própria |
| 2 | **EvoAPI já está instalada?** | Prazo de início | Se sim → Fase 1 mais rápida |
| 3 | **Vocês têm acesso admin ao Business Manager?** | Viabilidade da API | Necessário para criar App e token |
| 4 | **Chatwoot será usado como frontend de atendimento?** | Arquitetura | Impacta se os dados de atendimento vêm de lá também |
| 5 | **Cada unidade (CT/MEC) terá número WhatsApp separado?** | Separação de dados | Determina se são instâncias EvoAPI separadas |
| 6 | **Qual a frequência ideal de coleta da Meta?** | Performance | 1h (recomendado) / 30min / 15min |

---

## 10. Critérios de Aceite

- [ ] O Fluxo 1 coleta dados da Meta a cada hora e insere no PostgreSQL sem erros por 7 dias consecutivos
- [ ] O Fluxo 2 registra corretamente cada nova mensagem recebida no WhatsApp como um lead
- [ ] O campo `source` identifica corretamente leads vindos do Meta (>70% de acurácia)
- [ ] O Fluxo 3 gera relatório diário com a taxa de entrega (leads_meta vs leads_reais)
- [ ] Alertas são enviados automaticamente quando a taxa de entrega cai abaixo de 60%
- [ ] O Dashboard exibe todos os KPIs definidos na seção 6
- [ ] Os gráficos carregam em menos de 2 segundos
- [ ] Dados históricos dos CSVs atuais são migrados para o PostgreSQL

---

> **Próximo passo:** Responder as perguntas da seção 9 para iniciarmos a Fase 1.
