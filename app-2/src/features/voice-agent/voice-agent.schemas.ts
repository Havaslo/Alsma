import { z } from "zod";

export const createCallBodySchema = z.object({
  providerCallId: z.string().trim().min(1).optional(),
  callerPhone: z.string().trim().min(3).max(40).optional(),
  recordingUrl: z.string().url().optional(),
});

export const callParamsSchema = z.object({ callId: z.string().uuid() });

export const transcriptBodySchema = z.object({
  role: z.enum(["guest", "assistant", "manager"]),
  text: z.string().trim().min(1).max(10_000),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional(),
});

export const completeCallBodySchema = z.object({
  outcome: z.string().trim().max(120).optional(),
  recordingUrl: z.string().url().optional(),
});

export const answerBodySchema = z.object({
  callId: z.string().uuid().optional(),
  question: z.string().trim().min(1).max(4_000),
});

export type CreateCallBody = z.infer<typeof createCallBodySchema>;
export type TranscriptBody = z.infer<typeof transcriptBodySchema>;
