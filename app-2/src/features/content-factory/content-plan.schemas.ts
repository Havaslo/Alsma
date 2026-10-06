import { z } from "zod";

export const contentPlanChannelSchema = z.enum([
  "vk",
  "telegram",
  "max",
  "instagram",
  "zen",
]);

const validCalendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u)
  .refine((value) => {
    const parts = value.split("-");
    if (parts.length !== 3) return false;
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() + 1 === month &&
      date.getUTCDate() === day
    );
  });

export const contentPlanPostInputSchema = z.object({
  sourceRow: z.number().int().min(1).max(10_000),
  date: validCalendarDate,
  time: z
    .string()
    .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/u)
    .default("12:00"),
  postType: z.string().trim().min(1).max(120),
  channel: contentPlanChannelSchema,
  format: z.string().trim().min(1).max(120),
  topic: z.string().trim().min(1).max(255),
  audience: z.string().trim().max(1_000).default(""),
  keyFacts: z.string().trim().max(4_000).default(""),
  callToAction: z.string().trim().max(1_000).default(""),
  styleGuidance: z.string().trim().max(2_000).default(""),
  imagePrompt: z.string().trim().max(2_000).default(""),
  sourceImageRecommendation: z.string().trim().max(1_000).default(""),
});

export const contentPlanImportBodySchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  posts: z.array(contentPlanPostInputSchema).min(1).max(50),
});

export const contentPlanFileQuerySchema = z.object({
  fileName: z.string().trim().min(1).max(255),
});

export const contentPlanPostParamsSchema = z.object({
  postId: z.uuid(),
});

export const contentPlanPostUpdateSchema = z
  .object({
    date: validCalendarDate.optional(),
    time: z
      .string()
      .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/u)
      .optional(),
    title: z.string().trim().min(1).max(255).optional(),
    text: z.string().trim().min(1).max(20_000).optional(),
  })
  .refine((input) => Object.keys(input).length > 0);

export const manualContentPlanPostSchema = z.object({
  date: validCalendarDate,
  time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/u),
  title: z.string().trim().min(1).max(255),
  posts: z
    .array(
      z.object({
        channel: contentPlanChannelSchema,
        text: z.string().trim().min(1).max(20_000),
      }),
    )
    .min(1)
    .max(5)
    .refine(
      (posts) =>
        new Set(posts.map((post) => post.channel)).size === posts.length,
    ),
});

export type ContentPlanPostInput = z.infer<typeof contentPlanPostInputSchema>;
export type ContentPlanImportBody = z.infer<typeof contentPlanImportBodySchema>;
export type ContentPlanPostUpdate = z.infer<typeof contentPlanPostUpdateSchema>;
export type ManualContentPlanPost = z.infer<typeof manualContentPlanPostSchema>;
