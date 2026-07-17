import type { Database, DatabaseClient } from "../../lib/database/database.js";
import type { AdminRoleBody, AdminUserBody } from "./admin-settings.schemas.js";

const userInclude = { role: true } as const;
export const createAdminSettingsRepository = (database: Database) => ({
  createRole: (input: AdminRoleBody) =>
    database.client.adminRole.create({ data: input }),
  createUser: (
    input: Omit<AdminUserBody, "password"> & { passwordHash: string },
  ) => database.client.adminUser.create({ data: input, include: userInclude }),
  deleteUser: (id: string) =>
    database.client.adminUser.delete({ where: { id } }),
  list: async () => ({
    roles: await database.client.adminRole.findMany({
      orderBy: { name: "asc" },
    }),
    users: await database.client.adminUser.findMany({
      include: userInclude,
      orderBy: { displayName: "asc" },
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
      include: userInclude,
      where: { id },
    }),
});
export type AdminSettingsRepository = ReturnType<
  typeof createAdminSettingsRepository
>;
