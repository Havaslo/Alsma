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
import { useContentFactoryDemo } from "@/lib/content-factory/useContentFactoryDemo";
import { useContentFactoryPersistence } from "@/lib/content-factory/useContentFactoryPersistence";
import { useContentFactoryPlanDemo } from "@/lib/content-factory/useContentFactoryPlanDemo";

export const ContentFactoryWorkspace = () => {
  const persistence = useContentFactoryPersistence();
  const factory = useContentFactoryDemo(persistence.mediaItems);
  const plan = useContentFactoryPlanDemo();
  const [adaptationsOpen, setAdaptationsOpen] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

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
                onGenerate={factory.handleGenerate}
                onPromptChange={factory.setPrompt}
                onToggleChannel={factory.toggleChannel}
                prompt={factory.prompt}
                selectedChannels={factory.selectedChannels}
              />
              <ContentDraftPanel
                mediaItems={persistence.mediaItems}
                onCustomAction={factory.applyCustomCommand}
                onDraftAction={factory.applyDraftAction}
                onImageGenerate={factory.explainImageGeneration}
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
              onPublish={factory.publishDemo}
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
