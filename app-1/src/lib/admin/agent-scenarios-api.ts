import { readAdminSession } from "@/lib/admin/admin-session";
import { apiClient } from "@/lib/api/api-client";

export type AgentScenario = {
  readonly action: "answer" | "open_page" | "transfer";
  readonly enabled: boolean;
  readonly id: string;
  readonly page: "spa" | "hardware-procedures" | "offers" | null;
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
export type AgentSettings = {
  readonly enabled: boolean;
  readonly tone: string;
  readonly language: string;
  readonly greeting: string;
  readonly bookingUrl: string;
  readonly canCheckAvailability: boolean;
  readonly canCreateRequest: boolean;
  readonly canTransferToEmployee: boolean;
  readonly canCreateBooking: false;
  readonly collectName: boolean;
  readonly collectPhone: boolean;
  readonly collectGuestsCount: boolean;
  readonly collectDates: boolean;
  readonly showAiDisclosure: boolean;
  readonly notifyOnAiReply: boolean;
  readonly disclosureText: string;
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
export const deleteAgentScenario = (id: string) =>
  apiClient.delete(`/admin/agent-scenarios/scenarios/${id}`, {
    headers: headers(),
  });
export const deleteAgentTransferRule = (id: string) =>
  apiClient.delete(`/admin/agent-scenarios/transfer-rules/${id}`, {
    headers: headers(),
  });
export const loadAgentSettings = (signal?: AbortSignal) =>
  apiClient.get<{ settings: AgentSettings | null }>(
    "/admin/agent-scenarios/settings",
    { headers: headers(), signal },
  );
export const saveAgentSettings = (input: AgentSettings) =>
  apiClient.put<{ settings: AgentSettings }>(
    "/admin/agent-scenarios/settings",
    input,
    { headers: headers() },
  );
