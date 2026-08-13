-- AlterTable
ALTER TABLE "agent_scenarios" ADD COLUMN     "action" TEXT NOT NULL DEFAULT 'answer',
ADD COLUMN     "page" TEXT;
