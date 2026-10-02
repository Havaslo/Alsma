import { z } from "zod";

const contentChannelSchema = z.enum([
  "vk",
  "telegram",
  "max",
  "instagram",
  "zen",
]);

const channelTextSchema = z.object({
  vk: z.string().max(20_000),
  telegram: z.string().max(20_000),
  max: z.string().max(20_000),
  instagram: z.string().max(20_000),
  zen: z.string().max(20_000),
});

const draftVariantSchema = z.object({
  id: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(120),
  title: z.string().max(255),
  concept: z.string().max(4_000),
  text: z.string().max(20_000),
  imageId: z.string().max(120),
  channelImageIds: z.object({
    vk: z.string().max(120),
    telegram: z.string().max(120),
    max: z.string().max(120),
    instagram: z.string().max(120),
    zen: z.string().max(120),
  }),
  adaptations: channelTextSchema,
});

export const contentFactoryDraftParamsSchema = z.object({
  draftId: z.uuid(),
});

export const contentFactoryDraftBodySchema = z.object({
  title: z.string().trim().min(1).max(255),
  snapshot: z.object({
    prompt: z.string().max(4_000),
    selectedChannels: z
      .array(contentChannelSchema)
      .max(5)
      .refine((channels) => new Set(channels).size === channels.length),
    variantIndex: z.number().int().min(0).max(9),
    variants: z.array(draftVariantSchema).min(1).max(10),
  }),
});

export const contentFactoryUploadQuerySchema = z.object({
  fileName: z.string().trim().min(1).max(255),
});

export const contentFactoryTextGenerationBodySchema = z.object({
  prompt: z.string().trim().min(1).max(4_000),
  selectedChannels: z
    .array(contentChannelSchema)
    .min(1)
    .max(5)
    .refine((channels) => new Set(channels).size === channels.length),
});

export const contentFactoryImageGenerationBodySchema = z.object({
  prompt: z.string().trim().min(1).max(2_000),
});

export type ContentFactoryDraftBody = z.infer<
  typeof contentFactoryDraftBodySchema
>;
