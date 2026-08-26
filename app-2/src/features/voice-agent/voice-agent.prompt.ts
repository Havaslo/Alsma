import type { Database } from "../../lib/database/database.js";
import { formatEventsContext, listPublishedEvents } from "./events-context.js";
import { createVoiceAgentRepository } from "./voice-agent.repository.js";

/**
 * All business-facing voice instructions come from enabled Voice Agent
 * scenarios and transfer rules. The remaining text is current read-only data.
 */
export const getVoiceInstructions = async (database: Database) => {
  const [knowledge, events] = await Promise.all([
    createVoiceAgentRepository(database).getKnowledgeContext(),
    listPublishedEvents(database).catch(() => []),
  ]);
  return [
    "Выполняй только включённые ниже голосовые сценарии и правила перевода.",
    `Голосовые сценарии, правила и база знаний:\n${knowledge || "Нет включённых сценариев или базы знаний."}`,
    `Опубликованный календарь мероприятий (текущие данные):\n${formatEventsContext(events) || "Нет опубликованных актуальных мероприятий."}`,
  ].join("\n\n");
};
