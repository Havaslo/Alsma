import type { Database } from "../../lib/database/database.js";
import { loadPublishedOffersContext } from "../agent/offers-context.js";
import { formatEventsContext, listPublishedEvents } from "./events-context.js";
import { createVoiceAgentRepository } from "./voice-agent.repository.js";

export const voiceTransferInstruction =
  "Если гость просит менеджера, сотрудника или оператора, не проверяй возможность соединения и не задавай уточняющих вопросов. Скажи коротко: «Одну секунду, соединяю вас с менеджером», затем немедленно вызови transfer_to_manager. Если инструмент вернул accepted=true, не продолжай диалог. Если accepted=false, сообщи: «Сейчас не удалось соединить вас с менеджером».";

export const voiceAgentCommunicationInstruction =
  "Общайся с гостем тепло, приветливо и уважительно, как внимательный администратор отеля. Отвечай на приветствия и благодарность естественно; поддерживай нить разговора и учитывай предыдущие реплики, а не повторяй один и тот же ответ. Используй базу знаний, сценарии и результаты инструментов для подтверждения фактов об отеле, но не зачитывай их как скрипт и не требуй справку для обычной беседы. Если точный факт неизвестен, спокойно скажи об этом, ответь на остальную часть вопроса и предложи помощь; не выдумывай гостиничные факты и не запускай перевод менеджеру только из-за отсутствия статьи, если гость не попросил или задача не требует ручной обработки. Отвечай естественно и по делу, показывай понимание просьбы, не будь сухим или резким и не повторяй шаблонные фразы. Говори короткими ясными фразами и не задавай несколько вопросов подряд. Это голосовой канал: не используй эмодзи и не проговаривай символы эмодзи.";

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
    voiceTransferInstruction,
    "Для вопросов о наличии, проживании и подборе номеров сначала уточни даты, взрослых, детей и количество номеров, затем используй check_availability. Для просьбы сравнить варианты используй compare_rooms. Это только чтение актуальных данных Eptera: голосовой канал не создаёт, не изменяет и не отменяет бронирования, не создаёт платёж и не отправляет платёжную ссылку. Для оформления после консультации переводи к менеджеру.",
    "Выполняй только включённые ниже голосовые сценарии и правила перевода.",
    `Голосовые сценарии, правила и база знаний:\n${knowledge || "Нет включённых сценариев или базы знаний."}`,
    `Опубликованный календарь мероприятий (текущие данные):\n${formatEventsContext(events) || "Нет опубликованных актуальных мероприятий."}`,
    `Опубликованные акции и предложения (текущие данные):\n${offers || "Нет опубликованных актуальных акций и предложений."}`,
    voiceAgentCommunicationInstruction,
  ].join("\n\n");
};
