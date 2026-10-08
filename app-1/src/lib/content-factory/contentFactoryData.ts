export const CONTENT_CHANNELS = [
  { id: "vk", label: "VK", shortLabel: "VK" },
  { id: "telegram", label: "Telegram", shortLabel: "TG" },
  { id: "max", label: "Max", shortLabel: "M" },
  { id: "instagram", label: "Instagram", shortLabel: "IG" },
  { id: "zen", label: "Яндекс.Дзен", shortLabel: "Д" },
] as const;

export type ContentChannel = (typeof CONTENT_CHANNELS)[number]["id"];

export const getChannelLabel = (channel: ContentChannel) =>
  CONTENT_CHANNELS.find((item) => item.id === channel)?.label ?? channel;

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
    zen: "",
  },
  channelImageGalleryIds: {
    vk: [],
    telegram: [],
    max: [],
    instagram: [],
    zen: [],
  },
  adaptations: {
    vk: "",
    telegram: "",
    max: "",
    instagram: "",
    zen: "",
  },
});

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
  channels: ContentChannel[];
  status: PlanStatus;
  imageId: string;
  postType?: string;
  format?: string;
  text?: string;
  imagePrompt?: string;
  sourceImageRecommendation?: string;
  generationError?: string | null;
  sourceStatus?: string;
  audience?: string;
  keyFacts?: string;
  callToAction?: string;
  styleGuidance?: string;
  importFileName?: string;
}
