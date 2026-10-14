import { createCanvas, loadImage } from "@napi-rs/canvas";
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  addAlsmaLogo,
  selectAlsmaLogoVariant,
} from "./content-factory-image-branding.js";
import { fitGeneratedImageWithoutCropping } from "./content-factory-image-processing.js";

const solidPixels = (red: number, green: number, blue: number) =>
  new Uint8ClampedArray([red, green, blue, 255]);

const createSolidImage = (width: number, height: number, color: string) => {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  context.fillStyle = color;
  context.fillRect(0, 0, width, height);
  return canvas.toBuffer("image/png");
};

test("chooses the green mark on a light background and the white mark on a dark one", () => {
  assert.equal(selectAlsmaLogoVariant(solidPixels(255, 255, 255)), "green");
  assert.equal(selectAlsmaLogoVariant(solidPixels(16, 16, 16)), "white");
});

test("adds the contrast-matched logo after fitting each supported shape", async () => {
  const source = createSolidImage(320, 240, "#ffffff");
  const targets = [
    { width: 160, height: 200 },
    { width: 200, height: 200 },
    { width: 320, height: 180 },
  ];

  for (const target of targets) {
    const fitted = await fitGeneratedImageWithoutCropping(source, target);
    const branded = await addAlsmaLogo(fitted);
    const result = await loadImage(branded);

    assert.equal(result.width, target.width);
    assert.equal(result.height, target.height);

    const canvas = createCanvas(target.width, target.height);
    const context = canvas.getContext("2d");
    context.drawImage(result, 0, 0);
    const pixels = context.getImageData(
      0,
      target.height - Math.round(target.height * 0.18),
      Math.round(target.width * 0.2),
      Math.round(target.height * 0.14),
    ).data;
    const hasLogoColor = pixels.some(
      (value, index) => index % 4 !== 3 && value < 200,
    );

    assert.equal(hasLogoColor, true);
  }
});

test("preserves content touching the source edges when fitting another ratio", async () => {
  const sourceCanvas = createCanvas(320, 480);
  const sourceContext = sourceCanvas.getContext("2d");
  sourceContext.fillStyle = "#365a48";
  sourceContext.fillRect(0, 0, 320, 480);
  sourceContext.fillStyle = "#ff0000";
  sourceContext.fillRect(0, 0, 320, 40);
  sourceContext.fillStyle = "#0000ff";
  sourceContext.fillRect(0, 440, 320, 40);

  const target = { width: 400, height: 500 };
  const fitted = await fitGeneratedImageWithoutCropping(
    sourceCanvas.toBuffer("image/png"),
    target,
  );
  const fittedImage = await loadImage(fitted);
  const outputCanvas = createCanvas(target.width, target.height);
  const outputContext = outputCanvas.getContext("2d");
  outputContext.drawImage(fittedImage, 0, 0);

  assert.equal(fittedImage.width, target.width);
  assert.equal(fittedImage.height, target.height);
  const topSample = outputContext.getImageData(200, 32, 1, 1).data;
  const bottomSample = outputContext.getImageData(200, 468, 1, 1).data;
  assert.ok(topSample[0]! > topSample[1]! * 2);
  assert.ok(bottomSample[2]! > bottomSample[0]! * 2);
});
