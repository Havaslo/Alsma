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

test("Telegram API requests use the configured outbound proxy", async () => {
  const methods: string[] = [];
  const client = createTelegramBotClient({
    fetch: (async (input: string | URL | Request, init?: RequestInit) => {
      assert.equal(String(input), "https://proxy.example/request");
      const request = JSON.parse(String(init?.body)) as {
        readonly url: string;
      };
      const method = new URL(request.url).pathname.split("/").at(-1);
      assert.ok(method);
      methods.push(method);
      if (method === "getChat") return jsonResponse({ type: "channel" });
      if (method === "getMe") return jsonResponse({ id: 42 });
      return jsonResponse({ status: "administrator", can_post_messages: true });
    }) as typeof fetch,
    logger: pino({ level: "silent" }),
    proxyKey: "proxy-key",
    proxyUrl: "https://proxy.example/request",
    token: "test-token",
  });

  await client.verifyChannelPublishing("@alsma_test");
  assert.deepEqual(methods.sort(), ["getChat", "getChatMember", "getMe"]);
});

test("Telegram media requests preserve multipart boundaries through the proxy", async () => {
  const client = createTelegramBotClient({
    fetch: (async (_input: string | URL | Request, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as {
        readonly body: string;
        readonly bodyEncoding?: string;
        readonly headers: { readonly "Content-Type": string };
        readonly url: string;
      };
      assert.equal(
        new URL(request.url).pathname.split("/").at(-1),
        "sendPhoto",
      );
      assert.equal(request.bodyEncoding, "base64");
      assert.match(
        request.headers["Content-Type"],
        /^multipart\/form-data; boundary=/u,
      );
      assert.ok(
        Buffer.from(request.body, "base64").includes(Buffer.from([1, 2, 3])),
      );
      return jsonResponse({ message_id: 321 });
    }) as typeof fetch,
    logger: pino({ level: "silent" }),
    proxyKey: "proxy-key",
    proxyUrl: "https://proxy.example/request",
    token: "test-token",
  });

  const result = await client.publishChannelPost({
    chatId: "@alsma_test",
    images: [
      {
        content: new Uint8Array([1, 2, 3]),
        contentType: "image/png",
        fileName: "test.png",
      },
    ],
    text: "Тест",
  });

  assert.deepEqual(result, { externalId: "321", url: null });
});
