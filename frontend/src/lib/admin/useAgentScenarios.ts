import { useQueryClient } from "@tanstack/react-query";

import {
  loadAgentScenarios,
  saveAgentScenario,
  saveAgentTransferRule,
} from "@/lib/admin/agent-scenarios-api";
import { useApiMutation } from "@/lib/query/use-api-mutation";
import { useApiQuery } from "@/lib/query/use-api-query";

const KEY = ["admin-agent-scenarios"] as const;
export const useAgentScenarios = () => useApiQuery(KEY, loadAgentScenarios);
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
