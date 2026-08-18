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
export const updateClientBodySchema = z
  .object({
    email: z.string().trim().email().max(255).nullable(),
    fullName: z.string().trim().min(1).max(255),
    phone: z.string().trim().max(50).nullable(),
  })
  .refine((input) => input.email || input.phone, {
    message: "У клиента должен остаться телефон или почта.",
  });
export const createBookingBodySchema = z
  .object({
    adminRequestId: z.uuid(),
    checkInDate: z.coerce.date(),
    checkOutDate: z.coerce.date(),
    email: z.string().trim().email().max(255).nullable().default(null),
    guestName: z.string().trim().min(1).max(255),
    guestsCount: z.number().int().min(1).max(20),
    phone: z.string().trim().min(3).max(50),
    roomName: z.string().trim().min(1).max(255),
  })
  .refine((input) => input.checkOutDate > input.checkInDate, {
    message: "Дата выезда должна быть позже даты заезда.",
  });
export type AdminOperationsQuery = z.infer<typeof adminOperationsQuerySchema>;
export type RecordParams = z.infer<typeof recordParamsSchema>;
export type UpdateBonusBody = z.infer<typeof updateBonusBodySchema>;
export type UpdateClientBody = z.infer<typeof updateClientBodySchema>;
export type CreateBookingBody = z.infer<typeof createBookingBodySchema>;
export type UpdateRequestStatusBody = z.infer<
  typeof updateRequestStatusBodySchema
>;
