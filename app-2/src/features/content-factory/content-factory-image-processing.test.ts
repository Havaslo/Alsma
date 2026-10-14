import { createCanvas, loadImage } from "@napi-rs/canvas";
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  composeOutpaintedImage,
  createPortraitOutpaintingCanvas,
  cropGeneratedImageToRatio,
} from "./content-factory-image-processing.js";

const createSolidImage = (width: number, height: number, color: string) => {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  context.fillStyle = color;
  context.fillRect(0, 0, width, height);
  return canvas.toBuffer("image/png");
};

test("prepares a portrait outpainting image and alpha mask around a square center", async () => {
  const layout = await createPortraitOutpaintingCanvas(
    createSolidImage(256, 256, "#173f2d"),
  );
  const image = await loadImage(layout.image);
  const mask = await loadImage(layout.mask);
  assert.deepEqual([image.width, image.height], [1024, 1536]);
  assert.deepEqual([mask.width, mask.height], [1024, 1536]);

  const imageCanvas = createCanvas(image.width, image.height);
  const imageContext = imageCanvas.getContext("2d");
  imageContext.drawImage(image, 0, 0);
  assert.equal(imageContext.getImageData(512, 120, 1, 1).data[3], 0);
  assert.equal(imageContext.getImageData(512, 768, 1, 1).data[3], 255);
  assert.equal(imageContext.getImageData(512, 1420, 1, 1).data[3], 0);

  const maskCanvas = createCanvas(mask.width, mask.height);
  const context = maskCanvas.getContext("2d");
  context.drawImage(mask, 0, 0);
  assert.equal(context.getImageData(512, 120, 1, 1).data[3], 0);
  assert.equal(context.getImageData(512, 768, 1, 1).data[3], 255);
  assert.equal(context.getImageData(512, 1420, 1, 1).data[3], 0);
});

test("keeps the original square centered while using generated pixels for added portrait space", async () => {
  const original = createSolidImage(128, 128, "#0000ff");
  const generated = createSolidImage(1024, 1536, "#ff0000");
  const layout = await createPortraitOutpaintingCanvas(original);
  const result = await composeOutpaintedImage(
    generated,
    original,
    { width: 400, height: 500 },
    layout,
  );
  const image = await loadImage(result);
  assert.deepEqual([image.width, image.height], [400, 500]);

  const canvas = createCanvas(400, 500);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  const top = context.getImageData(200, 10, 1, 1).data;
  const center = context.getImageData(200, 250, 1, 1).data;
  assert.ok(top[0]! > top[2]! * 2);
  assert.ok(center[2]! > center[0]! * 2);
});

test("crops the regenerated landscape frame to the channel aspect ratio", async () => {
  const source = createCanvas(300, 200);
  const context = source.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 300, 200);
  context.fillStyle = "#ff0000";
  context.fillRect(0, 0, 300, 40);
  context.fillStyle = "#0000ff";
  context.fillRect(0, 160, 300, 40);

  const result = await cropGeneratedImageToRatio(source.toBuffer("image/png"), {
    width: 160,
    height: 90,
  });
  const image = await loadImage(result);
  assert.deepEqual([image.width, image.height], [160, 90]);
});
