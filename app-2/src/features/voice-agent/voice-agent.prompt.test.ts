import assert from "node:assert/strict";
import test from "node:test";

import { voiceTransferInstruction } from "./voice-agent.prompt.js";
import { voiceAgentTools } from "./voice-agent.tools.js";

const transferTool = voiceAgentTools.find(
  (tool) => tool.name === "transfer_to_manager",
);

test("keeps the voice transfer instruction single and explicit", () => {
  assert.match(
    voiceTransferInstruction,
    /менеджера, сотрудника или оператора/u,
  );
  assert.match(
    voiceTransferInstruction,
    /Одну секунду, соединяю вас с менеджером/u,
  );
  assert.match(
    voiceTransferInstruction,
    /немедленно вызови transfer_to_manager/u,
  );
  assert.match(voiceTransferInstruction, /accepted=true/u);
  assert.match(voiceTransferInstruction, /accepted=false/u);
  assert.doesNotMatch(voiceTransferInstruction, /Проверяю возможность/u);
});

test("keeps the transfer tool contract aligned with the prompt", () => {
  assert.ok(transferTool);
  assert.match(
    transferTool.description,
    /менеджера, сотрудника или оператора/u,
  );
  assert.match(
    transferTool.description,
    /Одну секунду, соединяю вас с менеджером/u,
  );
  assert.match(transferTool.description, /accepted=true/u);
  assert.match(transferTool.description, /accepted=false/u);
  assert.doesNotMatch(transferTool.description, /Проверяю возможность/u);
});
