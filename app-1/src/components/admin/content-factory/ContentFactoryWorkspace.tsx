import { useState } from "react";

import { ChevronDown, ChevronUp } from "lucide-react";

import { ChannelAdaptationsPanel } from "@/components/admin/content-factory/ChannelAdaptationsPanel";
import { ContentApprovalActions } from "@/components/admin/content-factory/ContentApprovalActions";
import { ContentBriefPanel } from "@/components/admin/content-factory/ContentBriefPanel";
import { ContentDraftPanel } from "@/components/admin/content-factory/ContentDraftPanel";
import { ContentFactoryDraftHistoryPanel } from "@/components/admin/content-factory/ContentFactoryDraftHistoryPanel";
import { ContentFactoryHeader } from "@/components/admin/content-factory/ContentFactoryHeader";
import {
  ChannelBadge,
  FactoryNotice,
} from "@/components/admin/content-factory/ContentFactoryPrimitives";
import { ContentPlanPanel } from "@/components/admin/content-factory/ContentPlanPanel";
import { MediaLibraryPanel } from "@/components/admin/content-factory/MediaLibraryPanel";
import { contentFactoryErrorMessage } from "@/lib/content-factory/contentFactoryApi";
import type { TextRefinementAction } from "@/lib/content-factory/contentFactoryTypes";
import { useContentFactoryDemo } from "@/lib/content-factory/useContentFactoryDemo";
import { useContentFactoryPersistence } from "@/lib/content-factory/useContentFactoryPersistence";
import { useContentFactoryPlanDemo } from "@/lib/content-factory/useContentFactoryPlanDemo";

export const ContentFactoryWorkspace = () => {
  const persistence = useContentFactoryPersistence();
  const factory = useContentFactoryDemo(persistence.mediaItems);
  const plan = useContentFactoryPlanDemo();
  const [adaptationsOpen, setAdaptationsOpen] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const generateText = async () => {
    if (!factory.prompt.trim() || !factory.selectedChannels.length) return;
    const referencePhoto = persistence.mediaItems.find(
      (item) =>
        item.id ===
        (factory.activeVariant.channelImageIds[factory.activeChannel] ||
          factory.activeVariant.imageId),
    );
    if (!referencePhoto) {
      factory.setNotice("Сначала выберите фотографию для публикации.");
      return;
    }
    try {
      const result = await persistence.generateText({
        prompt: factory.prompt.trim(),
        selectedChannels: factory.selectedChannels,
        reference: referencePhoto,
      });
      const variants = result.variants.map((generated, index) => {
        const source = factory.variants[index] ?? factory.activeVariant;
        return {
          ...source,
          id: `generated-${Date.now()}-${index}`,
          label: `Вариант ${index + 1}`,
          title: generated.title,
          concept: generated.concept,
          text: generated.text,
          adaptations: generated.adaptations,
        };
      });
      factory.installGeneratedVariants(variants);

      try {
        const saved = await persistence.saveDraft(null, {
          title: variants[0]?.title || "Новая AI-публикация",
          snapshot: {
            prompt: factory.prompt.trim(),
            selectedChannels: factory.selectedChannels,
            variantIndex: 0,
            variants,
          },
        });
        factory.setCurrentDraftId(saved.id);
        factory.setNotice(
          `Созданы и сохранены три варианта моделью ${result.model}; контекст включал фото «${referencePhoto.title}». Это черновик — в каналы ничего не отправлялось.`,
        );
      } catch {
        factory.setNotice(
          "AI-варианты созданы, но черновик не сохранился. Сохраните его вручную перед закрытием страницы.",
        );
      }
    } catch (error) {
      factory.setNotice(
        contentFactoryErrorMessage(
          error,
          "Не удалось создать текстовые варианты. Проверьте запрос и попробуйте ещё раз.",
        ),
      );
    }
  };

  const refineText = async (
    action: TextRefinementAction,
    customInstruction?: string,
  ): Promise<boolean> => {
    if (!factory.prompt.trim() || !factory.selectedChannels.length) {
      factory.setNotice(
        "Сначала заполните задачу и выберите канал публикации.",
      );
      return false;
    }
    const referencePhoto = persistence.mediaItems.find(
      (item) =>
        item.id ===
        (factory.activeVariant.channelImageIds[factory.activeChannel] ||
          factory.activeVariant.imageId),
    );
    if (!referencePhoto) {
      factory.setNotice("Сначала выберите фотографию для публикации.");
      return false;
    }

    try {
      const result = await persistence.refineText({
        action,
        currentText: factory.activeVariant.text,
        customInstruction,
        prompt: factory.prompt.trim(),
        selectedChannels: factory.selectedChannels,
        reference: referencePhoto,
      });
      const currentSnapshot = factory.getDraftSnapshot();
      const nextVariants = currentSnapshot.variants.map((variant, index) => {
        if (index !== factory.variantIndex) return variant;
        const adaptations = { ...variant.adaptations };
        for (const channel of factory.selectedChannels) {
          adaptations[channel] = result.adaptations[channel];
        }
        return { ...variant, text: result.text, adaptations };
      });
      const nextSnapshot = { ...currentSnapshot, variants: nextVariants };
      const updatedVariant = nextVariants[factory.variantIndex];
      factory.updateCurrentVariant(
        () => updatedVariant ?? factory.activeVariant,
      );

      try {
        const saved = await persistence.saveDraft(factory.currentDraftId, {
          snapshot: nextSnapshot,
          title: updatedVariant?.title.trim() || "Новая AI-публикация",
        });
        factory.setCurrentDraftId(saved.id);
        factory.setNotice(
          `Текст переработан моделью ${result.model} с учётом фото и каналов и сохранён в черновике. Публикация отключена.`,
        );
      } catch {
        factory.setNotice(
          `Текст переработан моделью ${result.model}, но черновик не сохранился. Нажмите «Сохранить черновик», чтобы не потерять изменения.`,
        );
      }
      return true;
    } catch (error) {
      factory.setNotice(
        contentFactoryErrorMessage(
          error,
          "Не удалось переработать текст. Проверьте задание и попробуйте ещё раз.",
        ),
      );
      return false;
    }
  };

  const generateImage = async (prompt: string) => {
    const selectedChannels = factory.selectedChannels;
    if (!selectedChannels.length) {
      factory.setNotice("Сначала отметьте площадки в блоке «Задача».");
      return;
    }
    const referencePhoto = persistence.mediaItems.find(
      (item) => item.id === factory.activeVariant.imageId,
    );
    if (!referencePhoto) {
      factory.setNotice("Сначала выберите исходное фото в медиатеке.");
      return;
    }
    try {
      const generatedAssets = await persistence.generateImage({
        prompt,
        postText: factory.activeVariant.text,
        selectedChannels,
        reference: referencePhoto,
      });
      const channelImageIds = {
        ...factory.activeVariant.channelImageIds,
      };
      for (const channel of selectedChannels) {
        const media = generatedAssets[channel];
        if (!media) {
          throw new Error("Не удалось подготовить кадр для каждой площадки.");
        }
        channelImageIds[channel] = media.id;
      }
      const currentSnapshot = factory.getDraftSnapshot();
      const updatedVariant = {
        ...factory.activeVariant,
        imageId:
          generatedAssets[selectedChannels[0]]?.id ??
          factory.activeVariant.imageId,
        channelImageIds,
      };
      const snapshot = {
        ...currentSnapshot,
        variants: currentSnapshot.variants.map((variant, index) =>
          index === factory.variantIndex ? updatedVariant : variant,
        ),
      };
      factory.updateCurrentVariant(() => updatedVariant);
      try {
        const saved = await persistence.saveDraft(factory.currentDraftId, {
          snapshot,
          title:
            snapshot.variants[factory.variantIndex]?.title.trim() ||
            "Новая AI-публикация",
        });
        factory.setCurrentDraftId(saved.id);
        factory.setNotice(
          `Изображение создано один раз по тексту публикации и сохранено в медиатеке. Для ${selectedChannels.length} выбранных площадок подготовлены нужные форматы и сохранены в черновике. Публикация отключена.`,
        );
      } catch {
        factory.setNotice(
          "Кадры подготовлены и сохранены в медиатеке, но черновик не обновился. Нажмите «Сохранить черновик», чтобы закрепить их за публикацией.",
        );
      }
    } catch (error) {
      factory.setNotice(
        contentFactoryErrorMessage(
          error,
          "Не удалось создать изображение. Попробуйте другой промт.",
        ),
      );
    }
  };

  const saveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const saved = await persistence.saveDraft(factory.currentDraftId, {
        snapshot: factory.getDraftSnapshot(),
        title:
          factory.activeVariant.title.trim() ||
          factory.prompt.trim().slice(0, 255) ||
          "Черновик без названия",
      });
      factory.setCurrentDraftId(saved.id);
      factory.setNotice(
        "Черновик сохранён. Его можно открыть во вкладке «История и черновики».",
      );
    } catch (error) {
      factory.setNotice(
        contentFactoryErrorMessage(
          error,
          "Не удалось сохранить черновик. Попробуйте ещё раз.",
        ),
      );
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSchedule = (date: string, time: string) => {
    plan.schedulePublication(
      date,
      time,
      factory.activeVariant,
      factory.selectedChannels,
    );
    factory.setNotice(
      "Расписание добавлено в демонстрационный контент-план. Отправки в каналы не было.",
    );
    factory.setActiveSection("plan");
  };

  const generatePlan = () => {
    plan.addSuggestedPosts();
    factory.setNotice(
      "Добавлены идеи для контент-плана. Это демо-предложение — проверьте и подтвердите каждую дату.",
    );
  };

  return (
    <div className="mx-auto max-w-[1540px] space-y-5">
      <ContentFactoryHeader
        activeSection={factory.activeSection}
        models={persistence.guidelines?.models ?? null}
        onSectionChange={(section) => {
          factory.setActiveSection(section);
          if (section === "history") void persistence.refreshDrafts();
        }}
      />

      <div className="space-y-4">
        {factory.notice && (
          <FactoryNotice onClose={() => factory.setNotice("")}>
            {factory.notice}
          </FactoryNotice>
        )}

        {factory.activeSection === "create" && (
          <div className="space-y-5">
            <div className="grid items-start gap-5 xl:grid-cols-[minmax(310px,0.82fr)_minmax(0,1.48fr)]">
              <ContentBriefPanel
                isGenerating={persistence.isGeneratingText}
                onGenerate={() => void generateText()}
                onPromptChange={factory.setPrompt}
                onToggleChannel={factory.toggleChannel}
                prompt={factory.prompt}
                selectedChannels={factory.selectedChannels}
              />
              <ContentDraftPanel
                mediaItems={persistence.mediaItems}
                selectedChannels={factory.selectedChannels}
                isRefiningText={persistence.isRefiningText}
                guidelines={persistence.guidelines}
                isGeneratingImage={persistence.isGeneratingImage}
                onCustomAction={(command) => refineText("custom", command)}
                onDraftAction={refineText}
                onImageGenerate={generateImage}
                onMediaBrowse={factory.browseMainImage}
                onTextChange={(text) =>
                  factory.updateCurrentVariant((variant) => ({
                    ...variant,
                    text,
                  }))
                }
                onVariantChange={factory.selectVariant}
                variant={factory.activeVariant}
                variantIndex={factory.variantIndex}
                variants={factory.variants}
              />
            </div>

            <div className="rounded-2xl border border-line bg-brand-foreground">
              <button
                aria-expanded={adaptationsOpen}
                className="flex min-h-14 w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left"
                onClick={() => setAdaptationsOpen((open) => !open)}
                type="button"
              >
                <span>
                  <span className="block text-sm font-semibold text-brand">
                    Версии для каналов
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    {factory.selectedChannels.map((channel) => (
                      <ChannelBadge channel={channel} compact key={channel} />
                    ))}
                    {!factory.selectedChannels.length && (
                      <span className="text-xs text-muted-ui-foreground">
                        Выберите площадки в задаче
                      </span>
                    )}
                  </span>
                </span>
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted-ui-foreground">
                  {adaptationsOpen ? "Скрыть" : "Проверить версии"}
                  {adaptationsOpen ? (
                    <ChevronUp className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                </span>
              </button>
              {adaptationsOpen && (
                <div className="border-t border-line p-4">
                  <ChannelAdaptationsPanel
                    activeChannel={factory.activeChannel}
                    guidelines={persistence.guidelines}
                    mediaItems={persistence.mediaItems}
                    onActiveChannelChange={factory.setActiveChannel}
                    onAdaptAction={factory.adaptChannel}
                    onMediaBrowse={factory.browseChannelImage}
                    onTextChange={factory.updateAdaptation}
                    onToggleChannel={factory.toggleChannel}
                    selectedChannels={factory.selectedChannels}
                    variant={factory.activeVariant}
                  />
                </div>
              )}
            </div>
            <ContentApprovalActions
              approved={factory.approved}
              onApprove={factory.approveDraft}
              onSaveDraft={() => void saveDraft()}
              onSchedule={handleSchedule}
              isSavingDraft={isSavingDraft}
              selectedCount={factory.selectedChannels.length}
            />
          </div>
        )}

        {factory.activeSection === "plan" && (
          <ContentPlanPanel
            onGeneratePlan={generatePlan}
            onOpenPost={factory.openPlanPost}
            onPostsChange={plan.setPosts}
            posts={plan.posts}
          />
        )}

        {factory.activeSection === "media" && (
          <MediaLibraryPanel
            isLoadingMedia={persistence.isLoadingMedia}
            isUploadingMedia={persistence.isUploadingMedia}
            mediaError={persistence.mediaError}
            mediaItems={persistence.mediaItems}
            onRefreshMedia={() => void persistence.refreshMedia()}
            onUploadMedia={async (file) => {
              const uploaded = await persistence.uploadMedia(file);
              factory.setNotice(
                `Изображение «${uploaded.title}» добавлено в медиатеку.`,
              );
            }}
            onGenerateImage={factory.explainImageGeneration}
            onUseMedia={factory.useMedia}
            selectedMediaId={
              factory.mediaTargetChannel
                ? factory.activeVariant.channelImageIds[
                    factory.mediaTargetChannel
                  ]
                : factory.activeVariant.imageId
            }
          />
        )}

        {factory.activeSection === "history" && (
          <ContentFactoryDraftHistoryPanel
            drafts={persistence.drafts}
            error={persistence.draftsError}
            isLoading={persistence.isLoadingDrafts}
            mediaItems={persistence.mediaItems}
            onOpenDraft={factory.openDraft}
            onRetry={() => void persistence.refreshDrafts()}
          />
        )}
      </div>
    </div>
  );
};
