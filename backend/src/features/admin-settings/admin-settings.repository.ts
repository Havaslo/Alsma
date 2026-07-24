import type { Database, DatabaseClient } from "../../lib/database/database.js";
import type {
  AdminRoleBody,
  AdminUserBody,
  CreateAdminUserBody,
} from "./admin-settings.schemas.js";

const roleSelect = {
  description: true,
  id: true,
  name: true,
  permissions: true,
} as const;
const userSelect = {
  displayName: true,
  email: true,
  id: true,
  permissionOverrides: true,
  role: { select: roleSelect },
  roleId: true,
  status: true,
} as const;
export const createAdminSettingsRepository = (database: Database) => ({
  createRole: (input: AdminRoleBody) =>
    database.client.adminRole.create({ data: input }),
  createUser: (
    input: Omit<CreateAdminUserBody, "password"> & { passwordHash: string },
  ) => database.client.adminUser.create({ data: input, select: userSelect }),
  deleteUser: (id: string) =>
    database.client.adminUser.delete({ where: { id } }),
  findRolePermissions: async (id: string) =>
    (
      await database.client.adminRole.findUnique({
        select: { permissions: true },
        where: { id },
      })
    )?.permissions ?? [],
  findUserByEmail: (email: string) =>
    database.client.adminUser.findUnique({
      select: { id: true },
      where: { email },
    }),
  list: async () => ({
    roles: await database.client.adminRole.findMany({
      orderBy: { name: "asc" },
    }),
    users: await database.client.adminUser.findMany({
      orderBy: { displayName: "asc" },
      select: userSelect,
    }),
  }),
  updateRole: (id: string, input: AdminRoleBody) =>
    database.client.adminRole.update({ data: input, where: { id } }),
  updateUser: (
    id: string,
    input: Parameters<DatabaseClient["adminUser"]["update"]>[0]["data"],
  ) =>
    database.client.adminUser.update({
      data: input,
      select: userSelect,
      where: { id },
    }),
});
export type AdminSettingsRepository = ReturnType<
  typeof createAdminSettingsRepository
>;
