import { useState } from "react";

import {
  CONTENT_CHANNELS,
  type ContentChannel,
  DEMO_VARIANTS,
  type DraftVariant,
  MEDIA_ITEMS,
  type PlanPublication,
} from "@/lib/content-factory/contentFactoryData";
import type {
  DraftAction,
  WorkspaceSection,
} from "@/lib/content-factory/contentFactoryTypes";

const DEMO_PROMPT = "Сделай пост про ноябрьскую акцию на SPA со скидкой 20%";

const shortenText = (value: string) => {
  const paragraphs = value.split(/\n\s*\n/).filter(Boolean);
  if (paragraphs.length > 1) return paragraphs.slice(0, 2).join("\n\n");
  return value.split(". ").slice(0, 2).join(". ").trim();
};

export const useContentFactoryDemo = () => {
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
      "Команда принята в демо-макете. Для свободной AI-доработки нужно подключить AI-сервис.",
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

  const useMedia = (mediaId: string) => {
    const media = MEDIA_ITEMS.find((item) => item.id === mediaId);
    if (!media) return;
    const targetLabel = mediaTargetChannel
      ? CONTENT_CHANNELS.find((item) => item.id === mediaTargetChannel)?.label
      : null;
    updateCurrentVariant((variant) => {
      if (mediaTargetChannel) {
        return {
          ...variant,
          channelImageIds: {
            ...variant.channelImageIds,
            [mediaTargetChannel]: mediaId,
          },
        };
      }
      return {
        ...variant,
        imageId: mediaId,
        channelImageIds: {
          vk: mediaId,
          telegram: mediaId,
          max: mediaId,
          instagram: mediaId,
          zen: mediaId,
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

  const browseMainImage = () => {
    setMediaTargetChannel(null);
    setActiveSection("media");
  };

  const browseChannelImage = (channel: ContentChannel) => {
    setMediaTargetChannel(channel);
    setActiveSection("media");
  };

  const handleGenerate = () => {
    setNotice(
      "В демо показаны заранее подготовленные варианты. Для генерации по вашему запросу потребуется подключить AI.",
    );
    setApproved(false);
  };

  const openPlanPost = (post: PlanPublication) => {
    setPrompt(post.title);
    setSelectedChannels(post.channels);
    setActiveChannel(post.channels[0] ?? "vk");
    const image = MEDIA_ITEMS.find((item) => item.id === post.imageId);
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
    setNotice(`Открыт материал «${post.title}» для редактирования.`);
    setActiveSection("create");
  };

  const publishDemo = () =>
    setNotice(
      "Демо-режим: публикация не отправлена. Для реальной отправки нужно подключить каналы и серверную интеграцию.",
    );
  const saveDraftDemo = () =>
    setNotice(
      "Материал оставлен в черновике этого демо-сеанса; постоянное сохранение ещё не подключено.",
    );
  const approveDraft = () => {
    setApproved(true);
    setNotice(
      "Материал отмечен как согласованный вами. Публикация остаётся отдельным подтверждаемым действием.",
    );
  };
  const explainImageGeneration = () =>
    setNotice(
      "Генерация изображений пока не подключена; используйте фото из медиатеки.",
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
    explainImageGeneration,
    handleGenerate,
    notice,
    openPlanPost,
    prompt,
    publishDemo,
    saveDraftDemo,
    selectVariant,
    selectedChannels,
    mediaTargetChannel,
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
    variantIndex,
    variants,
  };
};
