import { createCanvas, loadImage } from "@napi-rs/canvas";
import assert from "node:assert/strict";
import test from "node:test";

import { prepareVkPhoto } from "./vk-photo-image.js";

test("WebP media becomes a bounded JPEG with a matching filename", async () => {
  const canvas = createCanvas(3000, 1000);
  const content = new Uint8Array(await canvas.encode("webp", 80));
  const result = await prepareVkPhoto({
    content,
    contentType: "image/webp",
    fileName: "source.webp",
  });
  assert.equal(result.contentType, "image/jpeg");
  assert.equal(result.fileName, "vk-photo.jpg");
  assert.equal(
    Buffer.from(result.content).subarray(0, 2).toString("hex"),
    "ffd8",
  );
  const decoded = await loadImage(Buffer.from(result.content));
  assert.equal(decoded.width, 2560);
  assert.equal(decoded.height, 853);
});

test("unreadable image fails before any provider publication", async () => {
  await assert.rejects(
    prepareVkPhoto({
      content: new Uint8Array([1, 2, 3]),
      contentType: "image/jpeg",
      fileName: "bad.jpg",
    }),
  );
});
