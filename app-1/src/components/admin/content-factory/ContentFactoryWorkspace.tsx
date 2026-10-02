import { CheckCircle2 } from "lucide-react";

import { ChannelAdaptationsPanel } from "@/components/admin/content-factory/ChannelAdaptationsPanel";
import { ContentApprovalActions } from "@/components/admin/content-factory/ContentApprovalActions";
import { ContentBriefPanel } from "@/components/admin/content-factory/ContentBriefPanel";
import { ContentDraftPanel } from "@/components/admin/content-factory/ContentDraftPanel";
import { ContentFactoryHeader } from "@/components/admin/content-factory/ContentFactoryHeader";
import { FactoryNotice } from "@/components/admin/content-factory/ContentFactoryPrimitives";
import { ContentPlanPanel } from "@/components/admin/content-factory/ContentPlanPanel";
import { MediaLibraryPanel } from "@/components/admin/content-factory/MediaLibraryPanel";
import { PublicationHistoryPanel } from "@/components/admin/content-factory/PublicationHistoryPanel";
import { useContentFactoryDemo } from "@/lib/content-factory/useContentFactoryDemo";
import { useContentFactoryPlanDemo } from "@/lib/content-factory/useContentFactoryPlanDemo";

export const ContentFactoryWorkspace = () => {
  const factory = useContentFactoryDemo();
  const plan = useContentFactoryPlanDemo();

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
    <main className="min-h-screen bg-[#f5f7f5] px-4 py-6 text-slate-900 sm:px-6 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-[1540px]">
        <ContentFactoryHeader
          activeSection={factory.activeSection}
          onSectionChange={factory.setActiveSection}
        />

        <div className="mt-5 space-y-4">
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

              <ChannelAdaptationsPanel
                activeChannel={factory.activeChannel}
                onActiveChannelChange={factory.setActiveChannel}
                onAdaptAction={factory.adaptChannel}
                onMediaBrowse={factory.browseChannelImage}
                onTextChange={factory.updateAdaptation}
                onToggleChannel={factory.toggleChannel}
                selectedChannels={factory.selectedChannels}
                variant={factory.activeVariant}
              />
              <ContentApprovalActions
                approved={factory.approved}
                onApprove={factory.approveDraft}
                onPublish={factory.publishDemo}
                onSaveDraft={factory.saveDraftDemo}
                onSchedule={handleSchedule}
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

          {factory.activeSection === "history" && <PublicationHistoryPanel />}
        </div>

        <div className="mt-6 flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-xs leading-5 text-slate-500">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" />
          <p>
            Все тексты, статусы и показатели в этом макете демонстрационные. Ни
            одна публикация не отправляется без явного подтверждения;
            подключение AI и каналов не настроено.
          </p>
        </div>
      </div>
    </main>
  );
};
