import type { Database } from "../../lib/database/database.js";
import { loadPublishedOffersContext } from "../agent/offers-context.js";
import { formatEventsContext, listPublishedEvents } from "./events-context.js";
import { createVoiceAgentRepository } from "./voice-agent.repository.js";

export const voiceTransferInstruction =
  "Если гость просит менеджера, сотрудника или оператора, не проверяй возможность соединения и не задавай уточняющих вопросов. Скажи коротко: «Одну секунду, соединяю вас с менеджером», затем немедленно вызови transfer_to_manager. Если инструмент вернул accepted=true, не продолжай диалог. Если accepted=false, сообщи: «Сейчас не удалось соединить вас с менеджером».";

/**
 * All business-facing voice instructions come from enabled Voice Agent
 * scenarios and transfer rules. The remaining text is current read-only data.
 */
export const getVoiceInstructions = async (database: Database) => {
  const [knowledge, events, offers] = await Promise.all([
    createVoiceAgentRepository(database).getKnowledgeContext(),
    listPublishedEvents(database).catch(() => []),
    loadPublishedOffersContext(database).catch(() => ""),
  ]);
  return [
    "Сразу после подключения сам представься и задай короткий вопрос, не ожидая первой реплики гостя. Говори кратко и по-русски.",
    voiceTransferInstruction,
    "Любой запрос о бронировании, проживании, датах заезда, номерах или наличии сразу переводи менеджеру через transfer_to_manager. Не ищи номера, не проверяй наличие, не оформляй и не создавай бронирования; голосовой канал не отправляет ссылку на виджет.",
    "Выполняй только включённые ниже голосовые сценарии и правила перевода.",
    `Голосовые сценарии, правила и база знаний:\n${knowledge || "Нет включённых сценариев или базы знаний."}`,
    `Опубликованный календарь мероприятий (текущие данные):\n${formatEventsContext(events) || "Нет опубликованных актуальных мероприятий."}`,
    `Опубликованные акции и предложения (текущие данные):\n${offers || "Нет опубликованных актуальных акций и предложений."}`,
  ].join("\n\n");
};
