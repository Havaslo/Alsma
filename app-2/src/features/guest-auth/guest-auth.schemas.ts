import { z } from "zod";

export const requestCodeBodySchema = z.object({
  contact: z.email(),
});

export const verifyCodeBodySchema = z.object({
  code: z.string().regex(/^\d{4}$/),
  pendingCodeId: z.uuid(),
});

export const completeProfileBodySchema = z.object({
  fullName: z.string().trim().min(2).max(160),
});

export type CompleteProfileBody = z.infer<typeof completeProfileBodySchema>;
export type RequestCodeBody = z.infer<typeof requestCodeBodySchema>;
export type VerifyCodeBody = z.infer<typeof verifyCodeBodySchema>;
