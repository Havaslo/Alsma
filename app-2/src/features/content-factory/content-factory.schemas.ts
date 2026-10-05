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

const channelListQuerySchema = z
  .string()
  .transform((value) => value.split(",").filter(Boolean))
  .pipe(
    z
      .array(contentChannelSchema)
      .min(1)
      .max(5)
      .refine((channels) => new Set(channels).size === channels.length),
  );

const sourcePhotoQueryFields = {
  sourceTitle: z.string().trim().min(1).max(255),
  sourceCategory: z.string().trim().min(1).max(120),
  sourceTags: z
    .string()
    .max(800)
    .transform((value) => value.split("|").filter(Boolean))
    .pipe(z.array(z.string().trim().min(1).max(80)).max(20)),
};

export const contentFactoryTextGenerationQuerySchema = z.object({
  prompt: z.string().trim().min(1).max(4_000),
  selectedChannels: channelListQuerySchema,
  ...sourcePhotoQueryFields,
});

export const contentFactoryTextRefinementBodySchema = z.object({
  action: z.enum(["shorter", "regenerate", "sales", "calmer", "custom"]),
  currentText: z.string().trim().min(1).max(20_000),
  customInstruction: z.string().trim().max(2_000).optional(),
  prompt: z.string().trim().min(1).max(4_000),
  referencePhotoBase64: z
    .string()
    .min(1)
    .max(10_000_000)
    .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u),
  selectedChannels: z
    .array(contentChannelSchema)
    .min(1)
    .max(5)
    .refine((channels) => new Set(channels).size === channels.length),
  ...sourcePhotoQueryFields,
});

export const contentFactoryImageGenerationQuerySchema = z.object({
  prompt: z.string().trim().min(1).max(2_000),
  channel: contentChannelSchema,
  ...sourcePhotoQueryFields,
});

export type ContentFactoryDraftBody = z.infer<
  typeof contentFactoryDraftBodySchema
>;
export type ContentFactoryTextRefinementBody = z.infer<
  typeof contentFactoryTextRefinementBodySchema
>;
