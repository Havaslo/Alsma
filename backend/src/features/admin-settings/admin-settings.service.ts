import { hashPassword } from "../admin-auth/password.js";
import type { AdminSettingsRepository } from "./admin-settings.repository.js";
import type { AdminRoleBody, AdminUserBody } from "./admin-settings.schemas.js";

export const createAdminSettingsService = (
  repository: AdminSettingsRepository,
) => ({
  createRole: (input: AdminRoleBody) => repository.createRole(input),
  createUser: async (input: AdminUserBody) => {
    const { password = "TempPass123", ...user } = input;
    return repository.createUser({
      ...user,
      email: user.email.toLowerCase(),
      passwordHash: await hashPassword(password),
    });
  },
  deleteUser: (id: string) => repository.deleteUser(id),
  list: repository.list,
  updateRole: (id: string, input: AdminRoleBody) =>
    repository.updateRole(id, input),
  updateUser: async (id: string, input: AdminUserBody) => {
    const { password, ...user } = input;
    return repository.updateUser(id, {
      ...user,
      email: user.email.toLowerCase(),
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
    });
  },
});
export type AdminSettingsService = ReturnType<
  typeof createAdminSettingsService
>;
