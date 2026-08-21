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
  recordingObjectId: z.string().trim().min(1).max(300).optional(),
});

export const answerBodySchema = z.object({
  callId: z.string().uuid().optional(),
  question: z.string().trim().min(1).max(4_000),
});

export const mangoWebhookBodySchema = z.object({
  event: z.string().trim().min(1).max(80),
  callId: z.string().trim().min(1).max(200),
  callerPhone: z.string().trim().min(3).max(40).optional(),
  status: z.string().trim().max(80).optional(),
  recordingUrl: z.string().url().optional(),
  transcript: z.array(transcriptBodySchema).optional(),
  extracted: z.record(z.string(), z.unknown()).optional(),
});

export const toolBodySchema = z.discriminatedUnion("name", [
  z.object({
    name: z.literal("knowledge_answer"),
    callId: z.string().uuid().optional(),
    question: z.string().trim().min(1).max(4_000),
  }),
  z.object({
    name: z.literal("check_availability"),
    callId: z.string().uuid().optional(),
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    adults: z.number().int().min(1).max(20),
    children: z.array(z.number().int().min(0).max(17)).max(20).default([]),
    roomCount: z.number().int().min(1).max(20).default(1),
  }),
  z.object({
    name: z.literal("create_booking_request"),
    callId: z.string().uuid(),
    extracted: z.record(z.string(), z.unknown()),
    comment: z.string().trim().max(4_000).optional(),
  }),
  z.object({
    name: z.literal("transfer_to_manager"),
    callId: z.string().uuid(),
    reason: z.string().trim().min(1).max(500),
  }),
]);

export const voiceTestTurnBodySchema = z.object({
  audioBase64: z.string().min(100).max(10_000_000),
  mimeType: z.string().trim().min(3).max(100),
});

export type CreateCallBody = z.infer<typeof createCallBodySchema>;
export type TranscriptBody = z.infer<typeof transcriptBodySchema>;
export type MangoWebhookBody = z.infer<typeof mangoWebhookBodySchema>;
export type ToolBody = z.infer<typeof toolBodySchema>;
export type VoiceTestTurnBody = z.infer<typeof voiceTestTurnBodySchema>;
