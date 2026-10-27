import assert from "node:assert/strict";
import test from "node:test";
import pino from "pino";

import { createTelegramBotClient } from "./telegram-bot.client.js";

const jsonResponse = (result: unknown) =>
  new Response(JSON.stringify({ ok: true, result }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });

test("Telegram target verification requires channel publishing permission", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const methods: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const method = String(input).split("/").at(-1) ?? "";
    methods.push(method);
    if (method === "getChat") return jsonResponse({ type: "channel" });
    if (method === "getMe") return jsonResponse({ id: 42 });
    return jsonResponse({ status: "administrator", can_post_messages: true });
  }) as typeof fetch;

  const client = createTelegramBotClient({
    logger: pino({ level: "silent" }),
    token: "test-token",
  });

  await client.verifyChannelPublishing("@alsma_test");
  assert.deepEqual(methods.sort(), ["getChat", "getChatMember", "getMe"]);
});

test("Telegram channel verification rejects an administrator without post rights", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = (async (input: string | URL | Request) => {
    const method = String(input).split("/").at(-1);
    if (method === "getChat") return jsonResponse({ type: "channel" });
    if (method === "getMe") return jsonResponse({ id: 42 });
    return jsonResponse({ status: "administrator", can_post_messages: false });
  }) as typeof fetch;

  const client = createTelegramBotClient({
    logger: pino({ level: "silent" }),
    token: "test-token",
  });

  await assert.rejects(client.verifyChannelPublishing("@alsma_test"), {
    name: "TelegramApiError",
    status: 403,
  });
});

test("Telegram text publishing returns the sent message ID", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  let calledMethod = "";
  globalThis.fetch = (async (input: string | URL | Request) => {
    calledMethod = String(input).split("/").at(-1) ?? "";
    return jsonResponse({ message_id: 123 });
  }) as typeof fetch;

  const client = createTelegramBotClient({
    logger: pino({ level: "silent" }),
    token: "test-token",
  });
  const result = await client.publishChannelPost({
    chatId: "@alsma_test",
    images: [],
    text: "Публикация",
  });

  assert.equal(calledMethod, "sendMessage");
  assert.deepEqual(result, { externalId: "123", url: null });
});
