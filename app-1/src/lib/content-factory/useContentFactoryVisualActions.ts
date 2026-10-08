import { contentFactoryErrorMessage } from "@/lib/content-factory/contentFactoryApi";
import {
  CONTENT_CHANNELS,
  type ContentChannel,
  type DraftVariant,
  getDraftVariantImageIds,
  getDraftVariantSourceImageIds,
} from "@/lib/content-factory/contentFactoryData";
import { findMatchingFactoryMedia } from "@/lib/content-factory/contentFactoryImageMatching";
import type {
  ContentFactoryDraftSnapshot,
  ImageGenerationMode,
} from "@/lib/content-factory/contentFactoryTypes";
import type { useContentFactoryPersistence } from "@/lib/content-factory/useContentFactoryPersistence";
import type { useContentFactoryState } from "@/lib/content-factory/useContentFactoryState";

type Factory = ReturnType<typeof useContentFactoryState>;
type Persistence = ReturnType<typeof useContentFactoryPersistence>;

export const useContentFactoryVisualActions = (input: {
  factory: Factory;
  persistence: Persistence;
}) => {
  const saveSnapshot = async (
    draftId: string | null,
    snapshot: ContentFactoryDraftSnapshot,
    title: string,
  ) => {
    const saved = await input.persistence.saveDraft(draftId, {
      snapshot,
      title,
    });
    input.factory.setCurrentDraftId(saved.id);
    return saved.id;
  };

  const generateVisualsForVariant = async (options?: {
    variant?: DraftVariant;
    snapshot?: ContentFactoryDraftSnapshot;
    variantIndex?: number;
    draftId?: string | null;
    forceGenerate?: boolean;
  }): Promise<boolean> => {
    const snapshot = options?.snapshot ?? input.factory.getDraftSnapshot();
    const variantIndex = options?.variantIndex ?? input.factory.variantIndex;
    const variant =
      snapshot.variants[variantIndex] ??
      options?.variant ??
      input.factory.activeVariant;
    const selectedChannels = snapshot.selectedChannels;
    const requestedCount = snapshot.imageCount ?? input.factory.imageCount;
    if (requestedCount === 0) return true;
    if (!selectedChannels.length) {
      input.factory.setNotice("Сначала выберите хотя бы один канал.");
      return false;
    }

    const brief = snapshot.brief ?? input.factory.brief;
    const sourceMode =
      snapshot.imageSourceMode ?? input.factory.imageSourceMode;
    const matchedMedia =
      sourceMode === "generate"
        ? []
        : findMatchingFactoryMedia({
            mediaItems: input.persistence.mediaItems,
            prompt: snapshot.prompt,
            brief,
            count: requestedCount,
          });
    const existingCount = Math.max(
      0,
      ...selectedChannels.map(
        (channel) => getDraftVariantImageIds(variant, channel).length,
      ),
    );
    const coveredCount = Math.max(existingCount, matchedMedia.length);
    const generatedCount =
      sourceMode === "generate" && !existingCount
        ? requestedCount
        : sourceMode === "automatic" || options?.forceGenerate
          ? Math.max(0, requestedCount - coveredCount)
          : 0;

    try {
      const generatedAssets = generatedCount
        ? await input.persistence.generateImage({
            imageCount: generatedCount,
            mode: "generate",
            prompt: brief.imagePrompt,
            postText: variant.text,
            selectedChannels,
            references: [],
          })
        : {};
      const generatedMedia = Object.values(generatedAssets).flatMap(
        (assets) => assets ?? [],
      );
      const allNewImageIds = [
        ...new Set([
          ...matchedMedia.map(({ id }) => id),
          ...generatedMedia.map(({ id }) => id),
        ]),
      ];
      const channelImageGalleryIds = Object.fromEntries(
        CONTENT_CHANNELS.map(({ id }) => {
          if (!selectedChannels.includes(id)) {
            return [id, getDraftVariantImageIds(variant, id)];
          }
          return [
            id,
            [
              ...new Set([
                ...getDraftVariantImageIds(variant, id),
                ...matchedMedia.map(({ id: mediaId }) => mediaId),
                ...(generatedAssets[id] ?? []).map(
                  ({ id: mediaId }) => mediaId,
                ),
              ]),
            ],
          ];
        }),
      ) as Record<ContentChannel, string[]>;
      const channelImageIds = Object.fromEntries(
        CONTENT_CHANNELS.map(({ id }) => [
          id,
          channelImageGalleryIds[id][0] ?? "",
        ]),
      ) as Record<ContentChannel, string>;
      const updatedVariant: DraftVariant = {
        ...variant,
        imageId: variant.imageId || allNewImageIds[0] || "",
        sourceImageIds: [
          ...new Set([
            ...getDraftVariantSourceImageIds(variant),
            ...allNewImageIds,
          ]),
        ],
        channelImageIds,
        channelImageGalleryIds,
      };
      input.factory.updateVariantAt(variantIndex, () => updatedVariant);
      const nextSnapshot = {
        ...snapshot,
        variants: snapshot.variants.map((item, index) =>
          index === variantIndex ? updatedVariant : item,
        ),
      };
      await saveSnapshot(
        options?.draftId ?? input.factory.currentDraftId,
        nextSnapshot,
        updatedVariant.title.trim() ||
          snapshot.prompt.slice(0, 255) ||
          "Новая AI-публикация",
      );

      if (
        sourceMode === "library" &&
        matchedMedia.length < requestedCount &&
        !options?.forceGenerate
      ) {
        input.factory.setNotice(
          matchedMedia.length
            ? `В медиатеке найдено ${matchedMedia.length} из ${requestedCount} подходящих изображений. Остальные не создавались; можно создать недостающие с нуля.`
            : "В медиатеке не нашлось подходящих фото. Нажмите «Создать изображения», если хотите получить новые через AI.",
        );
      } else if (generatedCount > 0) {
        input.factory.setNotice(
          `Визуал готов: ${matchedMedia.length} изображений взято из медиатеки, ${generatedCount} создано ИИ. Черновик сохранён; публикации не отправлялись.`,
        );
      } else if (matchedMedia.length) {
        input.factory.setNotice(
          `Агент подобрал ${matchedMedia.length} изображений из медиатеки и сохранил их в черновике.`,
        );
      }
      return true;
    } catch (error) {
      input.factory.setNotice(
        `Текст уже готов. ${contentFactoryErrorMessage(error, "Не удалось создать изображения.")} Нажмите кнопку на карточке визуала, чтобы повторить отдельно.`,
      );
      return false;
    }
  };

  const reorderChannelImages = async (
    channel: ContentChannel,
    imageIds: string[],
  ) => {
    const snapshot = input.factory.getDraftSnapshot();
    const variant = input.factory.activeVariant;
    const channelImageGalleryIds = {
      ...Object.fromEntries(
        CONTENT_CHANNELS.map(({ id }) => [
          id,
          getDraftVariantImageIds(variant, id),
        ]),
      ),
      [channel]: imageIds,
    } as Record<ContentChannel, string[]>;
    const updatedVariant = {
      ...variant,
      channelImageGalleryIds,
      channelImageIds: {
        ...variant.channelImageIds,
        [channel]: imageIds[0] ?? "",
      },
    };
    input.factory.updateCurrentVariant(() => updatedVariant);
    try {
      await saveSnapshot(
        input.factory.currentDraftId,
        {
          ...snapshot,
          variants: snapshot.variants.map((item, index) =>
            index === input.factory.variantIndex ? updatedVariant : item,
          ),
        },
        updatedVariant.title.trim() || "Новая AI-публикация",
      );
      input.factory.setNotice(
        "Порядок изображений изменён и сохранён в черновике.",
      );
      return true;
    } catch (error) {
      input.factory.setNotice(
        contentFactoryErrorMessage(
          error,
          "Не удалось сохранить порядок изображений.",
        ),
      );
      return false;
    }
  };

  const generateImage = async (mode: ImageGenerationMode, prompt: string) => {
    const selectedChannels = input.factory.selectedChannels;
    const source =
      mode === "edit"
        ? input.persistence.mediaItems.find(
            ({ id }) => id === input.factory.activeVariant.imageId,
          )
        : undefined;
    if (!selectedChannels.length || (mode === "edit" && !source)) {
      input.factory.setNotice(
        mode === "edit"
          ? "Выберите фото для редактирования или сгенерируйте изображение с нуля."
          : "Сначала выберите хотя бы один канал.",
      );
      return false;
    }
    try {
      const generated = await input.persistence.generateImage({
        imageCount: 1,
        mode,
        prompt,
        postText: input.factory.activeVariant.text,
        selectedChannels,
        references: source ? [source] : [],
      });
      const snapshot = input.factory.getDraftSnapshot();
      const variant = input.factory.activeVariant;
      const galleries = Object.fromEntries(
        CONTENT_CHANNELS.map(({ id }) => [
          id,
          getDraftVariantImageIds(variant, id),
        ]),
      ) as Record<ContentChannel, string[]>;
      for (const channel of selectedChannels) {
        galleries[channel] = [
          ...new Set([
            ...galleries[channel],
            ...(generated[channel] ?? []).map(({ id }) => id),
          ]),
        ];
      }
      const generatedIds = Object.values(generated).flatMap(
        (assets) => assets?.map(({ id }) => id) ?? [],
      );
      const updatedVariant = {
        ...variant,
        imageId: generated[selectedChannels[0]!]?.[0]?.id ?? variant.imageId,
        sourceImageIds: [
          ...new Set([
            ...getDraftVariantSourceImageIds(variant),
            ...generatedIds,
          ]),
        ],
        channelImageGalleryIds: galleries,
        channelImageIds: Object.fromEntries(
          CONTENT_CHANNELS.map(({ id }) => [id, galleries[id][0] ?? ""]),
        ) as Record<ContentChannel, string>,
      };
      input.factory.updateCurrentVariant(() => updatedVariant);
      await saveSnapshot(
        input.factory.currentDraftId,
        {
          ...snapshot,
          variants: snapshot.variants.map((item, index) =>
            index === input.factory.variantIndex ? updatedVariant : item,
          ),
        },
        updatedVariant.title.trim() || "Новая AI-публикация",
      );
      input.factory.setNotice("Изображение готово и добавлено в черновик.");
      return true;
    } catch (error) {
      input.factory.setNotice(
        contentFactoryErrorMessage(error, "Не удалось создать изображение."),
      );
      return false;
    }
  };

  return { generateVisualsForVariant, generateImage, reorderChannelImages };
};
