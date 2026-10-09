import {
  CONTENT_CHANNELS,
  type ContentChannel,
  type DraftVariant,
} from "@/lib/content-factory/contentFactoryData";
import type {
  ContentFactoryBrief,
  ContentFactoryDraftSnapshot,
  ContentFactoryImageSourceMode,
} from "@/lib/content-factory/contentFactoryTypes";

const CACHE_KEY = "alsma:content-factory:workspace:v1";
const CACHE_VERSION = 1;
const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const briefFields: Array<keyof ContentFactoryBrief> = [
  "postType",
  "format",
  "audience",
  "keyFacts",
  "callToAction",
  "styleGuidance",
  "imagePrompt",
  "sourceImageRecommendation",
];

export interface CachedContentFactoryWorkspace {
  snapshot: ContentFactoryDraftSnapshot;
  step: 1 | 2 | 3;
  activeChannel: ContentChannel;
  currentDraftId: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isChannel = (value: unknown): value is ContentChannel =>
  typeof value === "string" &&
  CONTENT_CHANNELS.some((channel) => channel.id === value);

const isChannelStringRecord = (value: unknown): boolean =>
  isRecord(value) &&
  CONTENT_CHANNELS.every(({ id }) => typeof value[id] === "string");

const isDraftVariant = (value: unknown): value is DraftVariant => {
  if (!isRecord(value)) return false;
  if (
    typeof value.id !== "string" ||
    typeof value.label !== "string" ||
    typeof value.title !== "string" ||
    typeof value.concept !== "string" ||
    typeof value.text !== "string" ||
    typeof value.imageId !== "string" ||
    !isChannelStringRecord(value.channelImageIds) ||
    !isChannelStringRecord(value.adaptations)
  ) {
    return false;
  }
  if (
    value.sourceImageIds !== undefined &&
    (!Array.isArray(value.sourceImageIds) ||
      !value.sourceImageIds.every((id) => typeof id === "string"))
  ) {
    return false;
  }
  if (value.channelImageGalleryIds === undefined) return true;
  const galleries = value.channelImageGalleryIds;
  if (!isRecord(galleries)) return false;
  return CONTENT_CHANNELS.every(({ id }) => {
    const gallery = galleries[id];
    return (
      Array.isArray(gallery) &&
      gallery.length <= 4 &&
      gallery.every((imageId) => typeof imageId === "string")
    );
  });
};

const isBrief = (value: unknown): value is ContentFactoryBrief =>
  isRecord(value) &&
  briefFields.every((field) => typeof value[field] === "string");

const isImageSourceMode = (
  value: unknown,
): value is ContentFactoryImageSourceMode =>
  value === "automatic" || value === "library" || value === "generate";

const parseCachedWorkspace = (
  value: unknown,
): CachedContentFactoryWorkspace | null => {
  if (!isRecord(value) || value.version !== CACHE_VERSION) return null;
  if (
    typeof value.savedAt !== "number" ||
    value.savedAt > Date.now() ||
    Date.now() - value.savedAt > CACHE_MAX_AGE_MS ||
    (value.step !== 1 && value.step !== 2 && value.step !== 3) ||
    !isChannel(value.activeChannel) ||
    !(
      typeof value.currentDraftId === "string" || value.currentDraftId === null
    ) ||
    !isRecord(value.snapshot)
  ) {
    return null;
  }

  const snapshot = value.snapshot;
  if (
    typeof snapshot.prompt !== "string" ||
    !Array.isArray(snapshot.selectedChannels) ||
    snapshot.selectedChannels.length > CONTENT_CHANNELS.length ||
    !snapshot.selectedChannels.every(isChannel) ||
    new Set(snapshot.selectedChannels).size !==
      snapshot.selectedChannels.length ||
    !Number.isInteger(snapshot.variantIndex) ||
    !Array.isArray(snapshot.variants) ||
    snapshot.variants.length < 1 ||
    snapshot.variants.length > 10 ||
    !snapshot.variants.every(isDraftVariant) ||
    !isBrief(snapshot.brief) ||
    !Number.isInteger(snapshot.imageCount) ||
    (snapshot.imageCount as number) < 0 ||
    (snapshot.imageCount as number) > 4 ||
    !isImageSourceMode(snapshot.imageSourceMode)
  ) {
    return null;
  }

  const typedSnapshot = snapshot as unknown as ContentFactoryDraftSnapshot;
  return {
    snapshot: {
      ...typedSnapshot,
      variantIndex: Math.min(
        Math.max(0, typedSnapshot.variantIndex),
        typedSnapshot.variants.length - 1,
      ),
    },
    step: value.step,
    activeChannel: value.activeChannel,
    currentDraftId: value.currentDraftId,
  };
};

export const readContentFactoryWorkspaceCache =
  (): CachedContentFactoryWorkspace | null => {
    try {
      if (typeof window === "undefined") return null;
      const stored = window.sessionStorage.getItem(CACHE_KEY);
      const workspace = stored
        ? parseCachedWorkspace(JSON.parse(stored) as unknown)
        : null;
      if (
        workspace &&
        workspace.step > 1 &&
        !workspace.snapshot.variants.some((variant) => variant.text.trim())
      ) {
        return null;
      }
      return workspace;
    } catch {
      return null;
    }
  };

export const saveContentFactoryWorkspaceCache = (
  workspace: CachedContentFactoryWorkspace,
): void => {
  try {
    if (typeof window === "undefined") return;
    const hasWork =
      workspace.snapshot.prompt.trim().length > 0 ||
      workspace.snapshot.variants.some((variant) => variant.text.trim());
    if (!hasWork) {
      window.sessionStorage.removeItem(CACHE_KEY);
      return;
    }
    window.sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        ...workspace,
        version: CACHE_VERSION,
        savedAt: Date.now(),
      }),
    );
  } catch {
    // A full or unavailable session store should not block editing or generation.
  }
};
