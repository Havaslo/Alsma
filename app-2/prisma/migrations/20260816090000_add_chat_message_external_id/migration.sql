ALTER TABLE "chat_messages" ADD COLUMN "external_id" TEXT;
CREATE UNIQUE INDEX "chat_messages_conversation_id_external_id_key" ON "chat_messages"("conversation_id", "external_id");
