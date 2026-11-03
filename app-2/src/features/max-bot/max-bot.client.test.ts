import assert from "node:assert/strict";
import test from "node:test";
import pino from "pino";

import {
  MaxApiError,
  MaxImageUploadError,
  createMaxBotClient,
} from "./max-bot.client.js";

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

test("MAX sends the image token returned after uploading the file", async () => {
  const original = globalThis.fetch;
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const responses = [
    { url: "https://iu.oneme.ru/uploadImage?temporary=example" },
    { photos: { "123": { token: "uploaded-image-token" } } },
    { message: { id: "post-id" } },
  ];
  globalThis.fetch = (async (input, init) => {
    calls.push({ url: String(input), init: init ?? {} });
    return json(responses[calls.length - 1]);
  }) as typeof fetch;
  try {
    const client = createMaxBotClient({
      logger: pino({ level: "silent" }),
      token: "test-bot-token",
    });
    const result = await client.publishChannelPost({
      chatId: "-123",
      images: [
        {
          content: new Uint8Array([1, 2, 3]),
          contentType: "image/jpeg",
          fileName: "image.jpg",
        },
      ],
      text: "Test post",
    });
    assert.equal(result.externalId, "post-id");
    assert.match(calls[0]!.url, /\/uploads\?type=image$/u);
    assert.equal(calls[1]!.url, responses[0]!.url);
    assert.ok(calls[1]!.init.body instanceof FormData);
    const uploaded = calls[1]!.init.body.get("data");
    assert.ok(uploaded instanceof Blob);
    assert.equal(uploaded.type, "image/jpeg");
    assert.deepEqual(
      new Uint8Array(await uploaded.arrayBuffer()),
      new Uint8Array([1, 2, 3]),
    );
    const message = JSON.parse(String(calls[2]!.init.body));
    assert.equal(message.text, "Test post");
    assert.deepEqual(message.attachments, [
      { type: "image", payload: { token: "uploaded-image-token" } },
    ]);
    assert.match(calls[2]!.url, /\/messages\?chat_id=-123$/u);
  } finally {
    globalThis.fetch = original;
  }
});

test("MAX does not publish when the uploaded image has no token", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  const responses = [
    { url: "https://iu.oneme.ru/uploadImage?temporary=example" },
    { photos: { "123": {} } },
  ];
  globalThis.fetch = (async () => json(responses[calls++])) as typeof fetch;
  try {
    const client = createMaxBotClient({
      logger: pino({ level: "silent" }),
      token: "test-bot-token",
    });
    await assert.rejects(
      client.publishChannelPost({
        chatId: "-123",
        images: [
          {
            content: new Uint8Array([1]),
            contentType: "image/jpeg",
            fileName: "image.jpg",
          },
        ],
        text: "Test post",
      }),
      MaxImageUploadError,
    );
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = original;
  }
});
