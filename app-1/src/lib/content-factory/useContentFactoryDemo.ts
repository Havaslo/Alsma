import { useState } from "react";

import {
  CONTENT_CHANNELS,
  type ContentChannel,
  DEMO_VARIANTS,
  type DraftVariant,
  type FactoryMediaItem,
  MEDIA_ITEMS,
  type PlanPublication,
  getDraftVariantImageIds,
  getDraftVariantSourceImageIds,
} from "@/lib/content-factory/contentFactoryData";
import type {
  ContentFactoryDraftSnapshot,
  SavedContentFactoryDraft,
  WorkspaceSection,
} from "@/lib/content-factory/contentFactoryTypes";

const DEMO_PROMPT = "Сделай пост про ноябрьскую акцию на SPA со скидкой 20%";

export const useContentFactoryDemo = (
  mediaItems: FactoryMediaItem[] = MEDIA_ITEMS,
) => {
  const [activeSection, setActiveSection] =
    useState<WorkspaceSection>("create");
  const [prompt, setPrompt] = useState(DEMO_PROMPT);
  const [variants, setVariants] = useState(DEMO_VARIANTS);
  const [variantIndex, setVariantIndex] = useState(0);
  const [activeChannel, setActiveChannel] = useState<ContentChannel>("vk");
  const [mediaTargetChannel, setMediaTargetChannel] =
    useState<ContentChannel | null>(null);
  const [selectingSourceMedia, setSelectingSourceMedia] = useState(false);
  const [selectedSourceMediaIds, setSelectedSourceMediaIds] = useState<
    string[]
  >([]);
  const [selectedChannels, setSelectedChannels] = useState<ContentChannel[]>([
    "vk",
    "telegram",
    "instagram",
  ]);
  const [notice, setNotice] = useState("");
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

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

  const applyMedia = (
    media: FactoryMediaItem,
    channelOverride?: ContentChannel,
  ) => {
    const targetChannel = channelOverride ?? mediaTargetChannel;
    const targetLabel = targetChannel
      ? CONTENT_CHANNELS.find((item) => item.id === targetChannel)?.label
      : null;
    updateCurrentVariant((variant) => {
      if (targetChannel) {
        return {
          ...variant,
          channelImageIds: {
            ...variant.channelImageIds,
            [targetChannel]: media.id,
          },
          channelImageGalleryIds: {
            ...(Object.fromEntries(
              CONTENT_CHANNELS.map(({ id }) => [
                id,
                id === targetChannel
                  ? [media.id]
                  : getDraftVariantImageIds(variant, id),
              ]),
            ) as Record<ContentChannel, string[]>),
          },
        };
      }
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
    setMediaTargetChannel(null);
    setActiveSection("create");
    setNotice(
      targetLabel
        ? `Визуал «${media.title}» выбран для ${targetLabel}.`
        : `Выбран визуал «${media.title}». Он добавлен в текущий черновик.`,
    );
  };

  const useMedia = (mediaId: string) => {
    const media = mediaItems.find((item) => item.id === mediaId);
    if (media) applyMedia(media);
  };

  const browseMainImage = () => {
    setMediaTargetChannel(null);
    setSelectedSourceMediaIds(getDraftVariantSourceImageIds(activeVariant));
    setSelectingSourceMedia(true);
    setActiveSection("media");
  };

  const browseChannelImage = (channel: ContentChannel) => {
    setMediaTargetChannel(channel);
    setSelectingSourceMedia(false);
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
        sourceImageIds: [
          mediaId,
          ...sourceImageIds.filter((id) => id !== mediaId),
        ],
      };
    });
  };

  const installGeneratedVariants = (nextVariants: DraftVariant[]) => {
    setVariants(nextVariants);
    setVariantIndex(0);
    setCurrentDraftId(null);
  };

  const openPlanPost = (post: PlanPublication) => {
    setPrompt(post.title);
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
    setNotice(`Открыт материал «${post.title}» для редактирования.`);
    setActiveSection("create");
  };

  const openDraft = (draft: SavedContentFactoryDraft) => {
    setCurrentDraftId(draft.id);
    setPrompt(draft.snapshot.prompt);
    setSelectedChannels(draft.snapshot.selectedChannels);
    setVariants(draft.snapshot.variants);
    setVariantIndex(
      Math.min(draft.snapshot.variantIndex, draft.snapshot.variants.length - 1),
    );
    setNotice(`Открыт черновик «${draft.title}».`);
    setActiveSection("create");
  };

  const getDraftSnapshot = (): ContentFactoryDraftSnapshot => ({
    prompt,
    selectedChannels,
    variantIndex,
    variants,
  });

  return {
    activeChannel,
    activeSection,
    activeVariant,
    browseChannelImage,
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
    mediaTargetChannel,
    selectingSourceMedia,
    selectedSourceMediaIds,
    setCurrentDraftId,
    setActiveChannel,
    setActiveSection,
    setNotice,
    setPrompt,
    setSelectedChannels,
    setVariantIndex,
    toggleChannel,
    toggleSourceMedia,
    addSourceMedia,
    removeSourceMedia,
    setPrimarySourceMedia,
    updateAdaptation,
    updateCurrentVariant,
    useMedia,
    variantIndex,
    variants,
  };
};
