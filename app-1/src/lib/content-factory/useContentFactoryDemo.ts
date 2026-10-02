import { useState } from "react";

import {
  CONTENT_CHANNELS,
  type ContentChannel,
  DEMO_VARIANTS,
  type DraftVariant,
  type FactoryMediaItem,
  MEDIA_ITEMS,
  type PlanPublication,
} from "@/lib/content-factory/contentFactoryData";
import type {
  ContentFactoryDraftSnapshot,
  DraftAction,
  SavedContentFactoryDraft,
  WorkspaceSection,
} from "@/lib/content-factory/contentFactoryTypes";

const DEMO_PROMPT = "Сделай пост про ноябрьскую акцию на SPA со скидкой 20%";

const shortenText = (value: string) => {
  const paragraphs = value.split(/\n\s*\n/).filter(Boolean);
  if (paragraphs.length > 1) return paragraphs.slice(0, 2).join("\n\n");
  return value.split(". ").slice(0, 2).join(". ").trim();
};

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
  const [selectedChannels, setSelectedChannels] = useState<ContentChannel[]>([
    "vk",
    "telegram",
    "instagram",
  ]);
  const [approved, setApproved] = useState(false);
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
    setApproved(false);
  };

  const toggleChannel = (channel: ContentChannel) => {
    setSelectedChannels((current) =>
      current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel],
    );
    setApproved(false);
  };

  const selectVariant = (index: number) => {
    setVariantIndex(index);
    setApproved(false);
  };

  const applyDraftAction = (action: DraftAction) => {
    if (action === "regenerate") {
      setVariantIndex((current) => (current + 1) % variants.length);
      setNotice(
        "Показан другой демонстрационный вариант. Реальная генерация требует подключения AI.",
      );
      setApproved(false);
      return;
    }

    updateCurrentVariant((variant) => {
      if (action === "shorter") {
        return { ...variant, text: shortenText(variant.text) };
      }
      if (action === "sales") {
        const callToAction =
          "Выберите удобный день — условия и доступность уточните при бронировании.";
        return {
          ...variant,
          text: `${variant.text.replace(/\n*Подробности.*$/s, "").trim()}\n\n${callToAction}`,
        };
      }
      return {
        ...variant,
        text: variant.text
          .replaceAll("!", ".")
          .replace("хороший повод", "возможность"),
      };
    });
    setNotice(
      "Изменение применено к демонстрационному тексту. Проверьте результат перед согласованием.",
    );
  };

  const applyCustomCommand = (command: string) => {
    const normalized = command.toLocaleLowerCase("ru-RU");
    if (normalized.includes("корот")) {
      applyDraftAction("shorter");
      return;
    }
    if (normalized.includes("прода")) {
      applyDraftAction("sales");
      return;
    }
    if (normalized.includes("спокой") || normalized.includes("нейтрал")) {
      applyDraftAction("calmer");
      return;
    }
    setNotice(
      "Эта команда пока работает только как макет. Текстовые варианты можно создать AI-кнопкой в задаче слева.",
    );
  };

  const updateAdaptation = (channel: ContentChannel, text: string) => {
    updateCurrentVariant((variant) => ({
      ...variant,
      adaptations: { ...variant.adaptations, [channel]: text },
    }));
  };

  const adaptChannel = (
    channel: ContentChannel,
    action: "shorter" | "rewrite",
  ) => {
    const nextText =
      action === "shorter"
        ? shortenText(activeVariant.adaptations[channel])
        : DEMO_VARIANTS[(variantIndex + 1) % DEMO_VARIANTS.length].adaptations[
            channel
          ];
    updateAdaptation(channel, nextText);
    setNotice(
      `Обновлена демонстрационная версия для ${channel}. Проверьте её перед согласованием.`,
    );
  };

  const applyMedia = (media: FactoryMediaItem) => {
    const targetLabel = mediaTargetChannel
      ? CONTENT_CHANNELS.find((item) => item.id === mediaTargetChannel)?.label
      : null;
    updateCurrentVariant((variant) => {
      if (mediaTargetChannel) {
        return {
          ...variant,
          channelImageIds: {
            ...variant.channelImageIds,
            [mediaTargetChannel]: media.id,
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

  const useGeneratedMedia = (media: FactoryMediaItem) => applyMedia(media);

  const browseMainImage = () => {
    setMediaTargetChannel(null);
    setActiveSection("media");
  };

  const browseChannelImage = (channel: ContentChannel) => {
    setMediaTargetChannel(channel);
    setActiveSection("media");
  };

  const installGeneratedVariants = (nextVariants: DraftVariant[]) => {
    setVariants(nextVariants);
    setVariantIndex(0);
    setCurrentDraftId(null);
    setApproved(false);
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
      setVariants((current) =>
        current.map((variant, index) =>
          index === variantIndex
            ? { ...variant, imageId: image.id, channelImageIds }
            : variant,
        ),
      );
    }
    setApproved(false);
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
    setApproved(false);
    setNotice(`Открыт черновик «${draft.title}».`);
    setActiveSection("create");
  };

  const getDraftSnapshot = (): ContentFactoryDraftSnapshot => ({
    prompt,
    selectedChannels,
    variantIndex,
    variants,
  });

  const approveDraft = () => {
    setApproved(true);
    setNotice(
      "Материал отмечен как согласованный. В тестовом режиме публикация отключена.",
    );
  };
  const explainImageGeneration = () =>
    setNotice(
      "Чтобы создать новое изображение, откройте «Создание» и укажите промт под визуалом.",
    );

  return {
    activeChannel,
    activeSection,
    activeVariant,
    adaptChannel,
    applyCustomCommand,
    applyDraftAction,
    approveDraft,
    approved,
    browseChannelImage,
    browseMainImage,
    currentDraftId,
    explainImageGeneration,
    getDraftSnapshot,
    installGeneratedVariants,
    notice,
    openDraft,
    openPlanPost,
    prompt,
    selectVariant,
    selectedChannels,
    mediaTargetChannel,
    setCurrentDraftId,
    setActiveChannel,
    setActiveSection,
    setNotice,
    setPrompt,
    setSelectedChannels,
    setVariantIndex,
    toggleChannel,
    updateAdaptation,
    updateCurrentVariant,
    useMedia,
    useGeneratedMedia,
    variantIndex,
    variants,
  };
};
