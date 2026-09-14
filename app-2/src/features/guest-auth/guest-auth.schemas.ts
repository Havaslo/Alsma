import { z } from "zod";

export const loginBodySchema = z.object({
  email: z.string().trim().pipe(z.email()),
});
export const verifyCodeBodySchema = loginBodySchema.extend({
  code: z.string().regex(/^\d{4}$/u),
});

export const completeProfileBodySchema = z.object({
  fullName: z.string().trim().min(2).max(160),
});

export type CompleteProfileBody = z.infer<typeof completeProfileBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type VerifyCodeBody = z.infer<typeof verifyCodeBodySchema>;
