import { useQueryClient } from "@tanstack/react-query";

import {
  deleteAgentScenario,
  deleteAgentTransferRule,
  loadAgentScenarios,
  loadAgentSettings,
  saveAgentScenario,
  saveAgentSettings,
  saveAgentTransferRule,
} from "@/lib/admin/agent-scenarios-api";
import { useApiMutation } from "@/lib/query/use-api-mutation";
import { useApiQuery } from "@/lib/query/use-api-query";

const KEY = ["admin-agent-scenarios"] as const;
const SETTINGS_KEY = ["admin-agent-settings"] as const;
export const useAgentScenarios = () => useApiQuery(KEY, loadAgentScenarios);
export const useAgentSettings = () =>
  useApiQuery(SETTINGS_KEY, loadAgentSettings);
export const useSaveAgentScenario = () => {
  const client = useQueryClient();
  return useApiMutation(saveAgentScenario, {
    onSuccess: () => void client.invalidateQueries({ queryKey: KEY }),
    successMessage: "Сценарий сохранён",
  });
};
export const useSaveAgentTransferRule = () => {
  const client = useQueryClient();
  return useApiMutation(saveAgentTransferRule, {
    onSuccess: () => void client.invalidateQueries({ queryKey: KEY }),
    successMessage: "Правило передачи сохранено",
  });
};
export const useSaveAgentSettings = () => {
  const client = useQueryClient();
  return useApiMutation(saveAgentSettings, {
    onSuccess: () => void client.invalidateQueries({ queryKey: SETTINGS_KEY }),
    successMessage: "Настройки агента сохранены",
  });
};

export const useDeleteAgentScenario = () => {
  const client = useQueryClient();
  return useApiMutation(deleteAgentScenario, {
    onSuccess: () => void client.invalidateQueries({ queryKey: KEY }),
    successMessage: "Сценарий удалён",
  });
};
export const useDeleteAgentTransferRule = () => {
  const client = useQueryClient();
  return useApiMutation(deleteAgentTransferRule, {
    onSuccess: () => void client.invalidateQueries({ queryKey: KEY }),
    successMessage: "Правило удалено",
  });
};
