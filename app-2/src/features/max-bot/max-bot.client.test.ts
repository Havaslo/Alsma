import assert from "node:assert/strict";
import test from "node:test";
import pino from "pino";

import { MaxApiError, createMaxBotClient } from "./max-bot.client.js";

const json = (payload: unknown) =>
  new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    status: 200,
  });

const withFetch = async (
  responses: Array<Record<string, unknown>>,
  run: () => Promise<void>,
) => {
  const original = globalThis.fetch;
  let index = 0;
  globalThis.fetch = (async () =>
    json(responses[index++] ?? {})) as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = original;
  }
};

test("MAX channel check accepts a channel without an explicit status", async () => {
  await withFetch(
    [{ chat_id: 123, type: "channel", title: "ALSMA" }, { is_admin: true }],
    async () => {
      const client = createMaxBotClient({
        logger: pino({ level: "silent" }),
        token: "test-token",
      });
      const result = await client.verifyChannelPublishing("123");
      assert.deepEqual(result, { title: "ALSMA" });
    },
  );
});

test("MAX channel check accepts an explicit write permission", async () => {
  await withFetch(
    [
      { chat_id: 123, status: "active", type: "channel" },
      { permissions: ["read", "write"] },
    ],
    async () => {
      const client = createMaxBotClient({
        logger: pino({ level: "silent" }),
        token: "test-token",
      });
      await client.verifyChannelPublishing("123");
    },
  );
});

test("MAX channel check rejects a private dialog target with a clear status", async () => {
  await withFetch(
    [{ chat_id: 123, status: "active", type: "dialog" }],
    async () => {
      const client = createMaxBotClient({
        logger: pino({ level: "silent" }),
        token: "test-token",
      });
      await assert.rejects(client.verifyChannelPublishing("123"), (error) => {
        assert.ok(error instanceof MaxApiError);
        assert.equal(error.status, 409);
        return true;
      });
    },
  );
});
