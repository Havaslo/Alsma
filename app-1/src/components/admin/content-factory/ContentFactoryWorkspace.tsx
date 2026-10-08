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
import { ContentPlanPostReviewDialog } from "@/components/admin/content-factory/ContentPlanPostReviewDialog";
import { MediaLibraryPanel } from "@/components/admin/content-factory/MediaLibraryPanel";
import { contentFactoryErrorMessage } from "@/lib/content-factory/contentFactoryApi";
import {
  CONTENT_CHANNELS,
  type ContentChannel,
  type PlanPublication,
  getDraftVariantImageIds,
  getDraftVariantSourceImageIds,
} from "@/lib/content-factory/contentFactoryData";
import type {
  ContentPlanPostInput,
  ImageGenerationMode,
  TextRefinementAction,
} from "@/lib/content-factory/contentFactoryTypes";
import { useContentFactoryDemo } from "@/lib/content-factory/useContentFactoryDemo";
import { useContentFactoryPersistence } from "@/lib/content-factory/useContentFactoryPersistence";
import { useContentPlanPersistence } from "@/lib/content-factory/useContentPlanPersistence";

export const ContentFactoryWorkspace = () => {
  const persistence = useContentFactoryPersistence();
  const factory = useContentFactoryDemo(persistence.mediaItems);
  const plan = useContentPlanPersistence();
  const [adaptationsOpen, setAdaptationsOpen] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [manualPostDate, setManualPostDate] = useState<string>();
  const [reviewingPost, setReviewingPost] = useState<PlanPublication | null>(
    null,
  );

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
          sourceImageIds: getDraftVariantSourceImageIds(factory.activeVariant),
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

  const refineChannelAdaptation = async (
    channel: ContentChannel,
    action: "shorter" | "regenerate" | "rewrite",
    instruction?: string,
  ): Promise<boolean> => {
    if (!factory.prompt.trim()) {
      factory.setNotice("Сначала заполните задачу публикации.");
      return false;
    }
    if (action === "rewrite" && !instruction?.trim()) {
      factory.setNotice("Напишите, как переработать текст этого канала.");
      return false;
    }

    const referenceId = getDraftVariantImageIds(
      factory.activeVariant,
      channel,
    )[0];
    const referencePhoto = persistence.mediaItems.find(
      (item) => item.id === referenceId,
    );
    if (!referencePhoto) {
      factory.setNotice("Для этой версии не найдено исходное фото.");
      return false;
    }

    try {
      const result = await persistence.refineText({
        action:
          action === "rewrite"
            ? "custom"
            : action === "shorter"
              ? "shorter"
              : "regenerate",
        currentText:
          factory.activeVariant.adaptations[channel] ||
          factory.activeVariant.text,
        customInstruction: instruction?.trim(),
        prompt: factory.prompt.trim(),
        selectedChannels: [channel],
        reference: referencePhoto,
      });
      const currentSnapshot = factory.getDraftSnapshot();
      const currentVariant =
        currentSnapshot.variants[factory.variantIndex] ?? factory.activeVariant;
      const updatedVariant = {
        ...currentVariant,
        adaptations: {
          ...currentVariant.adaptations,
          [channel]: result.adaptations[channel],
        },
      };
      const nextSnapshot = {
        ...currentSnapshot,
        variants: currentSnapshot.variants.map((variant, index) =>
          index === factory.variantIndex ? updatedVariant : variant,
        ),
      };
      factory.updateCurrentVariant(() => updatedVariant);

      try {
        const saved = await persistence.saveDraft(factory.currentDraftId, {
          snapshot: nextSnapshot,
          title: updatedVariant.title.trim() || "Новая AI-публикация",
        });
        factory.setCurrentDraftId(saved.id);
        factory.setNotice(
          `Версия для ${channel} переработана моделью ${result.model} и сохранена. Остальные каналы не изменены.`,
        );
      } catch {
        factory.setNotice(
          `Версия для ${channel} переработана моделью ${result.model}, но черновик не сохранился. Нажмите «Сохранить черновик».`,
        );
      }
      return true;
    } catch (error) {
      factory.setNotice(
        contentFactoryErrorMessage(
          error,
          "Не удалось переработать версию для канала. Попробуйте ещё раз.",
        ),
      );
      return false;
    }
  };

  const reorderChannelImages = async (
    channel: ContentChannel,
    imageIds: string[],
  ): Promise<boolean> => {
    const currentSnapshot = factory.getDraftSnapshot();
    const currentVariant =
      currentSnapshot.variants[factory.variantIndex] ?? factory.activeVariant;
    const channelImageGalleryIds = {
      ...Object.fromEntries(
        CONTENT_CHANNELS.map(({ id }) => [
          id,
          getDraftVariantImageIds(currentVariant, id),
        ]),
      ),
      [channel]: imageIds,
    } as Record<ContentChannel, string[]>;
    const channelImageIds = {
      ...currentVariant.channelImageIds,
      [channel]: imageIds[0] ?? "",
    };
    const updatedVariant = {
      ...currentVariant,
      channelImageGalleryIds,
      channelImageIds,
    };
    const nextSnapshot = {
      ...currentSnapshot,
      variants: currentSnapshot.variants.map((variant, index) =>
        index === factory.variantIndex ? updatedVariant : variant,
      ),
    };
    factory.updateCurrentVariant(() => updatedVariant);

    try {
      const saved = await persistence.saveDraft(factory.currentDraftId, {
        snapshot: nextSnapshot,
        title: updatedVariant.title.trim() || "Новая AI-публикация",
      });
      factory.setCurrentDraftId(saved.id);
      factory.setNotice("Порядок изображений изменён и сохранён в черновике.");
      return true;
    } catch (error) {
      factory.setNotice(
        contentFactoryErrorMessage(
          error,
          "Не удалось сохранить порядок изображений. Повторите попытку.",
        ),
      );
      return false;
    }
  };

  const generateImage = async (
    mode: ImageGenerationMode,
    prompt: string,
  ): Promise<boolean> => {
    const selectedChannels = factory.selectedChannels;
    if (!selectedChannels.length) {
      factory.setNotice("Сначала отметьте площадки в блоке «Задача».");
      return false;
    }
    const selectedSource =
      mode === "edit"
        ? persistence.mediaItems.find(
            (item) => item.id === factory.activeVariant.imageId,
          )
        : undefined;
    const references = selectedSource ? [selectedSource] : [];
    if (mode === "edit" && !selectedSource) {
      factory.setNotice("Выберите фото сверху или добавьте его из галереи.");
      return false;
    }
    try {
      const generatedAssets = await persistence.generateImage({
        imageCount: 1,
        mode,
        prompt,
        postText: factory.activeVariant.text,
        selectedChannels,
        references,
      });
      const channelImageIds = {
        ...factory.activeVariant.channelImageIds,
      };
      const channelImageGalleryIds = Object.fromEntries(
        CONTENT_CHANNELS.map(({ id }) => [
          id,
          getDraftVariantImageIds(factory.activeVariant, id),
        ]),
      ) as Record<ContentChannel, string[]>;
      for (const channel of selectedChannels) {
        const images = generatedAssets[channel];
        if (!images?.length) {
          throw new Error(
            "Не удалось подготовить изображение для каждой площадки.",
          );
        }
        const nextIds = [
          ...new Set([
            ...channelImageGalleryIds[channel],
            ...images.map((media) => media.id),
          ]),
        ];
        channelImageGalleryIds[channel] = nextIds;
        channelImageIds[channel] = images.at(-1)!.id;
      }
      const primaryChannel = selectedChannels.includes(factory.activeChannel)
        ? factory.activeChannel
        : selectedChannels[0]!;
      const newPrimaryImage = generatedAssets[primaryChannel]?.[0];
      if (!newPrimaryImage) {
        throw new Error("Не удалось выбрать созданный вариант изображения.");
      }
      const sourceImageIds = getDraftVariantSourceImageIds(
        factory.activeVariant,
      );
      const selectedSourceIndex = sourceImageIds.indexOf(
        factory.activeVariant.imageId,
      );
      if (selectedSourceIndex >= 0) {
        sourceImageIds[selectedSourceIndex] = newPrimaryImage.id;
      } else {
        sourceImageIds.push(newPrimaryImage.id);
      }
      const stableSourceImageIds = [...new Set(sourceImageIds)];
      const currentSnapshot = factory.getDraftSnapshot();
      const updatedVariant = {
        ...factory.activeVariant,
        imageId: newPrimaryImage.id,
        sourceImageIds: stableSourceImageIds,
        channelImageGalleryIds,
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
          `${mode === "edit" ? "Создана новая версия выбранного фото" : "Создано новое изображение с нуля"}. Результат добавлен в галереи ${selectedChannels.length} выбранных площадок и сохранён в черновике. Можно запустить генерацию ещё раз — предыдущие варианты сохраняются. Оригинал не изменён; публикации не отправлялись.`,
        );
      } catch {
        factory.setNotice(
          "Изображение подготовлено и сохранено в медиатеке, но черновик не обновился. Нажмите «Сохранить черновик», чтобы закрепить его за публикацией.",
        );
      }
      return true;
    } catch (error) {
      factory.setNotice(
        contentFactoryErrorMessage(
          error,
          "Не удалось создать изображение. Попробуйте другой промт.",
        ),
      );
      return false;
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

  const handleSchedule = async (date: string, time: string) => {
    if (!factory.selectedChannels.length) {
      factory.setNotice(
        "Выберите хотя бы одну площадку перед добавлением в календарь.",
      );
      throw new Error("Не выбрана площадка для публикации.");
    }
    setIsScheduling(true);
    try {
      const result = await plan.createManualPosts({
        date,
        time,
        title: factory.activeVariant.title || "Новая публикация",
        posts: factory.selectedChannels.map((channel) => ({
          channel,
          text:
            factory.activeVariant.adaptations[channel] ||
            factory.activeVariant.text,
        })),
      });
      factory.setNotice(
        `В календарь добавлено публикаций: ${result.postCount}. Каждая ждёт отдельного одобрения; отправки в соцсети не было.`,
      );
      setManualPostDate(undefined);
      factory.setActiveSection("plan");
    } catch (error) {
      factory.setNotice(
        contentFactoryErrorMessage(
          error,
          "Не удалось добавить публикацию в календарь.",
        ),
      );
      throw error;
    } finally {
      setIsScheduling(false);
    }
  };

  const generatePlan = async (input: {
    fileName: string;
    posts: ContentPlanPostInput[];
  }) => {
    const result = await plan.generatePlan(input);
    factory.setNotice(
      `Создание запущено для ${result.postCount} постов. Они появятся в календаре и будут ждать отдельного одобрения.`,
    );
  };

  const openPlanPost = (post: PlanPublication) => {
    if (post.sourceStatus === "manual_new") {
      setManualPostDate(post.date);
      factory.openPlanPost(post);
      return;
    }
    setReviewingPost(post);
  };

  const saveReviewChanges = async (input: {
    postId: string;
    date: string;
    time: string;
    title: string;
    text: string;
  }) => {
    try {
      await plan.updatePost(input);
      factory.setNotice(
        "Правки сохранены. Пост снова ожидает ручного одобрения.",
      );
    } catch (error) {
      factory.setNotice(
        contentFactoryErrorMessage(error, "Не удалось сохранить правки."),
      );
      throw error;
    }
  };

  const approvePlanPost = async (postId: string) => {
    try {
      await plan.approvePost(postId);
      factory.setNotice(
        "Пост одобрен к публикации. Он не отправлен в соцсеть автоматически.",
      );
      setReviewingPost(null);
    } catch (error) {
      factory.setNotice(
        contentFactoryErrorMessage(error, "Не удалось одобрить пост."),
      );
      throw error;
    }
  };

  const retryPlanPost = async (postId: string) => {
    try {
      await plan.retryPost(postId);
      factory.setNotice("Повторная генерация поста запущена.");
    } catch (error) {
      factory.setNotice(
        contentFactoryErrorMessage(error, "Не удалось повторить генерацию."),
      );
      throw error;
    }
  };

  return (
    <div className="mx-auto max-w-[1540px] space-y-5">
      <ContentFactoryHeader
        activeSection={factory.activeSection}
        models={persistence.guidelines?.models ?? null}
        onSectionChange={(section) => {
          if (section !== "create") setManualPostDate(undefined);
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
                onConfirmSources={factory.setSourceMedia}
                onRemoveSource={factory.removeSourceMedia}
                onSetPrimarySource={factory.setPrimarySourceMedia}
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
                    onAdaptAction={refineChannelAdaptation}
                    onActiveChannelChange={factory.setActiveChannel}
                    onMediaBrowse={factory.browseChannelImage}
                    onReorderImages={reorderChannelImages}
                    onTextChange={factory.updateAdaptation}
                    onToggleChannel={factory.toggleChannel}
                    selectedChannels={factory.selectedChannels}
                    variant={factory.activeVariant}
                  />
                </div>
              )}
            </div>
            <ContentApprovalActions
              onSaveDraft={() => void saveDraft()}
              onSchedule={handleSchedule}
              isSavingDraft={isSavingDraft}
              isScheduling={isScheduling}
              initialDate={manualPostDate}
              selectedCount={factory.selectedChannels.length}
            />
          </div>
        )}

        {factory.activeSection === "plan" && (
          <ContentPlanPanel
            onGeneratePlan={generatePlan}
            onPreviewFile={plan.previewFile}
            onOpenPost={openPlanPost}
            onUpdatePost={(input) =>
              void plan
                .updatePost(input)
                .catch((error: unknown) =>
                  factory.setNotice(
                    contentFactoryErrorMessage(
                      error,
                      "Не удалось изменить дату публикации.",
                    ),
                  ),
                )
            }
            onCancelPost={(postId) =>
              void plan
                .cancelPost(postId)
                .catch((error: unknown) =>
                  factory.setNotice(
                    contentFactoryErrorMessage(
                      error,
                      "Не удалось отменить публикацию.",
                    ),
                  ),
                )
            }
            isLoading={plan.isLoading}
            loadError={plan.error}
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
            onUseMedia={factory.useMedia}
            onToggleSourceMedia={factory.toggleSourceMedia}
            onAddSourceMedia={factory.addSourceMedia}
            selectedSourceMediaIds={factory.selectedSourceMediaIds}
            selectingSourceMedia={factory.selectingSourceMedia}
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

      {reviewingPost && (
        <ContentPlanPostReviewDialog
          busy={plan.isUpdating || plan.isApproving || plan.isRetrying}
          onApprove={approvePlanPost}
          onClose={() => setReviewingPost(null)}
          onRetry={retryPlanPost}
          onSave={saveReviewChanges}
          post={
            plan.posts.find((post) => post.id === reviewingPost.id) ??
            reviewingPost
          }
        />
      )}
    </div>
  );
};
