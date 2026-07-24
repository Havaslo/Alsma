import { z } from "zod";

export const adminPermissions = [
  "content.delete",
  "site.manage",
  "knowledge.manage",
  "dashboard.access",
  "requests.access",
  "leads.access",
  "scenarios.access",
  "settings.access",
  "integrations.access",
] as const;

const permissionSchema = z.enum(adminPermissions);
export const adminRoleBodySchema = z.object({
  description: z.string().trim().max(500).nullable().default(null),
  name: z.string().trim().min(2).max(120),
  permissions: z.array(permissionSchema).default([]),
});
export const adminUserBodySchema = z.object({
  displayName: z.string().trim().min(2).max(255),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(255).optional(),
  permissionOverrides: z
    .partialRecord(permissionSchema, z.boolean().nullable())
    .default({}),
  roleId: z.string().uuid().nullable().default(null),
  status: z.enum(["active", "inactive"]).default("active"),
});
export const createAdminUserBodySchema = adminUserBodySchema.extend({
  password: z.string().min(8).max(255),
});
export const entityIdParamsSchema = z.object({ id: z.string().uuid() });
export type AdminRoleBody = z.infer<typeof adminRoleBodySchema>;
export type CreateAdminUserBody = z.infer<typeof createAdminUserBodySchema>;
export type AdminUserBody = z.infer<typeof adminUserBodySchema>;
