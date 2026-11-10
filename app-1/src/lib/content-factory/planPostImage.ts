import type {
  FactoryMediaItem,
  PlanPublication,
} from "@/lib/content-factory/contentFactoryData";
import { resolveMediaUrl } from "@/lib/site/media-url";

export const resolvePlanPostImage = (
  post: PlanPublication,
  mediaItems: FactoryMediaItem[],
): string | undefined => {
  const imageId = post.imageId || post.imageIds?.[0] || "";
  if (!imageId) return undefined;

  const mediaItem = mediaItems.find((item) => item.id === imageId);
  return mediaItem ? resolveMediaUrl(mediaItem.image) : undefined;
};
