import { z } from "zod";

export const adminCredentialsSchema = z.object({
  email: z
    .email()
    .max(320)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(5).max(200),
});

export const initializeAdminBodySchema = adminCredentialsSchema.extend({
  displayName: z.string().trim().min(2).max(160),
});

export type AdminCredentials = z.infer<typeof adminCredentialsSchema>;
export type InitializeAdminBody = z.infer<typeof initializeAdminBodySchema>;
