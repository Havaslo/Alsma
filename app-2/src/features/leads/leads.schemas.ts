import { z } from "zod";

export const createLeadBodySchema = z.object({
  checkInDate: z.iso.date().optional(),
  checkOutDate: z.iso.date().optional(),
  comment: z.string().trim().max(2_000).optional(),
  email: z.email().max(320).optional(),
  appointmentTime: z
    .string()
    .regex(/^(09|1\d|20|21):([03]0)$/, "Invalid appointment time")
    .refine((value) => value >= "09:00" && value <= "21:00", {
      message: "Appointment time must be between 09:00 and 21:00",
    })
    .optional(),
  formCode: z.string().trim().min(1).max(120),
  formTitle: z.string().trim().min(1).max(200),
  guestsCount: z.number().int().min(1).max(20).optional(),
  name: z.string().trim().min(1).max(160).optional(),
  phone: z.string().trim().min(5).max(40).optional(),
  sourcePage: z.string().trim().min(1).max(120),
});

export type CreateLeadBody = z.infer<typeof createLeadBodySchema>;
