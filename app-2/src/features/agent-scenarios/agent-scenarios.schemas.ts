import { z } from "zod";

export const agentScenarioBodySchema = z.object({
  action: z.enum(["answer", "open_page", "transfer"]).default("answer"),
  enabled: z.boolean().default(true),
  channels: z
    .array(z.enum(["text", "voice"]))
    .min(1)
    .default(["text"]),
  id: z.string().uuid().optional(),
  page: z.enum(["spa", "hardware-procedures", "offers"]).nullable().optional(),
  response: z.string().trim().min(1).max(10_000),
  title: z.string().trim().min(1).max(255),
  trigger: z.string().trim().min(1).max(255),
});

export const agentTransferRuleBodySchema = z.object({
  condition: z.string().trim().min(1).max(10_000),
  destination: z.string().trim().min(1).max(255),
  enabled: z.boolean().default(true),
  channels: z
    .array(z.enum(["text", "voice"]))
    .min(1)
    .default(["text"]),
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(255),
});

export const agentSettingsSchema = z
  .object({
    enabled: z.boolean(),
    site: z.boolean().default(true),
    voice: z.boolean().default(true),
    vk: z.boolean().default(true),
    max: z.boolean().default(true),
    tone: z.string().trim().min(1).max(2_000),
    language: z.string().trim().min(1).max(500),
    greeting: z.string().trim().min(1).max(2_000),
    bookingUrl: z.string().trim().min(1).max(2_000),
    canCheckAvailability: z.boolean(),
    canCreateRequest: z.boolean(),
    canTransferToEmployee: z.boolean(),
    canCreateBooking: z.literal(false),
    collectName: z.boolean(),
    collectPhone: z.boolean(),
    collectGuestsCount: z.boolean(),
    collectDates: z.boolean(),
    showAiDisclosure: z.boolean(),
    notifyOnAiReply: z.boolean(),
    disclosureText: z.string().trim().min(1).max(500),
  })
  .strict();

export type AgentScenarioBody = z.infer<typeof agentScenarioBodySchema>;
export type AgentTransferRuleBody = z.infer<typeof agentTransferRuleBodySchema>;
export type AgentSettingsBody = z.infer<typeof agentSettingsSchema>;
