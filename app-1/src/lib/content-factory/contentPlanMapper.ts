import type {
  PlanPublication,
  PlanStatus,
} from "@/lib/content-factory/contentFactoryData";
import type {
  ContentPlanPostRecord,
  ContentPlanPostStatus,
} from "@/lib/content-factory/contentFactoryTypes";

const statusLabels: Record<ContentPlanPostStatus, PlanStatus> = {
  queued: "В очереди",
  generating: "Создаётся",
  needs_review: "На проверке",
  approved: "Одобрен к публикации",
  generation_failed: "Ошибка генерации",
  cancelled: "Отменён",
};

export const mapContentPlanPost = (
  post: ContentPlanPostRecord,
): PlanPublication => ({
  id: post.id,
  title: post.title,
  date: post.date,
  time: post.time,
  channels: [post.channel],
  status: statusLabels[post.status],
  imageId: "",
  postType: post.postType,
  format: post.format,
  text: post.text,
  imagePrompt: post.imagePrompt,
  sourceImageRecommendation: post.sourceImageRecommendation,
  generationError: post.generationError,
  sourceStatus: post.status,
  audience: post.audience,
  keyFacts: post.keyFacts,
  callToAction: post.callToAction,
  styleGuidance: post.styleGuidance,
  importFileName: post.import.fileName,
});
