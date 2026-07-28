import { z } from "zod";

import { paginationQuerySchema } from "../../lib/http/pagination.js";

export const adminLeadsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(["new", "processing", "completed", "cancelled"]).optional(),
});
export const adminLeadParamsSchema = z.object({ leadId: z.uuid() });
export const updateAdminLeadBodySchema = z.object({
  status: z.enum(["new", "processing", "completed", "cancelled"]),
});
export type AdminLeadsQuery = z.infer<typeof adminLeadsQuerySchema>;
export type AdminLeadParams = z.infer<typeof adminLeadParamsSchema>;
export type UpdateAdminLeadBody = z.infer<typeof updateAdminLeadBodySchema>;
