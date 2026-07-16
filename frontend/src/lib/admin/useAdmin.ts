import { useQueryClient } from "@tanstack/react-query";

import {
  loadAdmin,
  loadAdminLeads,
  updateAdminLead,
} from "@/lib/admin/admin-api";
import { useApiMutation } from "@/lib/query/use-api-mutation";
import { useApiQuery } from "@/lib/query/use-api-query";

export const ADMIN_QUERY_KEY = ["admin"] as const;
export const ADMIN_LEADS_QUERY_KEY = ["admin-leads"] as const;
export const useAdmin = () =>
  useApiQuery(ADMIN_QUERY_KEY, (signal) => loadAdmin(signal));
export const useAdminLeads = () =>
  useApiQuery(ADMIN_LEADS_QUERY_KEY, (signal) => loadAdminLeads(signal));
export const useUpdateAdminLead = () => {
  const client = useQueryClient();
  return useApiMutation(updateAdminLead, {
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ADMIN_LEADS_QUERY_KEY }),
    successMessage: "Статус заявки обновлён",
  });
};
