import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { once } from "node:events";
import test from "node:test";
import pino from "pino";

import { createApp } from "../../app.js";
import { createDatabase } from "../../lib/database/database.js";
import { createVoiceAgentRepository } from "./voice-agent.repository.js";

test(
  "signed Mango result reaches the durable command through the real HTTP router",
  {
    skip: !process.env.VOICE_TEST_DATABASE_URL,
  },
  async () => {
    const database = createDatabase(process.env.VOICE_TEST_DATABASE_URL!);
    const repository = createVoiceAgentRepository(database);
    const apiKey = "regression-key";
    const salt = "regression-salt";
    const app = createApp({
      database,
      logger: pino({ level: "silent" }),
      corsAllowedOrigins: [],
      mailRu: {},
      maxBot: {},
      vk: {},
      managedStorage: {} as never,
      openaiSip: { baseUrl: "https://unused.invalid" },
      voiceIntegration: {
        mangoApiKey: apiKey,
        mangoApiSalt: salt,
        mangoConfigured: true,
        t2TransferConfigured: true,
        publicWebhookConfigured: true,
      },
    });
    const server = app.listen(0, "127.0.0.1");
    try {
      await once(server, "listening");
      const address = server.address();
      assert.ok(address && typeof address === "object");
      for (const endpoint of ["/result/transfer", "/vpbx/result/transfer"]) {
        const commandId = `alsma-transfer-${randomUUID()}`;
        const call = await repository.ensureCall({
          provider: "amazi",
          providerCallId: commandId,
        });
        await repository.claimTransfer(call.id, "transfer_requested:test");
        await repository.setTransferCommand(call.id, commandId, "requested");
        const json = JSON.stringify({ command_id: commandId, result: "1000" });
        const sign = createHash("sha256")
          .update(`${apiKey}${json}${salt}`)
          .digest("hex");
        const post = (signature: string): Promise<Response> =>
          fetch(`http://127.0.0.1:${address.port}${endpoint}`, {
            method: "POST",
            body: new URLSearchParams({
              vpbx_api_key: apiKey,
              json,
              sign: signature,
            }),
          });
        const forged = await post("0".repeat(64));
        assert.equal(forged.status, 401);
        await forged.arrayBuffer();
        assert.equal(
          (await repository.findTransferResult(commandId))?.transferState,
          "requested",
        );
        for (let delivery = 0; delivery < 2; delivery += 1) {
          const response = await post(sign);
          assert.ok(response.ok, await response.text());
        }
        assert.equal(
          (await repository.findTransferResult(commandId))?.transferState,
          "accepted",
        );
      }
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await database.close();
    }
  },
);
