import { z } from "zod";

import { paginationQuerySchema } from "../../lib/http/pagination.js";

export const adminOperationsQuerySchema = paginationQuerySchema;
export const recordParamsSchema = z.object({ recordId: z.uuid() });
export const updateRequestStatusBodySchema = z.object({
  status: z.enum(["new", "processing", "completed", "cancelled"]),
});
export const updateBonusBodySchema = z.object({
  balance: z.number().int().min(0).max(10_000_000),
  level: z.string().trim().min(1).max(80),
});
export type AdminOperationsQuery = z.infer<typeof adminOperationsQuerySchema>;
export type RecordParams = z.infer<typeof recordParamsSchema>;
export type UpdateBonusBody = z.infer<typeof updateBonusBodySchema>;
export type UpdateRequestStatusBody = z.infer<
  typeof updateRequestStatusBodySchema
>;
