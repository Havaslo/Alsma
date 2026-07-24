import { HttpError } from "../../lib/http/http-error.js";
import { hashPassword } from "../admin-auth/password.js";
import type { AdminSettingsRepository } from "./admin-settings.repository.js";
import type {
  AdminRoleBody,
  AdminUserBody,
  CreateAdminUserBody,
} from "./admin-settings.schemas.js";

const applyPermissionOverrides = (
  rolePermissions: readonly string[],
  overrides: AdminUserBody["permissionOverrides"],
) => {
  const permissions = new Set(rolePermissions);
  Object.entries(overrides).forEach(([permission, enabled]) => {
    if (enabled === true) permissions.add(permission);
    if (enabled === false) permissions.delete(permission);
  });
  return permissions;
};

export const createAdminSettingsService = (
  repository: AdminSettingsRepository,
) => ({
  createRole: (input: AdminRoleBody) => repository.createRole(input),
  createUser: async (input: CreateAdminUserBody) => {
    const email = input.email.toLowerCase();
    if (await repository.findUserByEmail(email))
      throw new HttpError(
        409,
        "ADMIN_EMAIL_EXISTS",
        "Пользователь с такой почтой уже существует.",
      );
    const { password, ...user } = input;
    return repository.createUser({
      ...user,
      email,
      passwordHash: await hashPassword(password),
    });
  },
  deleteUser: (id: string, actorId: string) => {
    if (id === actorId)
      throw new HttpError(
        400,
        "ADMIN_SELF_DELETE_FORBIDDEN",
        "Нельзя удалить собственную учётную запись.",
      );
    return repository.deleteUser(id);
  },
  list: repository.list,
  updateRole: (id: string, input: AdminRoleBody) =>
    repository.updateRole(id, input),
  updateUser: async (id: string, input: AdminUserBody, actorId: string) => {
    const email = input.email.toLowerCase();
    const duplicate = await repository.findUserByEmail(email);
    if (duplicate && duplicate.id !== id)
      throw new HttpError(
        409,
        "ADMIN_EMAIL_EXISTS",
        "Пользователь с такой почтой уже существует.",
      );
    if (id === actorId) {
      if (input.status !== "active")
        throw new HttpError(
          400,
          "ADMIN_SELF_DISABLE_FORBIDDEN",
          "Нельзя отключить собственную учётную запись.",
        );
      const permissions = applyPermissionOverrides(
        input.roleId ? await repository.findRolePermissions(input.roleId) : [],
        input.permissionOverrides,
      );
      if (!permissions.has("*") && !permissions.has("settings.access"))
        throw new HttpError(
          400,
          "ADMIN_SELF_ACCESS_FORBIDDEN",
          "Нельзя убрать у себя доступ к настройкам.",
        );
    }
    const { password, ...user } = input;
    return repository.updateUser(id, {
      ...user,
      email,
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
    });
  },
});
export type AdminSettingsService = ReturnType<
  typeof createAdminSettingsService
>;
