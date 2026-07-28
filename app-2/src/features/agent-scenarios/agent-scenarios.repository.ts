import type { Database } from "../../lib/database/database.js";
import type {
  AgentScenarioBody,
  AgentTransferRuleBody,
} from "./agent-scenarios.schemas.js";

export const createAgentScenariosRepository = (database: Database) => ({
  list: async () => ({
    scenarios: await database.client.agentScenario.findMany({
      orderBy: { updatedAt: "desc" },
    }),
    transferRules: await database.client.agentTransferRule.findMany({
      orderBy: { updatedAt: "desc" },
    }),
  }),
  saveScenario: (input: AgentScenarioBody) =>
    input.id
      ? database.client.agentScenario.update({
          data: input,
          where: { id: input.id },
        })
      : database.client.agentScenario.create({ data: input }),
  saveTransferRule: (input: AgentTransferRuleBody) =>
    input.id
      ? database.client.agentTransferRule.update({
          data: input,
          where: { id: input.id },
        })
      : database.client.agentTransferRule.create({ data: input }),
});
