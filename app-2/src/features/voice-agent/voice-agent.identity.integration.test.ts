import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { createDatabase } from "../../lib/database/database.js";
import { parseAmaziWebhook } from "./voice-agent.amazi.js";
import { createAmaziLifecycle } from "./voice-agent.amazi.lifecycle.js";
import { createVoiceAgentRepository } from "./voice-agent.repository.js";

// Run against a disposable database initialized with `prisma db push`.
const databaseUrl = process.env.VOICE_TEST_DATABASE_URL;

test(
  "links an existing Amazi identity without deleting either call's history",
  { skip: !databaseUrl },
  async () => {
    const database = createDatabase(databaseUrl!);
    const repository = createVoiceAgentRepository(database);
    const lifecycle = createAmaziLifecycle(repository);
    const sessionId = randomUUID();
    const entryId = randomUUID();
    try {
      const mango = await repository.ensureCall({
        provider: "mango",
        providerCallId: `mango:${sessionId}`,
        providerEntryId: entryId,
        mangoCallId: `leg:${sessionId}`,
        mangoCallState: "Connected",
        mangoTransferInitiator: "10",
      });
      const amazi = await repository.ensureCall({
        provider: "amazi",
        providerCallId: `amazi:${sessionId}`,
      });
      await repository.appendTranscript(mango.id, {
        role: "guest",
        text: "Нужен менеджер",
      });
      await repository.appendTranscript(amazi.id, {
        role: "assistant",
        text: "Соединяю",
      });
      // Isolate the time lookup from other regression-test fixtures.
      const linkedLifecycle = createAmaziLifecycle({
        ...repository,
        findUniqueMangoCallNear: async () => mango,
      });
      const linked = await linkedLifecycle.handleAmaziWebhook({
        eventKey: `amazi:${sessionId}:connected`,
        eventType: "voice.call.connected",
        sessionId,
        occurredAt: new Date(),
      });
      assert.equal(linked.id, amazi.id);
      assert.equal(linked.providerEntryId, entryId);
      assert.equal(linked.mangoCallId, mango.mangoCallId);
      assert.equal(linked.adminRequestId, amazi.adminRequestId);
      const retained = await repository.findCall(mango.id);
      assert.equal(retained?.providerCallId, mango.providerCallId);
      assert.equal(retained?.adminRequestId, mango.adminRequestId);
      assert.equal((retained?.transcript as unknown[]).length, 1);
      assert.equal((linked.transcript as unknown[]).length, 1);
      const completed = await lifecycle.handleAmaziWebhook({
        eventKey: `amazi:${sessionId}:completed`,
        eventType: "voice.call.completed",
        sessionId,
        occurredAt: new Date(),
      });
      assert.equal(completed.status, "completed");
      assert.equal(completed.id, amazi.id);
    } finally {
      await database.close();
    }
  },
);

test(
  "concurrent configuration and lifecycle identity creation is idempotent",
  { skip: !databaseUrl },
  async () => {
    const database = createDatabase(databaseUrl!);
    const repository = createVoiceAgentRepository(database);
    const providerCallId = `amazi:${randomUUID()}`;
    try {
      const calls = await Promise.all(
        Array.from({ length: 3 }, () =>
          repository.ensureCall({ provider: "amazi", providerCallId }),
        ),
      );
      assert.equal(new Set(calls.map((call) => call.id)).size, 1);
      assert.equal(new Set(calls.map((call) => call.adminRequestId)).size, 1);
    } finally {
      await database.close();
    }
  },
);

test(
  "late and duplicate transfer callbacks preserve terminal call state",
  { skip: !databaseUrl },
  async () => {
    const database = createDatabase(databaseUrl!);
    const repository = createVoiceAgentRepository(database);
    try {
      for (const result of [1000, 4100]) {
        const commandId = randomUUID();
        const call = await repository.ensureCall({
          provider: "amazi",
          providerCallId: `amazi:${commandId}`,
        });
        await repository.claimTransfer(call.id, "transfer_requested:test");
        await repository.setTransferCommand(call.id, commandId, "requested");
        await repository.updateCall(call.id, { status: "active" });
        assert.equal(
          await repository.claimTransfer(call.id, "duplicate"),
          false,
        );
        await repository.updateCall(call.id, { status: "completed" });
        await repository.applyTransferResult(commandId, result);
        await repository.applyTransferResult(
          commandId,
          result === 1000 ? 4100 : 1000,
        );
        await repository.failTransfer(call.id, "late_local_error");
        const updated = await repository.findCall(call.id);
        assert.equal(updated?.status, "completed");
        assert.equal(
          updated?.transferState,
          result === 1000 ? "accepted" : "failed",
        );
        assert.notEqual(updated?.outcome, "late_local_error");
      }
    } finally {
      await database.close();
    }
  },
);

test(
  "new Disconnected state does not fall back to an old Connected snapshot",
  { skip: !databaseUrl },
  async () => {
    const database = createDatabase(databaseUrl!);
    const repository = createVoiceAgentRepository(database);
    const entry = randomUUID();
    try {
      const older = await database.client.voiceCall.create({
        data: {
          provider: "amazi",
          providerEntryId: entry,
          mangoCallId: "old-leg",
          mangoCallState: "Connected",
          updatedAt: new Date(Date.now() - 60_000),
        },
      });
      await database.client.voiceCall.create({
        data: {
          provider: "mango",
          providerEntryId: entry,
          mangoCallId: older.mangoCallId,
          mangoCallState: "Disconnected",
        },
      });
      assert.equal(
        await repository.findConnectedMangoCallByProviderEntryId(entry),
        null,
      );
    } finally {
      await database.close();
    }
  },
);

test("reads the actual Amazi callerIdentity contract", () => {
  const event = parseAmaziWebhook({
    body: {
      type: "voice.call.started",
      sessionId: "session",
      callerIdentity: "+79000000001",
      occurredAt: new Date().toISOString(),
    },
  });
  assert.equal(event.callerPhone, "+79000000001");
});
