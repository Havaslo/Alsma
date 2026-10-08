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

const contentFactoryBriefSchema = z.object({
  postType: z.string().trim().max(80).optional(),
  format: z.string().trim().max(80).optional(),
  audience: z.string().trim().max(500).optional(),
  keyFacts: z.string().trim().max(2_000).optional(),
  callToAction: z.string().trim().max(500).optional(),
  styleGuidance: z.string().trim().max(1_000).optional(),
  imagePrompt: z.string().trim().max(2_000).optional(),
  sourceImageRecommendation: z.string().trim().max(500).optional(),
});

const imageSourceModeSchema = z.enum(["automatic", "library", "generate"]);

const draftVariantSchema = z.object({
  id: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(120),
  title: z.string().max(255),
  concept: z.string().max(4_000),
  text: z.string().max(20_000),
  imageId: z.string().max(120),
  channelImageGalleryIds: z
    .object({
      vk: z.array(z.string().max(120)).max(4),
      telegram: z.array(z.string().max(120)).max(4),
      max: z.array(z.string().max(120)).max(4),
      instagram: z.array(z.string().max(120)).max(4),
      zen: z.array(z.string().max(120)).max(4),
    })
    .optional(),
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

export const contentFactoryImageGenerationJobParamsSchema = z.object({
  jobId: z.uuid(),
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
    brief: contentFactoryBriefSchema.optional(),
    imageCount: z.number().int().min(0).max(4).optional(),
    imageSourceMode: imageSourceModeSchema.optional(),
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

const sourcePhotoDescriptionFields = {
  sourceTitle: z.string().trim().min(1).max(255),
  sourceCategory: z.string().trim().min(1).max(120),
};

const sourcePhotoQueryFields = {
  ...sourcePhotoDescriptionFields,
  sourceTags: z
    .string()
    .max(800)
    .transform((value) => value.split("|").filter(Boolean))
    .pipe(z.array(z.string().trim().min(1).max(80)).max(20)),
};

const sourcePhotoBodyFields = {
  ...sourcePhotoDescriptionFields,
  sourceTags: z.array(z.string().trim().min(1).max(80)).max(20),
};

export const contentFactoryTextGenerationQuerySchema = z.object({
  prompt: z.string().trim().min(1).max(4_000),
  selectedChannels: channelListQuerySchema,
  ...sourcePhotoQueryFields,
});

export const contentFactoryTextGenerationBodySchema = z.object({
  prompt: z.string().trim().min(1).max(4_000),
  selectedChannels: z
    .array(contentChannelSchema)
    .min(1)
    .max(5)
    .refine((channels) => new Set(channels).size === channels.length),
  brief: contentFactoryBriefSchema.optional(),
});

export const contentFactoryTextRefinementBodySchema = z
  .object({
    action: z.enum(["shorter", "regenerate", "sales", "calmer", "custom"]),
    currentText: z.string().trim().min(1).max(20_000),
    customInstruction: z.string().trim().max(2_000).optional(),
    prompt: z.string().trim().min(1).max(4_000),
    brief: contentFactoryBriefSchema.optional(),
    referencePhotoBase64: z
      .string()
      .min(1)
      .max(10_000_000)
      .regex(
        /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u,
      )
      .optional(),
    selectedChannels: z
      .array(contentChannelSchema)
      .min(1)
      .max(5)
      .refine((channels) => new Set(channels).size === channels.length),
    sourceTitle: sourcePhotoDescriptionFields.sourceTitle.optional(),
    sourceCategory: sourcePhotoDescriptionFields.sourceCategory.optional(),
    sourceTags: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  })
  .superRefine((input, context) => {
    if (
      input.referencePhotoBase64 &&
      (!input.sourceTitle || !input.sourceCategory || !input.sourceTags)
    ) {
      context.addIssue({
        code: "custom",
        path: ["referencePhotoBase64"],
        message: "Для исходного фото нужно передать его описание.",
      });
    }
  });

const contentFactoryImageSourceSchema = z.object({
  imageBase64: z
    .string()
    .min(1)
    .max(10_000_000)
    .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u),
  sourceCategory: z.string().trim().min(1).max(120),
  sourceTags: z.array(z.string().trim().min(1).max(80)).max(20),
  sourceTitle: z.string().trim().min(1).max(255),
});

export const contentFactoryImageGenerationBodySchema = z
  .object({
    imageCount: z.number().int().min(1).max(4).default(1),
    mode: z.enum(["edit", "generate"]).default("edit"),
    prompt: z.string().trim().max(2_000).default(""),
    postText: z.string().trim().min(1).max(20_000),
    selectedChannels: z
      .array(contentChannelSchema)
      .min(1)
      .max(5)
      .refine((channels) => new Set(channels).size === channels.length),
    referencePhotos: z.array(contentFactoryImageSourceSchema).max(4).optional(),
    // Keep the one-photo request shape accepted while older previews are still open.
    referencePhotoBase64: z
      .string()
      .min(1)
      .max(8_500_000)
      .regex(
        /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u,
      )
      .optional(),
    sourceTitle: z.string().trim().min(1).max(255).optional(),
    sourceCategory: z.string().trim().min(1).max(120).optional(),
    sourceTags: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  })
  .superRefine((input, context) => {
    const legacyPhoto = input.referencePhotoBase64
      ? [input.referencePhotoBase64]
      : [];
    const encodedPhotos =
      input.referencePhotos?.map((photo) => photo.imageBase64) ?? legacyPhoto;
    if (input.mode === "edit" && encodedPhotos.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["referencePhotos"],
        message: "Для редактирования добавьте хотя бы одно исходное фото.",
      });
    }
    const encodedSize = encodedPhotos.reduce(
      (total, photo) => total + photo.length,
      0,
    );
    if (encodedSize > 10_700_000) {
      context.addIssue({
        code: "custom",
        path: ["referencePhotos"],
        message: "Общий размер исходных фото слишком велик для одного запроса.",
      });
    }
    if (
      input.referencePhotoBase64 &&
      (!input.sourceTitle || !input.sourceCategory || !input.sourceTags)
    ) {
      context.addIssue({
        code: "custom",
        path: ["referencePhotoBase64"],
        message: "Для исходного фото нужно передать его описание.",
      });
    }
  })
  .transform(
    ({
      referencePhotoBase64,
      sourceTitle,
      sourceCategory,
      sourceTags,
      ...input
    }) => ({
      ...input,
      referencePhotos:
        input.referencePhotos ??
        (referencePhotoBase64 && sourceTitle && sourceCategory && sourceTags
          ? [
              {
                imageBase64: referencePhotoBase64,
                sourceTitle,
                sourceCategory,
                sourceTags,
              },
            ]
          : []),
    }),
  );

export type ContentFactoryDraftBody = z.infer<
  typeof contentFactoryDraftBodySchema
>;
export type ContentFactoryTextGenerationBody = z.infer<
  typeof contentFactoryTextGenerationBodySchema
>;
export type ContentFactoryTextRefinementBody = z.infer<
  typeof contentFactoryTextRefinementBodySchema
>;
export type ContentFactoryImageGenerationBody = z.infer<
  typeof contentFactoryImageGenerationBodySchema
>;
