import { z } from "zod";

export const createCallBodySchema = z.object({
  providerCallId: z.string().trim().min(1).optional(),
  callerPhone: z.string().trim().min(3).max(40).optional(),
  recordingUrl: z.string().url().optional(),
});

export const callParamsSchema = z.object({ callId: z.string().uuid() });
export const providerCallParamsSchema = z.object({
  providerCallId: z.string().trim().min(1).max(200),
});

export const transcriptBodySchema = z.object({
  role: z.enum([
    "guest",
    "assistant",
    "manager",
    "speaker_0",
    "speaker_1",
    "speaker_2",
    "speaker_3",
  ]),
  text: z.string().trim().min(1).max(10_000),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional(),
  providerEventId: z.string().trim().min(1).max(200).optional(),
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

const mangoIdentifier = z.string().trim().min(1).max(128);
const mangoTimestamp = z.coerce.number().int().nonnegative();
export const mangoTransferResultSchema = z.object({
  command_id: mangoIdentifier,
  result: z
    .union([
      z.number().int(),
      z
        .string()
        .regex(/^\d{1,6}$/u)
        .transform(Number),
    ])
    .pipe(z.number().int().min(0).max(999_999)),
});
const mangoPartySchema = z
  .object({
    number: z.string().trim().min(3).max(80).optional(),
    extension: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();

export const mangoCallEventSchema = z
  .object({
    entry_id: mangoIdentifier,
    call_id: mangoIdentifier,
    timestamp: mangoTimestamp,
    seq: z.coerce.number().int().nonnegative().optional(),
    call_state: z.enum(["Appeared", "Connected", "OnHold", "Disconnected"]),
    location: z.enum(["ivr", "queue", "abonent"]).optional(),
    from: mangoPartySchema.optional(),
    to: mangoPartySchema.optional(),
    disconnect_reason: z.union([z.string(), z.number()]).optional(),
    sip_call_id: mangoIdentifier.optional(),
  })
  .passthrough();

export const mangoSummaryEventSchema = z
  .object({
    entry_id: mangoIdentifier,
    call_direction: z.coerce.number().int().min(0).max(2),
    from: mangoPartySchema.optional(),
    to: mangoPartySchema.optional(),
    line_number: z.string().trim().max(80).optional(),
    create_time: mangoTimestamp,
    forward_time: mangoTimestamp.optional(),
    talk_time: mangoTimestamp.optional(),
    end_time: mangoTimestamp,
    entry_result: z.coerce.number().int().min(0).max(1),
    disconnect_reason: z.union([z.string(), z.number()]).optional(),
    sip_call_id: mangoIdentifier.optional(),
  })
  .passthrough();

export const mangoRecordingEventSchema = z
  .object({
    recording_id: mangoIdentifier,
    recording_state: z.enum(["Started", "Continued", "Completed"]),
    seq: z.coerce.number().int().nonnegative().optional(),
    entry_id: mangoIdentifier,
    call_id: mangoIdentifier,
    timestamp: mangoTimestamp,
    completion_code: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();

export const mangoRecordingAddedEventSchema = z
  .object({
    entry_id: mangoIdentifier,
    product_id: z.union([z.string(), z.number()]),
    user_id: z.union([z.string(), z.number()]),
    timestamp: mangoTimestamp,
    recording_id: mangoIdentifier,
  })
  .passthrough();

export const toolBodySchema = z.discriminatedUnion("name", [
  z.object({
    name: z.literal("knowledge_answer"),
    callId: z.string().uuid().optional(),
    question: z.string().trim().min(1).max(4_000),
  }),
  z.object({
    name: z.literal("get_events"),
    callId: z.string().uuid().optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
  z.object({
    name: z.literal("create_booking_request"),
    callId: z.string().uuid(),
    extracted: z.record(z.string(), z.unknown()).default({}),
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
