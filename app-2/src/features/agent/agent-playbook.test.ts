import assert from "node:assert/strict";
import test from "node:test";

import type { Database } from "../../lib/database/database.js";
import { ensureDefaultAgentPlaybook } from "./agent-playbook.js";

test("refreshes only unchanged conversational defaults and preserves admin edits", async () => {
  const scenarios = new Map([
    [
      "Резервный ответ без зацикливания",
      {
        action: "answer",
        id: "text-fallback",
        page: null,
        response:
          "Если точного ответа нет в базе знаний или данных Eptera, не повторяй общие сведения. Скажи, что не можешь подтвердить информацию, и предложи передать вопрос менеджеру.",
      },
    ],
    [
      "Голос: базовый формат консультации",
      {
        action: "answer",
        id: "voice-base",
        page: null,
        response:
          "Ты вежливый русскоязычный голосовой помощник базы отдыха ALSMA. Отвечай коротко и естественно для телефона. Используй только переданные базу знаний, сценарии и результаты инструментов. Для наличия и сравнения используй только read-only инструменты; не оформляй, не изменяй и не отменяй бронирование и не создавай платёж.",
      },
    ],
    [
      "Голос: честный ответ при неопределённости",
      {
        action: "answer",
        id: "voice-admin-edited",
        page: null,
        response: "Настройка, изменённая администратором.",
      },
    ],
  ]);
  const transferRules = new Map([
    [
      "Неподтверждённая информация",
      {
        condition:
          "Ответ нельзя проверить по опубликованной базе знаний, актуальным тарифам или наличию.",
        id: "text-transfer",
      },
    ],
  ]);
  const scenarioUpdates: Array<{
    data: Record<string, unknown>;
    id: string;
  }> = [];
  const transferRuleUpdates: Array<{
    data: Record<string, unknown>;
    id: string;
  }> = [];

  const database = {
    client: {
      agentScenario: {
        create: async () => undefined,
        findFirst: async ({ where }: { where: { title: string } }) =>
          scenarios.get(where.title) ?? null,
        update: async (input: {
          data: Record<string, unknown>;
          where: { id: string };
        }) => {
          scenarioUpdates.push({ data: input.data, id: input.where.id });
        },
      },
      agentTransferRule: {
        create: async () => undefined,
        findFirst: async ({ where }: { where: { title: string } }) =>
          transferRules.get(where.title) ?? null,
        update: async (input: {
          data: Record<string, unknown>;
          where: { id: string };
        }) => {
          transferRuleUpdates.push({ data: input.data, id: input.where.id });
        },
      },
    },
  } as unknown as Database;

  await ensureDefaultAgentPlaybook(database);

  assert.deepEqual(scenarioUpdates.map(({ id }) => id).sort(), [
    "text-fallback",
    "voice-base",
  ]);
  assert.ok(scenarioUpdates.every(({ data }) => Boolean(data.response)));
  assert.ok(
    scenarioUpdates.every(
      ({ data }) =>
        !String(data.response).includes("предложи передать вопрос менеджеру"),
    ),
  );
  assert.equal(
    scenarios.get("Голос: честный ответ при неопределённости")?.response,
    "Настройка, изменённая администратором.",
  );
  assert.equal(transferRuleUpdates.length, 1);
  assert.equal(transferRuleUpdates[0]?.id, "text-transfer");
  assert.match(
    String(transferRuleUpdates[0]?.data.condition),
    /не переводи диалог автоматически только из-за отсутствия статьи/iu,
  );
});
