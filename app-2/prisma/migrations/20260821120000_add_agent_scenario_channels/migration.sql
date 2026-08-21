ALTER TABLE "agent_scenarios" ADD COLUMN "channels" TEXT[] NOT NULL DEFAULT ARRAY['text'];
ALTER TABLE "agent_transfer_rules" ADD COLUMN "channels" TEXT[] NOT NULL DEFAULT ARRAY['text'];
