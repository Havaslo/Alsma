import { z } from "zod";

const imageSchema = z.object({
  url: z.url().refine((value) => new URL(value).protocol === "https:"),
  type: z.enum(["image/jpeg", "image/png"]),
  bytes: z.number().int().nonnegative(),
});
export const vkRssItemSchema = z.object({
  title: z.string().trim().min(1).max(240),
  text: z.string().trim().min(1).max(20000),
  link: z.url().refine((value) => new URL(value).protocol === "https:"),
  publishedAt: z.iso.datetime(),
  images: z.array(imageSchema).max(10),
});
// XML 1.0 disallows these control characters even inside escaped text.
const escape = (value: string) =>
  value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export const renderVkTestRss = (
  rows: readonly { itemKey: string; status: string; content: unknown }[],
  now = new Date(),
) => {
  const items = rows.flatMap((row) => {
    const parsed = vkRssItemSchema.safeParse(row.content);
    if (
      row.status !== "published" ||
      !parsed.success ||
      new Date(parsed.data.publishedAt) > now
    )
      return [];
    const item = parsed.data;
    const html =
      item.text
        .split(/\n\s*\n/)
        .map((p) => `<p>${escape(p).replace(/\n/g, "<br/>")}</p>`)
        .join("") +
      item.images
        .map(
          (image) =>
            `<p><img src="${escape(image.url)}" alt="${escape(item.title)}" /></p>`,
        )
        .join("");
    const cover = item.images[0];
    return [
      `<item><guid isPermaLink="false">${escape(`alsma-vk-rss-test:${row.itemKey}`)}</guid><title>${escape(item.title)}</title><link>${escape(item.link)}</link><pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate><description>${escape(html)}</description><content:encoded>${escape(html)}</content:encoded>${cover ? `<enclosure url="${escape(cover.url)}" type="${cover.type}" length="${cover.bytes}"/>` : ""}${item.images.map((image) => `<media:content url="${escape(image.url)}" type="${image.type}" medium="image"/>`).join("")}</item>`,
    ];
  });
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>ALSMA — тест импорта VK</title><link>https://alsma.ru/</link><description>Изолированная тестовая лента для Black Turtle. Не подключать к рабочему сообществу.</description><language>ru</language>${items.join("")}</channel></rss>`;
};
