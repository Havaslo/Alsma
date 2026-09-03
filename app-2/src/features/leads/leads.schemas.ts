import { z } from "zod";

export const createLeadBodySchema = z.object({
  checkInDate: z.iso.date().optional(),
  checkOutDate: z.iso.date().optional(),
  comment: z.string().trim().max(2_000).optional(),
  email: z.email().max(320).optional(),
  appointmentTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid appointment time")
    .optional(),
  formCode: z.string().trim().min(1).max(120),
  formTitle: z.string().trim().min(1).max(200),
  guestsCount: z.number().int().min(1).max(20).optional(),
  name: z.string().trim().min(1).max(160).optional(),
  phone: z.string().trim().min(5).max(40).optional(),
  sourcePage: z.string().trim().min(1).max(120),
});

export type CreateLeadBody = z.infer<typeof createLeadBodySchema>;
