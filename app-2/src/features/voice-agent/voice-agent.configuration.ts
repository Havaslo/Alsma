import type { RequestHandler } from "express";
import { timingSafeEqual } from "node:crypto";

import type { Database } from "../../lib/database/database.js";
import { formatEventsContext, listPublishedEvents } from "./events-context.js";
import { createVoiceAgentRepository } from "./voice-agent.repository.js";
import {
  recordingDisclosure,
  voiceAgentSystemPrompt,
} from "./voice-agent.service.js";

const realtimeModel = "gpt-realtime-2.1";

const hasValidBearer = (authorization: string | undefined, secret: string) => {
  const prefix = "Bearer ";
  if (!authorization?.startsWith(prefix)) return false;
  const received = Buffer.from(authorization.slice(prefix.length));
  const expected = Buffer.from(secret);
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
};

const getConfiguration = async (database: Database) => {
  const [knowledge, events] = await Promise.all([
    createVoiceAgentRepository(database).getKnowledgeContext(),
    listPublishedEvents(database).catch(() => []),
  ]);
  const eventsContext = formatEventsContext(events);
  return {
    type: "realtime",
    model: realtimeModel,
    instructions: `${voiceAgentSystemPrompt}\n\nПервой фразой сообщи: ${recordingDisclosure}\n\nБаза знаний и правила:\n${knowledge}\n\nОпубликованный календарь мероприятий (только эти данные, актуальны на момент конфигурации):\n${eventsContext || "Нет опубликованных актуальных мероприятий."}\nНе придумывай мероприятия и даты. Если в календаре нет ответа, скажи, что у тебя нет этой информации, и предложи уточнить у менеджера. Для вопроса о конкретной дате используй инструмент get_events.`,
    output_modalities: ["audio"],
    audio: {
      input: {
        format: { type: "audio/pcm", rate: 24_000 },
        turn_detection: {
          type: "server_vad",
          create_response: true,
          interrupt_response: true,
        },
      },
      output: {
        format: { type: "audio/pcm", rate: 24_000 },
        voice: "marin",
      },
    },
    tools: [
      {
        type: "function",
        name: "get_events",
        description:
          "Получить свежий список опубликованных мероприятий или мероприятия на конкретную дату.",
        parameters: {
          type: "object",
          properties: {
            date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          },
        },
      },
      {
        type: "function",
        name: "check_availability",
        description:
          "Проверить актуальную доступность номеров по датам и числу гостей.",
        parameters: {
          type: "object",
          properties: {
            checkIn: { type: "string" },
            checkOut: { type: "string" },
            adults: { type: "integer", minimum: 1 },
            children: { type: "array", items: { type: "integer", minimum: 0 } },
            roomCount: { type: "integer", minimum: 1 },
          },
          required: ["checkIn", "checkOut", "adults"],
        },
      },
      {
        type: "function",
        name: "transfer_to_manager",
        description:
          "Перевести звонок сотруднику по просьбе гостя или при отсутствии уверенного ответа.",
        parameters: {
          type: "object",
          properties: { reason: { type: "string" } },
          required: ["reason"],
        },
      },
    ],
  };
};

export const createVoiceConfigurationHandler =
  (database: Database, secret?: string): RequestHandler =>
  async (request, response, next) => {
    try {
      if (secret && !hasValidBearer(request.header("authorization"), secret)) {
        response
          .status(401)
          .json({ error: { code: "invalid_configuration_authorization" } });
        return;
      }
      response
        .type("application/json")
        .status(200)
        .json(await getConfiguration(database));
    } catch (error) {
      next(error);
    }
  };

export const voiceTestCompletedHandler: RequestHandler = (
  _request,
  response,
) => {
  response.status(204).end();
};
