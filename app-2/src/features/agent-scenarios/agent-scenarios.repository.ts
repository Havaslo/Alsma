import type { Database } from "../../lib/database/database.js";
import type {
  AgentScenarioBody,
  AgentSettingsBody,
  AgentTransferRuleBody,
} from "./agent-scenarios.schemas.js";

const SETTINGS_KEY = "agent.settings";
const normalizeSettings = (value: unknown) => {
  const source = value && typeof value === "object" ? value : {};
  const record = source as Record<string, unknown>;
  return {
    ...record,
    canCheckAvailability: false,
    enabled: typeof record.enabled === "boolean" ? record.enabled : true,
    site: typeof record.site === "boolean" ? record.site : true,
    voice: typeof record.voice === "boolean" ? record.voice : true,
    vk: typeof record.vk === "boolean" ? record.vk : true,
    max: typeof record.max === "boolean" ? record.max : true,
  };
};

export const createAgentScenariosRepository = (database: Database) => ({
  list: async () => ({
    scenarios: await database.client.agentScenario.findMany({
      orderBy: { updatedAt: "desc" },
    }),
    transferRules: await database.client.agentTransferRule.findMany({
      orderBy: { updatedAt: "desc" },
    }),
  }),
  getSettings: async () => {
    const setting = await database.client.appSetting.findUnique({
      select: { value: true },
      where: { key: SETTINGS_KEY },
    });
    return setting ? normalizeSettings(setting.value) : null;
  },
  saveSettings: async (input: AgentSettingsBody) =>
    (
      await database.client.appSetting.upsert({
        create: { key: SETTINGS_KEY, value: normalizeSettings(input) },
        select: { value: true },
        update: { value: normalizeSettings(input) },
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
