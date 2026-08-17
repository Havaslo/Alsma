import { useQueryClient } from "@tanstack/react-query";

import {
  completeManagerTask,
  createAdminBooking,
  deleteAdminClient,
  loadAdmin,
  loadAdminAnalytics,
  loadAdminBookings,
  loadAdminClient,
  loadAdminClients,
  loadAdminLeads,
  loadAdminRequests,
  loadIntegrationStatuses,
  loadManagerTasks,
  markBookingPaid,
  updateAdminClient,
  updateAdminLead,
  updateAdminRequest,
  updateClientBonus,
} from "@/lib/admin/admin-api";
import { useApiMutation } from "@/lib/query/use-api-mutation";
import { useApiQuery } from "@/lib/query/use-api-query";

export const ADMIN_QUERY_KEY = ["admin"] as const;
export const ADMIN_LEADS_QUERY_KEY = ["admin-leads"] as const;
export const ADMIN_OPERATIONS_QUERY_KEY = ["admin-operations"] as const;
export const useAdmin = () =>
  useApiQuery(ADMIN_QUERY_KEY, (signal) => loadAdmin(signal));
export const useAdminLeads = (enabled = true) =>
  useApiQuery(ADMIN_LEADS_QUERY_KEY, (signal) => loadAdminLeads(signal), {
    enabled,
  });
export const useUpdateAdminLead = () => {
  const client = useQueryClient();
  return useApiMutation(updateAdminLead, {
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ADMIN_LEADS_QUERY_KEY }),
    successMessage: "Статус заявки обновлён",
  });
};
export const useAdminBookings = () =>
  useApiQuery([...ADMIN_OPERATIONS_QUERY_KEY, "bookings"], (signal) =>
    loadAdminBookings(signal),
  );
export const useAdminClients = () =>
  useApiQuery([...ADMIN_OPERATIONS_QUERY_KEY, "clients"], (signal) =>
    loadAdminClients(signal),
  );
export const useAdminClient = (recordId: string) =>
  useApiQuery(
    [...ADMIN_OPERATIONS_QUERY_KEY, "clients", recordId],
    (signal) => loadAdminClient(recordId, signal),
    { enabled: Boolean(recordId) },
  );
export const useAdminRequests = () =>
  useApiQuery(
    [...ADMIN_OPERATIONS_QUERY_KEY, "requests"],
    (signal) => loadAdminRequests(signal),
    { refetchInterval: 3_000 },
  );
export const useAdminAnalytics = (start: string, end: string) =>
  useApiQuery(
    [...ADMIN_OPERATIONS_QUERY_KEY, "analytics", start, end],
    (signal) => loadAdminAnalytics(start, end, signal),
    { enabled: Boolean(start && end) },
  );
export const useIntegrationStatuses = () =>
  useApiQuery(
    ["admin-integrations", "status"],
    (signal) => loadIntegrationStatuses(signal),
    { refetchInterval: 30_000 },
  );
export const useManagerTasks = () =>
  useApiQuery([...ADMIN_OPERATIONS_QUERY_KEY, "tasks"], (signal) =>
    loadManagerTasks(signal),
  );
export const useCompleteManagerTask = () => {
  const client = useQueryClient();
  return useApiMutation(completeManagerTask, {
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ADMIN_OPERATIONS_QUERY_KEY }),
    successMessage: "Задача выполнена",
  });
};
export const useMarkBookingPaid = () => {
  const client = useQueryClient();
  return useApiMutation(markBookingPaid, {
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ADMIN_OPERATIONS_QUERY_KEY }),
    successMessage: "Оплата отмечена",
  });
};
export const useCreateAdminBooking = () => {
  const client = useQueryClient();
  return useApiMutation(createAdminBooking, {
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ADMIN_OPERATIONS_QUERY_KEY }),
    successMessage: "Заявка на бронирование создана",
  });
};
export const useUpdateAdminClient = () => {
  const client = useQueryClient();
  return useApiMutation(updateAdminClient, {
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ADMIN_OPERATIONS_QUERY_KEY }),
    successMessage: "Данные клиента обновлены",
  });
};
export const useDeleteAdminClient = () => {
  const client = useQueryClient();
  return useApiMutation(deleteAdminClient, {
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ADMIN_OPERATIONS_QUERY_KEY }),
    successMessage: "Клиент удалён",
  });
};
export const useUpdateClientBonus = () => {
  const client = useQueryClient();
  return useApiMutation(updateClientBonus, {
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ADMIN_OPERATIONS_QUERY_KEY }),
    successMessage: "Бонусы обновлены",
  });
};
export const useUpdateAdminRequest = () => {
  const client = useQueryClient();
  return useApiMutation(updateAdminRequest, {
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ADMIN_OPERATIONS_QUERY_KEY }),
    successMessage: "Обращение обновлено",
  });
};
