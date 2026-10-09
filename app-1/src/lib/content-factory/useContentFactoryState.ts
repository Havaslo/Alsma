import { useEffect, useState } from "react";

import {
  type ContentChannel,
  type DraftVariant,
  type FactoryMediaItem,
  type PlanPublication,
  createEmptyDraftVariant,
  getDraftVariantSourceImageIds,
} from "@/lib/content-factory/contentFactoryData";
import type {
  ContentFactoryBrief,
  ContentFactoryDraftSnapshot,
  ContentFactoryImageSourceMode,
  SavedContentFactoryDraft,
  WorkspaceSection,
} from "@/lib/content-factory/contentFactoryTypes";
import {
  readContentFactoryWorkspaceCache,
  saveContentFactoryWorkspaceCache,
} from "@/lib/content-factory/contentFactoryWorkspaceCache";

export const useContentFactoryState = (mediaItems: FactoryMediaItem[]) => {
  const [cachedWorkspace] = useState(readContentFactoryWorkspaceCache);
  const cachedSnapshot = cachedWorkspace?.snapshot;
  const [activeSection, setActiveSection] =
    useState<WorkspaceSection>("create");
  const [prompt, setPrompt] = useState(cachedSnapshot?.prompt ?? "");
  const [brief, setBrief] = useState<ContentFactoryBrief>(
    cachedSnapshot?.brief ?? {
      postType: "",
      format: "",
      audience: "",
      keyFacts: "",
      callToAction: "",
      styleGuidance: "",
      imagePrompt: "",
      sourceImageRecommendation: "",
    },
  );
  const [imageCount, setImageCount] = useState(cachedSnapshot?.imageCount ?? 1);
  const [imageSourceMode, setImageSourceMode] =
    useState<ContentFactoryImageSourceMode>(
      cachedSnapshot?.imageSourceMode ?? "automatic",
    );
  const [step, setStep] = useState<1 | 2 | 3>(cachedWorkspace?.step ?? 1);
  const [variants, setVariants] = useState<DraftVariant[]>(
    cachedSnapshot?.variants ?? [createEmptyDraftVariant()],
  );
  const [variantIndex, setVariantIndex] = useState(
    cachedSnapshot?.variantIndex ?? 0,
  );
  const [activeChannel, setActiveChannel] = useState<ContentChannel>(
    cachedWorkspace?.activeChannel ?? "vk",
  );
  const [selectingSourceMedia, setSelectingSourceMedia] = useState(false);
  const [selectedSourceMediaIds, setSelectedSourceMediaIds] = useState<
    string[]
  >([]);
  const [selectedChannels, setSelectedChannels] = useState<ContentChannel[]>(
    cachedSnapshot?.selectedChannels ?? [],
  );
  const [notice, setNotice] = useState(
    cachedWorkspace
      ? "Восстановил создание после обновления страницы. Продолжайте с сохранённого шага."
      : "",
  );
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(
    cachedWorkspace?.currentDraftId ?? null,
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      saveContentFactoryWorkspaceCache({
        snapshot: {
          prompt,
          selectedChannels,
          brief,
          imageCount,
          imageSourceMode,
          variantIndex,
          variants,
        },
        step,
        activeChannel,
        currentDraftId,
      });
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [
    activeChannel,
    brief,
    currentDraftId,
    imageCount,
    imageSourceMode,
    prompt,
    selectedChannels,
    step,
    variantIndex,
    variants,
  ]);

  const activeVariant = variants[variantIndex] ?? variants[0];

  const updateCurrentVariant = (
    update: (variant: DraftVariant) => DraftVariant,
  ) => {
    setVariants((current) =>
      current.map((variant, index) =>
        index === variantIndex ? update(variant) : variant,
      ),
    );
  };

  const updateVariantAt = (
    index: number,
    update: (variant: DraftVariant) => DraftVariant,
  ) => {
    setVariants((current) =>
      current.map((variant, itemIndex) =>
        itemIndex === index ? update(variant) : variant,
      ),
    );
  };

  const toggleChannel = (channel: ContentChannel) => {
    setSelectedChannels((current) =>
      current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel],
    );
  };

  const selectVariant = (index: number) => {
    setVariantIndex(index);
  };

  const updateAdaptation = (channel: ContentChannel, text: string) => {
    updateCurrentVariant((variant) => ({
      ...variant,
      adaptations: { ...variant.adaptations, [channel]: text },
    }));
  };

  const applyMedia = (media: FactoryMediaItem) => {
    updateCurrentVariant((variant) => {
      return {
        ...variant,
        imageId: media.id,
        channelImageIds: {
          vk: media.id,
          telegram: media.id,
          max: media.id,
          instagram: media.id,
          zen: media.id,
        },
        channelImageGalleryIds: {
          vk: [media.id],
          telegram: [media.id],
          max: [media.id],
          instagram: [media.id],
          zen: [media.id],
        },
      };
    });
    setActiveSection("create");
    setNotice(
      `Выбран визуал «${media.title}». Он добавлен в текущий черновик.`,
    );
  };

  const useMedia = (mediaId: string) => {
    const media = mediaItems.find((item) => item.id === mediaId);
    if (media) applyMedia(media);
  };

  const browseMainImage = () => {
    setSelectedSourceMediaIds(getDraftVariantSourceImageIds(activeVariant));
    setSelectingSourceMedia(true);
    setActiveSection("media");
  };

  const toggleSourceMedia = (mediaId: string) => {
    setSelectedSourceMediaIds((current) => {
      if (current.includes(mediaId)) {
        return current.filter((id) => id !== mediaId);
      }
      return [...current, mediaId];
    });
  };

  const addSourceMedia = () => {
    const nextSourceIds = [...new Set(selectedSourceMediaIds)];
    if (!nextSourceIds.length) return;
    updateCurrentVariant((variant) => {
      const currentSourceIds = getDraftVariantSourceImageIds(variant);
      const newSourceIds = nextSourceIds.filter(
        (id) => !currentSourceIds.includes(id),
      );
      const sourceImageIds = [
        ...new Set([...currentSourceIds, ...nextSourceIds]),
      ];
      return {
        ...variant,
        imageId:
          newSourceIds.at(-1) ?? variant.imageId ?? nextSourceIds[0] ?? "",
        sourceImageIds,
      };
    });
    setSelectingSourceMedia(false);
    setActiveSection("create");
    setNotice(`К исходным материалам добавлено фото: ${nextSourceIds.length}.`);
  };

  const removeSourceMedia = (mediaId: string) => {
    updateCurrentVariant((variant) => {
      const current = getDraftVariantSourceImageIds(variant);
      const sourceImageIds = current.filter((id) => id !== mediaId);
      return {
        ...variant,
        imageId:
          variant.imageId === mediaId
            ? (sourceImageIds[0] ?? "")
            : variant.imageId,
        sourceImageIds,
      };
    });
  };

  const setPrimarySourceMedia = (mediaId: string) => {
    updateCurrentVariant((variant) => {
      const sourceImageIds = getDraftVariantSourceImageIds(variant);
      if (!sourceImageIds.includes(mediaId)) return variant;
      return {
        ...variant,
        imageId: mediaId,
        sourceImageIds,
      };
    });
  };

  const setSourceMedia = (mediaIds: string[]) => {
    const sourceImageIds = [...new Set(mediaIds.filter(Boolean))].slice(0, 4);
    updateCurrentVariant((variant) => ({
      ...variant,
      imageId: sourceImageIds.includes(variant.imageId)
        ? variant.imageId
        : (sourceImageIds[0] ?? ""),
      sourceImageIds,
    }));
    setNotice(`Выбрано фото для редактирования: ${sourceImageIds.length}.`);
  };

  const installGeneratedVariants = (nextVariants: DraftVariant[]) => {
    setVariants(nextVariants);
    setVariantIndex(0);
    setCurrentDraftId(null);
    setStep(2);
  };

  const openPlanPost = (post: PlanPublication) => {
    setPrompt(post.title);
    setBrief({
      postType: post.postType ?? "",
      format: post.format ?? "",
      audience: post.audience ?? "",
      keyFacts: post.keyFacts ?? "",
      callToAction: post.callToAction ?? "",
      styleGuidance: post.styleGuidance ?? "",
      imagePrompt: post.imagePrompt ?? "",
      sourceImageRecommendation: post.sourceImageRecommendation ?? "",
    });
    setSelectedChannels(post.channels);
    setActiveChannel(post.channels[0] ?? "vk");
    const image = mediaItems.find((item) => item.id === post.imageId);
    if (image) {
      const channelImageIds: Record<ContentChannel, string> = {
        vk: image.id,
        telegram: image.id,
        max: image.id,
        instagram: image.id,
        zen: image.id,
      };
      const channelImageGalleryIds: Record<ContentChannel, string[]> = {
        vk: [image.id],
        telegram: [image.id],
        max: [image.id],
        instagram: [image.id],
        zen: [image.id],
      };
      setVariants((current) =>
        current.map((variant, index) =>
          index === variantIndex
            ? {
                ...variant,
                channelImageGalleryIds,
                imageId: image.id,
                sourceImageIds: [image.id],
                channelImageIds,
              }
            : variant,
        ),
      );
    }
    setCurrentDraftId(null);
    setStep(1);
    setNotice(`Открыт материал «${post.title}» для редактирования.`);
    setActiveSection("create");
  };

  const openDraft = (draft: SavedContentFactoryDraft) => {
    setCurrentDraftId(draft.id);
    setPrompt(draft.snapshot.prompt);
    setSelectedChannels(draft.snapshot.selectedChannels);
    setBrief(
      draft.snapshot.brief ?? {
        postType: "",
        format: "",
        audience: "",
        keyFacts: "",
        callToAction: "",
        styleGuidance: "",
        imagePrompt: "",
        sourceImageRecommendation: "",
      },
    );
    setImageCount(draft.snapshot.imageCount ?? 1);
    setImageSourceMode(draft.snapshot.imageSourceMode ?? "automatic");
    setVariants(draft.snapshot.variants);
    setVariantIndex(
      Math.min(draft.snapshot.variantIndex, draft.snapshot.variants.length - 1),
    );
    setNotice(`Открыт черновик «${draft.title}».`);
    setStep(2);
    setActiveSection("create");
  };

  const getDraftSnapshot = (): ContentFactoryDraftSnapshot => ({
    prompt,
    selectedChannels,
    brief,
    imageCount,
    imageSourceMode,
    variantIndex,
    variants,
  });

  return {
    activeChannel,
    activeSection,
    activeVariant,
    brief,
    browseMainImage,
    currentDraftId,
    getDraftSnapshot,
    installGeneratedVariants,
    notice,
    openDraft,
    openPlanPost,
    prompt,
    selectVariant,
    selectedChannels,
    imageCount,
    imageSourceMode,
    step,
    selectingSourceMedia,
    selectedSourceMediaIds,
    setCurrentDraftId,
    setActiveChannel,
    setActiveSection,
    setBrief,
    setImageCount,
    setImageSourceMode,
    setStep,
    setNotice,
    setPrompt,
    setSelectedChannels,
    setVariantIndex,
    toggleChannel,
    toggleSourceMedia,
    addSourceMedia,
    removeSourceMedia,
    setPrimarySourceMedia,
    setSourceMedia,
    updateAdaptation,
    updateCurrentVariant,
    updateVariantAt,
    useMedia,
    variantIndex,
    variants,
  };
};
