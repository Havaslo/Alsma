import { readAdminSession } from "@/lib/admin/admin-session";
import { apiClient } from "@/lib/api/api-client";

export type AgentScenario = {
  readonly enabled: boolean;
  readonly id: string;
  readonly response: string;
  readonly title: string;
  readonly trigger: string;
};
export type AgentTransferRule = {
  readonly condition: string;
  readonly destination: string;
  readonly enabled: boolean;
  readonly id: string;
  readonly title: string;
};
export type AgentScenariosData = {
  readonly scenarios: AgentScenario[];
  readonly transferRules: AgentTransferRule[];
};
export type AgentScenarioInput = Omit<AgentScenario, "id"> & {
  readonly id?: string;
};
export type AgentTransferRuleInput = Omit<AgentTransferRule, "id"> & {
  readonly id?: string;
};

const headers = () => ({ Authorization: `Bearer ${readAdminSession() ?? ""}` });
export const loadAgentScenarios = (signal?: AbortSignal) =>
  apiClient.get<AgentScenariosData>("/admin/agent-scenarios", {
    headers: headers(),
    signal,
  });
export const saveAgentScenario = (input: AgentScenarioInput) =>
  apiClient.post<{ scenario: AgentScenario }>(
    "/admin/agent-scenarios/scenarios",
    input,
    { headers: headers() },
  );
export const saveAgentTransferRule = (input: AgentTransferRuleInput) =>
  apiClient.post<{ transferRule: AgentTransferRule }>(
    "/admin/agent-scenarios/transfer-rules",
    input,
    { headers: headers() },
  );
