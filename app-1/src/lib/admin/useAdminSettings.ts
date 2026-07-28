import { useQueryClient } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";

import {
  createAdminRole,
  createAdminUser,
  deleteAdminUser,
  loadAdminSettings,
  updateAdminRole,
  updateAdminUser,
} from "@/lib/admin/admin-settings-api";
import { useApiMutation } from "@/lib/query/use-api-mutation";
import { useApiQuery } from "@/lib/query/use-api-query";

const KEY = ["admin-settings"] as const;
export const useAdminSettings = () => useApiQuery(KEY, loadAdminSettings);
const useSettingsMutation = <TData, TVariables>(
  request: (input: TVariables) => Promise<AxiosResponse<TData>>,
  message: string,
) => {
  const client = useQueryClient();
  return useApiMutation(request, {
    onSuccess: () => void client.invalidateQueries({ queryKey: KEY }),
    successMessage: message,
  });
};
export const useCreateAdminRole = () =>
  useSettingsMutation(createAdminRole, "Роль создана");
export const useUpdateAdminRole = () =>
  useSettingsMutation(updateAdminRole, "Роль обновлена");
export const useCreateAdminUser = () =>
  useSettingsMutation(createAdminUser, "Пользователь создан");
export const useUpdateAdminUser = () =>
  useSettingsMutation(updateAdminUser, "Пользователь обновлён");
export const useDeleteAdminUser = () =>
  useSettingsMutation(deleteAdminUser, "Пользователь удалён");
