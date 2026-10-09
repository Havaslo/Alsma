import { useState } from "react";

import { ChannelAdaptationsPanel } from "@/components/admin/content-factory/ChannelAdaptationsPanel";
import { ContentApprovalActions } from "@/components/admin/content-factory/ContentApprovalActions";
import { ContentBriefPanel } from "@/components/admin/content-factory/ContentBriefPanel";
import { ContentDraftPanel } from "@/components/admin/content-factory/ContentDraftPanel";
import { ContentFactoryDraftHistoryPanel } from "@/components/admin/content-factory/ContentFactoryDraftHistoryPanel";
import { ContentFactoryHeader } from "@/components/admin/content-factory/ContentFactoryHeader";
import { FactoryNotice } from "@/components/admin/content-factory/ContentFactoryPrimitives";
import { ContentFactoryStepper } from "@/components/admin/content-factory/ContentFactoryStepper";
import { ContentPlanPanel } from "@/components/admin/content-factory/ContentPlanPanel";
import { ContentPlanPostReviewDialog } from "@/components/admin/content-factory/ContentPlanPostReviewDialog";
import { MediaLibraryPanel } from "@/components/admin/content-factory/MediaLibraryPanel";
import { contentFactoryErrorMessage } from "@/lib/content-factory/contentFactoryApi";
import type { PlanPublication } from "@/lib/content-factory/contentFactoryData";
import type { ContentPlanPostInput } from "@/lib/content-factory/contentFactoryTypes";
import { useContentFactoryPersistence } from "@/lib/content-factory/useContentFactoryPersistence";
import { useContentFactoryState } from "@/lib/content-factory/useContentFactoryState";
import { useContentFactoryVisualActions } from "@/lib/content-factory/useContentFactoryVisualActions";
import { useContentFactoryWorkspaceActions } from "@/lib/content-factory/useContentFactoryWorkspaceActions";
import { useContentPlanPersistence } from "@/lib/content-factory/useContentPlanPersistence";

export const ContentFactoryWorkspace = () => {
  const persistence = useContentFactoryPersistence();
  const factory = useContentFactoryState(persistence.mediaItems);
  const plan = useContentPlanPersistence();
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [manualPostDate, setManualPostDate] = useState<string>();
  const [reviewingPost, setReviewingPost] = useState<PlanPublication | null>(
    null,
  );
  const visuals = useContentFactoryVisualActions({ factory, persistence });

  const actions = useContentFactoryWorkspaceActions({
    factory,
    persistence,
    plan,
    visuals,
    setIsSavingDraft,
    setIsScheduling,
    setManualPostDate,
  });

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

  const cancelPlanPost = async (postId: string) => {
    try {
      await plan.cancelPost(postId);
      factory.setNotice(
        "Пост снят с одобрения и убран из календаря. В соцсеть он не публиковался.",
      );
      setReviewingPost(null);
    } catch (error) {
      factory.setNotice(
        contentFactoryErrorMessage(
          error,
          "Не удалось снять пост с публикации.",
        ),
      );
      throw error;
    }
  };

  const hasGeneratedText = factory.variants.some((variant) =>
    variant.text.trim(),
  );

  return (
    <div className="mx-auto max-w-[1680px] space-y-4 px-1 sm:px-2">
      <ContentFactoryHeader
        activeSection={factory.activeSection}
        models={persistence.guidelines?.models ?? null}
        onSectionChange={(section) => {
          if (section !== "create") setManualPostDate(undefined);
          factory.setActiveSection(section);
          if (section === "history") void persistence.refreshDrafts();
        }}
      />

      <div className="space-y-3.5">
        {factory.notice && (
          <FactoryNotice onClose={() => factory.setNotice("")}>
            {factory.notice}
          </FactoryNotice>
        )}

        {factory.activeSection === "create" && (
          <div className="space-y-4">
            <ContentFactoryStepper
              canOpenResults={hasGeneratedText}
              currentStep={factory.step}
              onStepChange={factory.setStep}
            />

            {factory.step === 1 && (
              <ContentBriefPanel
                brief={factory.brief}
                imageCount={factory.imageCount}
                imageSourceMode={factory.imageSourceMode}
                isGenerating={persistence.isGeneratingText}
                onBriefChange={(field, value) =>
                  factory.setBrief((current) => ({
                    ...current,
                    [field]: value,
                  }))
                }
                onGenerate={() => void actions.generateText()}
                onImageCountChange={factory.setImageCount}
                onImageSourceModeChange={factory.setImageSourceMode}
                onPromptChange={factory.setPrompt}
                onToggleChannel={factory.toggleChannel}
                prompt={factory.prompt}
                selectedChannels={factory.selectedChannels}
              />
            )}

            {factory.step === 2 && hasGeneratedText && (
              <ContentDraftPanel
                activeChannel={factory.activeChannel}
                guidelines={persistence.guidelines}
                imageCount={factory.imageCount}
                isGeneratingImage={persistence.isGeneratingImage}
                isRefiningText={persistence.isRefiningText}
                mediaItems={persistence.mediaItems}
                onConfirmSources={factory.setSourceMedia}
                onCustomAction={(instruction) =>
                  actions.refineText("custom", instruction)
                }
                onDraftAction={actions.refineText}
                onGenerateVisuals={() =>
                  void visuals.generateVisualsForVariant({
                    forceGenerate: true,
                  })
                }
                onImageGenerate={visuals.generateImage}
                onNext={() => factory.setStep(3)}
                onRemoveSource={factory.removeSourceMedia}
                onSetPrimarySource={factory.setPrimarySourceMedia}
                onTextChange={(text) =>
                  factory.updateCurrentVariant((variant) => ({
                    ...variant,
                    text,
                  }))
                }
                onVariantChange={factory.selectVariant}
                selectedChannels={factory.selectedChannels}
                variant={factory.activeVariant}
                variantIndex={factory.variantIndex}
                variants={factory.variants}
              />
            )}

            {factory.step === 3 && hasGeneratedText && (
              <>
                <ChannelAdaptationsPanel
                  activeChannel={factory.activeChannel}
                  guidelines={persistence.guidelines}
                  mediaItems={persistence.mediaItems}
                  onAdaptAction={actions.refineChannelAdaptation}
                  onActiveChannelChange={factory.setActiveChannel}
                  onApplyImages={visuals.setChannelImages}
                  onReorderImages={visuals.setChannelImages}
                  onTextChange={factory.updateAdaptation}
                  onToggleChannel={factory.toggleChannel}
                  selectedChannels={factory.selectedChannels}
                  variant={factory.activeVariant}
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    className="min-h-10 rounded-xl border border-line bg-brand-foreground px-4 text-sm font-semibold text-page-foreground hover:bg-page"
                    onClick={() => factory.setStep(2)}
                    type="button"
                  >
                    Назад к результату
                  </button>
                  <ContentApprovalActions
                    initialDate={manualPostDate}
                    isSavingDraft={isSavingDraft}
                    isScheduling={isScheduling}
                    onSaveDraft={() => void actions.saveDraft()}
                    onSchedule={actions.handleSchedule}
                    selectedCount={factory.selectedChannels.length}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {factory.activeSection === "plan" && (
          <ContentPlanPanel
            mediaItems={persistence.mediaItems}
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
            selectedMediaId={factory.activeVariant.imageId}
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
          busy={
            plan.isUpdating ||
            plan.isApproving ||
            plan.isCancelling ||
            plan.isRetrying
          }
          mediaItems={persistence.mediaItems}
          onApprove={approvePlanPost}
          onCancel={cancelPlanPost}
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
