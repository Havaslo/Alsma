import { z } from "zod";

export const loginBodySchema = z.object({
  email: z.string().trim().pipe(z.email()),
});

export const completeProfileBodySchema = z.object({
  fullName: z.string().trim().min(2).max(160),
});

export type CompleteProfileBody = z.infer<typeof completeProfileBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
