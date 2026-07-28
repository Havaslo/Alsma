ALTER TABLE "knowledge_articles"
ADD COLUMN "slug" TEXT NOT NULL DEFAULT '',
ADD COLUMN "summary" TEXT NOT NULL DEFAULT '',
ADD COLUMN "category" TEXT NOT NULL DEFAULT '',
ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "channels" TEXT[] NOT NULL DEFAULT ARRAY['text', 'voice']::TEXT[];

ALTER TABLE "agent_rules"
ADD COLUMN "channels" TEXT[] NOT NULL DEFAULT ARRAY['text', 'voice']::TEXT[];

ALTER TABLE "knowledge_query_logs"
ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'text',
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'answered';
