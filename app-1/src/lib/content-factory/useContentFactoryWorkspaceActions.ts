import type { Dispatch, SetStateAction } from "react";

import { contentFactoryErrorMessage } from "@/lib/content-factory/contentFactoryApi";
import {
  type ContentChannel,
  createEmptyDraftVariant,
  getDraftVariantImageIds,
} from "@/lib/content-factory/contentFactoryData";
import type {
  ContentFactoryDraftSnapshot,
  TextRefinementAction,
} from "@/lib/content-factory/contentFactoryTypes";
import type { useContentFactoryPersistence } from "@/lib/content-factory/useContentFactoryPersistence";
import type { useContentFactoryState } from "@/lib/content-factory/useContentFactoryState";
import type { useContentFactoryVisualActions } from "@/lib/content-factory/useContentFactoryVisualActions";
import type { useContentPlanPersistence } from "@/lib/content-factory/useContentPlanPersistence";

type Factory = ReturnType<typeof useContentFactoryState>;
type Persistence = ReturnType<typeof useContentFactoryPersistence>;
type Plan = ReturnType<typeof useContentPlanPersistence>;
type VisualActions = ReturnType<typeof useContentFactoryVisualActions>;

export const useContentFactoryWorkspaceActions = (input: {
  factory: Factory;
  persistence: Persistence;
  plan: Plan;
  visuals: VisualActions;
  setIsSavingDraft: Dispatch<SetStateAction<boolean>>;
  setIsScheduling: Dispatch<SetStateAction<boolean>>;
  setManualPostDate: Dispatch<SetStateAction<string | undefined>>;
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

  const generateText = async () => {
    if (!input.factory.prompt.trim() || !input.factory.selectedChannels.length)
      return;
    try {
      const result = await input.persistence.generateText({
        prompt: input.factory.prompt.trim(),
        selectedChannels: input.factory.selectedChannels,
        brief: input.factory.brief,
      });
      const variants = result.variants.map((generated, index) => ({
        ...createEmptyDraftVariant(),
        id: `generated-${Date.now()}-${index}`,
        label: `Вариант ${index + 1}`,
        title: generated.title,
        concept: generated.concept,
        text: generated.text,
        adaptations: generated.adaptations,
      }));
      input.factory.installGeneratedVariants(variants);
      const snapshot: ContentFactoryDraftSnapshot = {
        prompt: input.factory.prompt.trim(),
        selectedChannels: input.factory.selectedChannels,
        variantIndex: 0,
        variants,
        brief: input.factory.brief,
        imageCount: input.factory.imageCount,
        imageSourceMode: input.factory.imageSourceMode,
      };
      let draftId: string | null = null;
      try {
        draftId = await saveSnapshot(
          null,
          snapshot,
          variants[0]?.title || "Новая AI-публикация",
        );
      } catch {
        input.factory.setNotice(
          "Текст создан, но черновик пока не сохранился. Он останется на экране — попробуйте сохранить вручную.",
        );
      }
      if (input.factory.imageCount > 0) {
        await input.visuals.generateVisualsForVariant({
          variant: variants[0],
          snapshot,
          variantIndex: 0,
          draftId,
        });
      } else if (draftId) {
        input.factory.setNotice(
          `Созданы три варианта текста моделью ${result.model}. Черновик сохранён; изображения не запрашивались.`,
        );
      }
    } catch (error) {
      input.factory.setNotice(
        contentFactoryErrorMessage(
          error,
          "Не удалось создать текстовые варианты. Проверьте задачу и попробуйте ещё раз.",
        ),
      );
    }
  };

  const refineText = async (
    action: TextRefinementAction,
    customInstruction?: string,
  ): Promise<boolean> => {
    if (
      !input.factory.prompt.trim() ||
      !input.factory.selectedChannels.length
    ) {
      input.factory.setNotice(
        "Сначала заполните задачу и выберите канал публикации.",
      );
      return false;
    }
    try {
      const reference = input.persistence.mediaItems.find(
        ({ id }) => id === input.factory.activeVariant.imageId,
      );
      const result = await input.persistence.refineText({
        action,
        currentText: input.factory.activeVariant.text,
        customInstruction,
        prompt: input.factory.prompt.trim(),
        selectedChannels: input.factory.selectedChannels,
        reference,
        brief: input.factory.brief,
      });
      const snapshot = input.factory.getDraftSnapshot();
      const updatedVariant = {
        ...input.factory.activeVariant,
        text: result.text,
        adaptations: {
          ...input.factory.activeVariant.adaptations,
          ...result.adaptations,
        },
      };
      input.factory.updateCurrentVariant(() => updatedVariant);
      await saveSnapshot(
        input.factory.currentDraftId,
        {
          ...snapshot,
          variants: snapshot.variants.map((variant, index) =>
            index === input.factory.variantIndex ? updatedVariant : variant,
          ),
        },
        updatedVariant.title.trim() || "Новая AI-публикация",
      );
      input.factory.setNotice(
        `Текст переработан моделью ${result.model} и сохранён в черновике.`,
      );
      return true;
    } catch (error) {
      input.factory.setNotice(
        contentFactoryErrorMessage(
          error,
          "Не удалось переработать текст. Попробуйте ещё раз.",
        ),
      );
      return false;
    }
  };

  const refineChannelAdaptation = async (
    channel: ContentChannel,
    action: "shorter" | "regenerate" | "rewrite",
    instruction?: string,
  ): Promise<boolean> => {
    if (!input.factory.prompt.trim()) {
      input.factory.setNotice("Сначала заполните задачу публикации.");
      return false;
    }
    if (action === "rewrite" && !instruction?.trim()) {
      input.factory.setNotice("Напишите, как переработать текст этого канала.");
      return false;
    }
    try {
      const referenceId = input.factory.activeVariant.channelImageIds[channel];
      const reference = input.persistence.mediaItems.find(
        ({ id }) => id === referenceId,
      );
      const result = await input.persistence.refineText({
        action:
          action === "rewrite"
            ? "custom"
            : action === "shorter"
              ? "shorter"
              : "regenerate",
        currentText:
          input.factory.activeVariant.adaptations[channel] ||
          input.factory.activeVariant.text,
        customInstruction: instruction?.trim(),
        prompt: input.factory.prompt.trim(),
        selectedChannels: [channel],
        reference,
        brief: input.factory.brief,
      });
      const snapshot = input.factory.getDraftSnapshot();
      const updatedVariant = {
        ...input.factory.activeVariant,
        adaptations: {
          ...input.factory.activeVariant.adaptations,
          [channel]: result.adaptations[channel],
        },
      };
      input.factory.updateCurrentVariant(() => updatedVariant);
      await saveSnapshot(
        input.factory.currentDraftId,
        {
          ...snapshot,
          variants: snapshot.variants.map((variant, index) =>
            index === input.factory.variantIndex ? updatedVariant : variant,
          ),
        },
        updatedVariant.title.trim() || "Новая AI-публикация",
      );
      input.factory.setNotice(
        `Версия для ${channel} переработана и сохранена. Остальные каналы не изменены.`,
      );
      return true;
    } catch (error) {
      input.factory.setNotice(
        contentFactoryErrorMessage(
          error,
          "Не удалось переработать версию для канала.",
        ),
      );
      return false;
    }
  };

  const saveDraft = async () => {
    input.setIsSavingDraft(true);
    try {
      await saveSnapshot(
        input.factory.currentDraftId,
        input.factory.getDraftSnapshot(),
        input.factory.activeVariant.title.trim() ||
          input.factory.prompt.trim().slice(0, 255) ||
          "Черновик без названия",
      );
      input.factory.setNotice("Черновик сохранён в истории.");
    } catch (error) {
      input.factory.setNotice(
        contentFactoryErrorMessage(error, "Не удалось сохранить черновик."),
      );
    } finally {
      input.setIsSavingDraft(false);
    }
  };

  const handleSchedule = async (date: string, time: string) => {
    if (!input.factory.selectedChannels.length) {
      input.factory.setNotice(
        "Выберите хотя бы один канал перед добавлением в календарь.",
      );
      throw new Error("Не выбрана площадка для публикации.");
    }
    input.setIsScheduling(true);
    try {
      const result = await input.plan.createManualPosts({
        date,
        time,
        title: input.factory.activeVariant.title || "Новая публикация",
        posts: input.factory.selectedChannels.map((channel) => ({
          channel,
          text:
            input.factory.activeVariant.adaptations[channel] ||
            input.factory.activeVariant.text,
          imageIds: getDraftVariantImageIds(
            input.factory.activeVariant,
            channel,
          ).filter((id) =>
            input.persistence.mediaItems.some((media) => media.id === id),
          ),
        })),
      });
      input.factory.setNotice(
        `В календарь добавлено публикаций: ${result.postCount}. Каждая ждёт отдельного одобрения; отправки в соцсети не было.`,
      );
      input.setManualPostDate(undefined);
      input.factory.setActiveSection("plan");
    } catch (error) {
      input.factory.setNotice(
        contentFactoryErrorMessage(
          error,
          "Не удалось добавить публикацию в календарь.",
        ),
      );
      throw error;
    } finally {
      input.setIsScheduling(false);
    }
  };

  return {
    generateText,
    refineText,
    refineChannelAdaptation,
    saveDraft,
    handleSchedule,
  };
};
