import assert from "node:assert/strict";
import test from "node:test";

import { extractMessage } from "./max-bot.routes.js";

test("MAX message id is read from the message body", () => {
  const update = {
    update_type: "message_created",
    message: {
      body: { mid: "mid.123", text: "Привет" },
      recipient: { chat_id: 380430438 },
      sender: { user_id: 18250272 },
    },
  };

  assert.deepEqual(extractMessage(update), {
    chatId: "380430438",
    eventId: "mid.123",
    senderId: "18250272",
    text: "Привет",
    updateType: "message_created",
  });
});

test("MAX update id takes precedence over the message id", () => {
  const update = {
    update_id: "update-1",
    update_type: "message_created",
    message: {
      body: { mid: "mid.123", text: "Привет" },
      recipient: { chat_id: 380430438 },
      sender: { user_id: 18250272 },
    },
  };

  assert.equal(extractMessage(update).eventId, "update-1");
});
