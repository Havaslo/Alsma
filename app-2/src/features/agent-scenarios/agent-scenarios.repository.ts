import type { Database } from "../../lib/database/database.js";
import type {
  AgentScenarioBody,
  AgentSettingsBody,
  AgentTransferRuleBody,
} from "./agent-scenarios.schemas.js";

const SETTINGS_KEY = "agent.settings";

export const createAgentScenariosRepository = (database: Database) => ({
  list: async () => ({
    scenarios: await database.client.agentScenario.findMany({
      orderBy: { updatedAt: "desc" },
    }),
    transferRules: await database.client.agentTransferRule.findMany({
      orderBy: { updatedAt: "desc" },
    }),
  }),
  getSettings: async () =>
    (
      await database.client.appSetting.findUnique({
        select: { value: true },
        where: { key: SETTINGS_KEY },
      })
    )?.value ?? null,
  saveSettings: async (input: AgentSettingsBody) =>
    (
      await database.client.appSetting.upsert({
        create: { key: SETTINGS_KEY, value: input },
        select: { value: true },
        update: { value: input },
        where: { key: SETTINGS_KEY },
      })
    ).value,
  saveScenario: (input: AgentScenarioBody) => {
    const { id, ...data } = input;
    return id
      ? database.client.agentScenario.update({
          data,
          where: { id },
        })
      : database.client.agentScenario.create({ data });
  },
  saveTransferRule: (input: AgentTransferRuleBody) => {
    const { id, ...data } = input;
    return id
      ? database.client.agentTransferRule.update({
          data,
          where: { id },
        })
      : database.client.agentTransferRule.create({ data });
  },
  deleteScenario: (id: string) =>
    database.client.agentScenario.delete({ where: { id } }),
  deleteTransferRule: (id: string) =>
    database.client.agentTransferRule.delete({ where: { id } }),
});
