import assert from "node:assert/strict";
import test from "node:test";

import { renderVkTestRss } from "./vk-rss.js";

const content = {
  title: "Тест & <фото>",
  text: "Первый абзац\n\n<script>alert(1)</script>",
  link: "https://alsma.ru/blog",
  publishedAt: "2026-11-09T00:00:00Z",
  images: [1, 2].map((n) => ({
    url: `https://alsma.ru/test${n}.jpg?a=1&b=2`,
    type: "image/jpeg",
    bytes: 100,
  })),
};
const row = { itemKey: "test-1", status: "published", content };
const now = new Date("2026-11-09T10:00:00Z");
test("empty feed has no entries; draft, invalid and future entries are excluded", () => {
  assert.ok(!renderVkTestRss([], now).includes("<item>"));
  for (const entry of [
    { ...row, status: "draft" },
    { ...row, content: {} },
    { ...row, content: { ...content, publishedAt: "2027-01-01T00:00:00Z" } },
    {
      ...row,
      content: {
        ...content,
        images: [{ url: "javascript:alert(1)", type: "image/jpeg", bytes: 1 }],
      },
    },
  ]) {
    assert.ok(!renderVkTestRss([entry], now).includes("<item>"));
  }
});
test("all photos included, text is escaped and GUID survives edits", () => {
  const xml = renderVkTestRss([row], now);
  assert.equal((xml.match(/<item>/g) ?? []).length, 1);
  assert.equal((xml.match(/<media:content /g) ?? []).length, 2);
  assert.equal((xml.match(/&lt;img /g) ?? []).length, 4);
  assert.ok(!xml.includes("<script>"));
  assert.ok(xml.includes("&amp;lt;script&amp;gt;"));
  const updated = renderVkTestRss(
    [{ ...row, content: { ...content, title: "Изменено" } }],
    now,
  );
  assert.equal(
    xml.match(/<guid[^>]*>.*?<\/guid>/)?.[0],
    updated.match(/<guid[^>]*>.*?<\/guid>/)?.[0],
  );
});
