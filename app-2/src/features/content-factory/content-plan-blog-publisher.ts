import type { Prisma } from "../../generated/prisma/client.js";
import type { Database } from "../../lib/database/database.js";

type BlogPost = {
  readonly id: string;
  readonly generatedTitle: string;
  readonly generatedCopy: string;
  readonly postType: string;
  readonly scheduledDate: Date;
  readonly imageIds: readonly string[];
};

const categoryForPost = (postType: string): "guide" | "stories" | "tips" => {
  const type = postType.toLocaleLowerCase("ru-RU");
  if (type.includes("гид") || type.includes("маршрут")) return "guide";
  if (type.includes("истор") || type.includes("отзыв")) return "stories";
  return "tips";
};

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);

const mediaUrl = (objectId: string, contentType: string) =>
  `/api/media/managed/${Buffer.from(objectId, "utf8").toString("base64url")}?contentType=${encodeURIComponent(contentType)}`;

export const createContentPlanBlogPublisher = (database: Database) =>
  async (post: BlogPost) => {
    const title = post.generatedTitle.trim() || "Статья ALSMA";
    const details = post.generatedCopy.trim();
    const dateValue = post.scheduledDate.toISOString().slice(0, 10);
    const firstParagraph = details
      .split(/\n\s*\n/u)
      .map((paragraph) => paragraph.trim())
      .find(Boolean);
    const description = (firstParagraph || details).slice(0, 260);
    const media = post.imageIds.length
      ? await database.client.contentFactoryMedia.findFirst({
          where: { id: post.imageIds[0] },
          select: { contentType: true, objectId: true },
        })
      : null;
    const image = media
      ? mediaUrl(media.objectId, media.contentType)
      : "";
    const itemKey = `content-plan-${post.id}`;
    const content = {
      category: categoryForPost(post.postType),
      date: formatDate(post.scheduledDate),
      dateValue,
      description,
      details,
      image,
      isActive: true,
      sortOrder: -Date.parse(`${dateValue}T00:00:00.000Z`),
      tags: [post.postType],
      title,
    };
    const item = await database.client.siteContent.upsert({
      create: {
        content: content as Prisma.InputJsonValue,
        itemKey,
        position: 0,
        section: "blog",
        status: "published",
        title,
      },
      update: {
        content: content as Prisma.InputJsonValue,
        status: "published",
        title,
      },
      where: { section_itemKey: { itemKey, section: "blog" } },
      select: { id: true },
    });
    return { externalId: item.id, url: "/blog" };
  };
