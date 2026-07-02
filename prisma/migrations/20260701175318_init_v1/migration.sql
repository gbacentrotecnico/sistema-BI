-- CreateEnum
CREATE TYPE "RawEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'RETRYING');

-- CreateEnum
CREATE TYPE "AiJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('OPENAI', 'OPENROUTER', 'GOOGLE');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "MessageDeliveryStatus" AS ENUM ('READ', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "Integration" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "provider" TEXT,
    "status" TEXT NOT NULL,
    "version" TEXT,
    "config_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawEvent" (
    "id" SERIAL NOT NULL,
    "integration_id" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "external_id" TEXT,
    "payload_json" JSONB NOT NULL,
    "headers_json" JSONB,
    "status" "RawEventStatus" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "next_retry_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "trace_id" TEXT,

    CONSTRAINT "RawEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" SERIAL NOT NULL,
    "raw_event_id" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload_hash" TEXT NOT NULL,
    "headers_json" JSONB,
    "payload_json" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "trace_id" TEXT,
    "http_status" INTEGER,
    "ip" TEXT,
    "user_agent" TEXT,
    "processing_time_ms" INTEGER,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "retry_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeadLetter" (
    "id" SERIAL NOT NULL,
    "raw_event_id" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "next_retry_at" TIMESTAMP(3),
    "last_error" TEXT,
    "worker_name" TEXT,
    "stacktrace" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "resolution_notes" TEXT,
    "payload_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeadLetter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationExecution" (
    "id" SERIAL NOT NULL,
    "integration_id" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "records" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "duration_ms" INTEGER,
    "worker_name" TEXT NOT NULL,

    CONSTRAINT "IntegrationExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loja" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "aggregate_version" INTEGER NOT NULL DEFAULT 1,
    "integration_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "Loja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inbox" (
    "id" SERIAL NOT NULL,
    "loja_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "chatwoot_inbox_id" TEXT NOT NULL,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "aggregate_version" INTEGER NOT NULL DEFAULT 1,
    "integration_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tele" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "aggregate_version" INTEGER NOT NULL DEFAULT 1,
    "integration_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "Tele_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" SERIAL NOT NULL,
    "telefone" TEXT NOT NULL,
    "nome" TEXT,
    "tele_original_id" INTEGER,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "aggregate_version" INTEGER NOT NULL DEFAULT 1,
    "integration_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversa" (
    "id" SERIAL NOT NULL,
    "chatwoot_id" TEXT NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "inbox_id" INTEGER NOT NULL,
    "tele_responsavel_id" INTEGER,
    "primeira_resposta_em" TIMESTAMP(3),
    "ultima_resposta_em" TIMESTAMP(3),
    "first_agent_reply_at" TIMESTAMP(3),
    "last_message_at" TIMESTAMP(3),
    "last_customer_message_at" TIMESTAMP(3),
    "last_agent_message_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "reopened_at" TIMESTAMP(3),
    "waiting_since" TIMESTAMP(3),
    "assigned_at" TIMESTAMP(3),
    "encerrada_em" TIMESTAMP(3),
    "resolution_time_seconds" INTEGER,
    "response_time_seconds" INTEGER,
    "tempo_primeira_resposta" INTEGER,
    "tempo_total" INTEGER,
    "quantidade_mensagens" INTEGER NOT NULL DEFAULT 0,
    "quantidade_agentes" INTEGER NOT NULL DEFAULT 0,
    "quantidade_clientes" INTEGER NOT NULL DEFAULT 0,
    "status_atual" TEXT NOT NULL DEFAULT 'ABERTA',
    "cupom_erp" TEXT,
    "etiquetas" TEXT[],
    "iniciado_em" TIMESTAMP(3) NOT NULL,
    "ai_processado" BOOLEAN NOT NULL DEFAULT false,
    "ai_processado_em" TIMESTAMP(3),
    "ai_resumo" JSONB,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "aggregate_version" INTEGER NOT NULL DEFAULT 1,
    "integration_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "Conversa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mensagem" (
    "id" SERIAL NOT NULL,
    "chatwoot_message_id" TEXT NOT NULL,
    "conversation_id" INTEGER NOT NULL,
    "sender_type" TEXT NOT NULL,
    "message_type" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL DEFAULT 'INBOUND',
    "delivery_status" "MessageDeliveryStatus",
    "content" TEXT,
    "content_type" TEXT,
    "private" BOOLEAN NOT NULL DEFAULT false,
    "reply_to" TEXT,
    "attachments" JSONB,
    "mime_type" TEXT,
    "media_url" TEXT,
    "payload_json" JSONB,
    "embedding_status" TEXT NOT NULL DEFAULT 'PENDING',
    "summary_status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentiment_status" TEXT NOT NULL DEFAULT 'PENDING',
    "classification_status" TEXT NOT NULL DEFAULT 'PENDING',
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "aggregate_version" INTEGER NOT NULL DEFAULT 1,
    "integration_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mensagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cupom" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "utilizado" BOOLEAN NOT NULL DEFAULT false,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "aggregate_version" INTEGER NOT NULL DEFAULT 1,
    "integration_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "Cupom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Oportunidade" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "loja_id" INTEGER NOT NULL,
    "tele_conversao_id" INTEGER,
    "conversa_id" INTEGER,
    "cupom_id" INTEGER,
    "aprovado_em" TIMESTAMP(3),
    "agendado_em" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'AGENDADA',
    "valor_faturamento" DECIMAL(10,2),
    "observacoes" TEXT,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "aggregate_version" INTEGER NOT NULL DEFAULT 1,
    "integration_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "Oportunidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evento" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "aggregate_version" INTEGER NOT NULL DEFAULT 1,
    "integration" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "hostname" TEXT,
    "worker_name" TEXT,
    "processing_time_ms" INTEGER,
    "trace_id" TEXT,
    "correlation_id" TEXT,
    "causation_id" TEXT,
    "cliente_id" INTEGER,
    "conversa_id" INTEGER,
    "mensagem_id" INTEGER,
    "cupom_id" INTEGER,
    "oportunidade_id" INTEGER,
    "tele_id" INTEGER,
    "loja_id" INTEGER,
    "payload_json" JSONB NOT NULL,
    "ocorrido_em" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricsSnapshot" (
    "id" SERIAL NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "loja" TEXT,
    "tele" TEXT,
    "leads" INTEGER NOT NULL DEFAULT 0,
    "conversas" INTEGER NOT NULL DEFAULT 0,
    "compareceu" INTEGER NOT NULL DEFAULT 0,
    "no_show" INTEGER NOT NULL DEFAULT 0,
    "canceladas" INTEGER NOT NULL DEFAULT 0,
    "ticket" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "receita" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiJob" (
    "id" SERIAL NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "status" "AiJobStatus" NOT NULL DEFAULT 'PENDING',
    "model" TEXT,
    "tokens" INTEGER,
    "cost" DECIMAL(10,6),
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "AiJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebhookLog_raw_event_id_key" ON "WebhookLog"("raw_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookLog_payload_hash_key" ON "WebhookLog"("payload_hash");

-- CreateIndex
CREATE INDEX "WebhookLog_payload_hash_idx" ON "WebhookLog"("payload_hash");

-- CreateIndex
CREATE INDEX "WebhookLog_status_idx" ON "WebhookLog"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Loja_codigo_key" ON "Loja"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Inbox_chatwoot_inbox_id_key" ON "Inbox"("chatwoot_inbox_id");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_telefone_key" ON "Cliente"("telefone");

-- CreateIndex
CREATE INDEX "Cliente_tele_original_id_idx" ON "Cliente"("tele_original_id");

-- CreateIndex
CREATE UNIQUE INDEX "Conversa_chatwoot_id_key" ON "Conversa"("chatwoot_id");

-- CreateIndex
CREATE INDEX "Conversa_iniciado_em_idx" ON "Conversa"("iniciado_em");

-- CreateIndex
CREATE INDEX "Conversa_tele_responsavel_id_idx" ON "Conversa"("tele_responsavel_id");

-- CreateIndex
CREATE INDEX "Conversa_inbox_id_idx" ON "Conversa"("inbox_id");

-- CreateIndex
CREATE UNIQUE INDEX "Mensagem_chatwoot_message_id_key" ON "Mensagem"("chatwoot_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "Cupom_codigo_key" ON "Cupom"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Oportunidade_conversa_id_key" ON "Oportunidade"("conversa_id");

-- CreateIndex
CREATE UNIQUE INDEX "Oportunidade_cupom_id_key" ON "Oportunidade"("cupom_id");

-- CreateIndex
CREATE INDEX "Oportunidade_status_idx" ON "Oportunidade"("status");

-- CreateIndex
CREATE INDEX "Oportunidade_loja_id_idx" ON "Oportunidade"("loja_id");

-- CreateIndex
CREATE INDEX "Evento_tipo_idx" ON "Evento"("tipo");

-- CreateIndex
CREATE INDEX "Evento_correlation_id_idx" ON "Evento"("correlation_id");

-- AddForeignKey
ALTER TABLE "WebhookLog" ADD CONSTRAINT "WebhookLog_raw_event_id_fkey" FOREIGN KEY ("raw_event_id") REFERENCES "RawEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeadLetter" ADD CONSTRAINT "DeadLetter_raw_event_id_fkey" FOREIGN KEY ("raw_event_id") REFERENCES "RawEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inbox" ADD CONSTRAINT "Inbox_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "Loja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_tele_original_id_fkey" FOREIGN KEY ("tele_original_id") REFERENCES "Tele"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversa" ADD CONSTRAINT "Conversa_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversa" ADD CONSTRAINT "Conversa_inbox_id_fkey" FOREIGN KEY ("inbox_id") REFERENCES "Inbox"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversa" ADD CONSTRAINT "Conversa_tele_responsavel_id_fkey" FOREIGN KEY ("tele_responsavel_id") REFERENCES "Tele"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensagem" ADD CONSTRAINT "Mensagem_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oportunidade" ADD CONSTRAINT "Oportunidade_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oportunidade" ADD CONSTRAINT "Oportunidade_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "Loja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oportunidade" ADD CONSTRAINT "Oportunidade_tele_conversao_id_fkey" FOREIGN KEY ("tele_conversao_id") REFERENCES "Tele"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oportunidade" ADD CONSTRAINT "Oportunidade_conversa_id_fkey" FOREIGN KEY ("conversa_id") REFERENCES "Conversa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oportunidade" ADD CONSTRAINT "Oportunidade_cupom_id_fkey" FOREIGN KEY ("cupom_id") REFERENCES "Cupom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_conversa_id_fkey" FOREIGN KEY ("conversa_id") REFERENCES "Conversa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_mensagem_id_fkey" FOREIGN KEY ("mensagem_id") REFERENCES "Mensagem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_cupom_id_fkey" FOREIGN KEY ("cupom_id") REFERENCES "Cupom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_oportunidade_id_fkey" FOREIGN KEY ("oportunidade_id") REFERENCES "Oportunidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
