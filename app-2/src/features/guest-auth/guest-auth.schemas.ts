import { z } from "zod";

const emailBodySchema = z.object({
  email: z.string().trim().pipe(z.email()),
});
export const loginBodySchema = emailBodySchema.extend({
  legalAcceptance: z.object({
    accepted: z.literal(true),
    pageUrl: z.string().url().max(2_000),
  }),
});
export const verifyCodeBodySchema = emailBodySchema.extend({
  code: z.string().regex(/^\d{4}$/u),
});

export const completeProfileBodySchema = z.object({
  fullName: z.string().trim().min(2).max(160),
});

export type CompleteProfileBody = z.infer<typeof completeProfileBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type VerifyCodeBody = z.infer<typeof verifyCodeBodySchema>;
