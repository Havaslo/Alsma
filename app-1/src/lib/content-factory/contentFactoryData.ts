export const CONTENT_CHANNELS = [
  { id: "vk", label: "VK", shortLabel: "VK" },
  { id: "telegram", label: "Telegram\\Дзен", shortLabel: "TG/Д" },
  { id: "max", label: "Max", shortLabel: "M" },
  { id: "instagram", label: "Instagram", shortLabel: "IG" },
  { id: "blog", label: "Блог сайта", shortLabel: "Блог" },
] as const;

export type ContentChannel = (typeof CONTENT_CHANNELS)[number]["id"];

/**
 * Канал "zen" больше не выбирается: Дзен получает тот же пост через
 * синхробот Telegram. Значение остаётся для уже созданных публикаций.
 */
export const LEGACY_CONTENT_PLAN_CHANNELS = [
  { id: "zen", label: "Telegram\\Дзен", shortLabel: "TG/Д" },
] as const;

export const CONTENT_PLAN_CHANNELS = [
  ...CONTENT_CHANNELS,
  ...LEGACY_CONTENT_PLAN_CHANNELS,
];

export type ContentPlanChannel = (typeof CONTENT_PLAN_CHANNELS)[number]["id"];

export const getChannelLabel = (channel: string) =>
  CONTENT_PLAN_CHANNELS.find((item) => item.id === channel)?.label ?? channel;

export const normalizeContentChannel = (
  channel: string,
): ContentChannel | null => {
  if (channel === "zen") return "telegram";
  return CONTENT_CHANNELS.find((item) => item.id === channel)?.id ?? null;
};

export const normalizeContentChannels = (
  channels: readonly string[],
): ContentChannel[] => [
  ...new Set(
    channels
      .map(normalizeContentChannel)
      .filter((channel): channel is ContentChannel => channel !== null),
  ),
];

export interface FactoryMediaItem {
  id: string;
  title: string;
  category: string;
  tags: string[];
  image: string;
  subtitle: string;
  contentType?: string;
  origin?: "uploaded" | "generated";
}

export interface DraftVariant {
  id: string;
  label: string;
  title: string;
  concept: string;
  text: string;
  /** Original inputs used as AI references; falls back to imageId for older drafts. */
  sourceImageIds?: string[];
  imageId: string;
  channelImageIds: Record<ContentChannel, string>;
  /** Optional for compatibility with drafts saved before multi-image support. */
  channelImageGalleryIds?: Record<ContentChannel, string[]>;
  adaptations: Record<ContentChannel, string>;
}

export const createEmptyDraftVariant = (): DraftVariant => ({
  id: "new-draft",
  label: "Новый черновик",
  title: "",
  concept: "",
  text: "",
  imageId: "",
  channelImageIds: {
    vk: "",
    telegram: "",
    max: "",
    instagram: "",
    blog: "",
  },
  channelImageGalleryIds: {
    vk: [],
    telegram: [],
    max: [],
    instagram: [],
    blog: [],
  },
  adaptations: {
    vk: "",
    telegram: "",
    max: "",
    instagram: "",
    blog: "",
  },
});

/**
 * Черновики, сохранённые до объединения Telegram и Дзена, хранят отдельные
 * значения для "zen". Переносим их в объединённый канал.
 */
type LegacyChannelFields = {
  channelImageIds?: Record<string, string | undefined>;
  channelImageGalleryIds?: Record<string, string[] | undefined>;
  adaptations?: Record<string, string | undefined>;
};

export const normalizeDraftVariant = (variant: DraftVariant): DraftVariant => {
  const legacy = variant as DraftVariant & LegacyChannelFields;
  const legacyZenGallery = legacy.channelImageGalleryIds?.zen ?? [];
  const telegramGallery = variant.channelImageGalleryIds?.telegram ?? [];
  return {
    ...variant,
    channelImageIds: {
      ...variant.channelImageIds,
      telegram:
        variant.channelImageIds.telegram || legacy.channelImageIds?.zen || "",
      blog: variant.channelImageIds.blog ?? "",
    },
    channelImageGalleryIds: {
      vk: variant.channelImageGalleryIds?.vk ?? [],
      telegram: telegramGallery.length ? telegramGallery : legacyZenGallery,
      max: variant.channelImageGalleryIds?.max ?? [],
      instagram: variant.channelImageGalleryIds?.instagram ?? [],
      blog: variant.channelImageGalleryIds?.blog ?? [],
    },
    adaptations: {
      ...variant.adaptations,
      telegram: variant.adaptations.telegram || legacy.adaptations?.zen || "",
      blog: variant.adaptations.blog ?? "",
    },
  };
};

export const getDraftVariantSourceImageIds = (variant: DraftVariant) => {
  if (variant.sourceImageIds !== undefined) {
    return [...new Set(variant.sourceImageIds.filter(Boolean))];
  }
  return variant.imageId ? [variant.imageId] : [];
};

export const getDraftVariantImageIds = (
  variant: DraftVariant,
  channel: ContentChannel,
) => {
  const galleryIds = variant.channelImageGalleryIds?.[channel]?.filter(Boolean);
  if (galleryIds?.length) return galleryIds;
  const singleImageId = variant.channelImageIds[channel] || variant.imageId;
  return singleImageId ? [singleImageId] : [];
};

export type PlanStatus =
  | "В очереди"
  | "Создаётся"
  | "На проверке"
  | "Одобрен к публикации"
  | "Публикуется"
  | "Требуется проверка"
  | "Ошибка генерации"
  | "Отменён"
  | "Черновик"
  | "На согласовании"
  | "Запланировано"
  | "Опубликовано"
  | "Ошибка";

export interface PlanPublication {
  id: string;
  title: string;
  date: string;
  time: string;
  channels: ContentPlanChannel[];
  status: PlanStatus;
  imageId: string;
  imageIds?: string[];
  postType?: string;
  format?: string;
  text?: string;
  imagePrompt?: string;
  sourceImageRecommendation?: string;
  imageSourceMode?: "library" | "generate" | "edit";
  imageStatus?: "pending" | "processing" | "completed" | "failed" | "skipped";
  imageError?: string | null;
  generationError?: string | null;
  publicationAttemptedAt?: string | null;
  publicationError?: string | null;
  publishedAt?: string | null;
  publishedExternalId?: string | null;
  publishedUrl?: string | null;
  sourceStatus?: string;
  audience?: string;
  keyFacts?: string;
  callToAction?: string;
  styleGuidance?: string;
  importFileName?: string;
}
