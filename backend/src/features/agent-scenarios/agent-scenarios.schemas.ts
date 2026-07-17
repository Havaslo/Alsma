import { z } from "zod";

export const agentScenarioBodySchema = z.object({
  enabled: z.boolean().default(true),
  id: z.string().uuid().optional(),
  response: z.string().trim().min(1).max(10_000),
  title: z.string().trim().min(1).max(255),
  trigger: z.string().trim().min(1).max(255),
});

export const agentTransferRuleBodySchema = z.object({
  condition: z.string().trim().min(1).max(10_000),
  destination: z.string().trim().min(1).max(255),
  enabled: z.boolean().default(true),
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(255),
});

export type AgentScenarioBody = z.infer<typeof agentScenarioBodySchema>;
export type AgentTransferRuleBody = z.infer<typeof agentTransferRuleBodySchema>;
