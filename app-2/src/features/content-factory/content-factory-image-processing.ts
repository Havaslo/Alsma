import { createCanvas, loadImage } from "@napi-rs/canvas";

import { HttpError } from "../../lib/http/http-error.js";
import { contentFactoryChannelGuidelines } from "./content-factory-guidelines.js";

const referencePhotoMaxBytes = 50 * 1_024 * 1_024;
const supportedReferenceTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const assertReferencePhoto = (content: unknown, contentType: string) => {
  if (
    !Buffer.isBuffer(content) ||
    content.length === 0 ||
    content.length > referencePhotoMaxBytes ||
    !supportedReferenceTypes.has(contentType)
  ) {
    throw new HttpError(
      400,
      "CONTENT_FACTORY_REFERENCE_PHOTO_INVALID",
      "Для генерации выберите JPG, PNG или WebP размером не более 50 МБ.",
    );
  }

  const matchesSignature =
    (contentType === "image/jpeg" &&
      content[0] === 0xff &&
      content[1] === 0xd8 &&
      content[2] === 0xff) ||
    (contentType === "image/png" &&
      content
        .subarray(0, 8)
        .equals(
          Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        )) ||
    (contentType === "image/webp" &&
      content.toString("ascii", 0, 4) === "RIFF" &&
      content.toString("ascii", 8, 12) === "WEBP");

  if (!matchesSignature) {
    throw new HttpError(
      400,
      "CONTENT_FACTORY_REFERENCE_PHOTO_INVALID",
      "Не удалось прочитать выбранную фотографию. Выберите другое изображение.",
    );
  }
  return content;
};

export const buildContentFactoryChannelPromptContext = () =>
  contentFactoryChannelGuidelines.map((channel) => ({
    channel: channel.label,
    text: channel.copy,
    visual: `${channel.image.dimensions}, ${channel.image.ratio}, ${channel.image.format}. ${channel.image.note}`,
    multiImage: channel.gallery,
  }));

export const fitGeneratedImageWithoutCropping = async (
  content: Buffer,
  target: { readonly width: number; readonly height: number },
) => {
  try {
    const source = await loadImage(content);
    const scale = Math.min(
      target.width / source.width,
      target.height / source.height,
    );
    const fittedWidth = Math.round(source.width * scale);
    const fittedHeight = Math.round(source.height * scale);
    const backgroundScale = Math.max(
      target.width / source.width,
      target.height / source.height,
    );
    const backgroundWidth = source.width * backgroundScale;
    const backgroundHeight = source.height * backgroundScale;
    const canvas = createCanvas(target.width, target.height);
    const context = canvas.getContext("2d");
    // Image generation supports nearby, not exact, channel ratios. Use a
    // blurred cover for the background and preserve the complete source frame
    // in front, so text near an edge is not cut off during aspect fitting.
    context.filter = `blur(${Math.max(12, Math.round(target.width * 0.025))}px)`;
    context.drawImage(
      source,
      (target.width - backgroundWidth) / 2,
      (target.height - backgroundHeight) / 2,
      backgroundWidth,
      backgroundHeight,
    );
    context.filter = "none";
    context.drawImage(
      source,
      (target.width - fittedWidth) / 2,
      (target.height - fittedHeight) / 2,
      fittedWidth,
      fittedHeight,
    );
    return canvas.toBuffer("image/png");
  } catch {
    throw new HttpError(
      502,
      "CONTENT_FACTORY_AI_IMAGE_INVALID",
      "AI-сервис вернул повреждённое изображение. Повторите запрос.",
    );
  }
};

export const createPortraitOutpaintingCanvas = async (content: Buffer) => {
  try {
    const source = await loadImage(content);
    if (Math.abs(source.width - source.height) > 1) {
      throw new Error("Outpainting requires a square base image");
    }

    const canvasWidth = 1024;
    const canvasHeight = 1536;
    const sourceSize = 1024;
    const sourceRect = {
      height: sourceSize,
      width: sourceSize,
      x: 0,
      y: (canvasHeight - sourceSize) / 2,
    };
    const imageCanvas = createCanvas(canvasWidth, canvasHeight);
    const imageContext = imageCanvas.getContext("2d");
    // Keep the outpainting area truly transparent. A blurred enlargement here
    // can be mistaken for finished image content instead of a request to extend
    // the scene, even when the separate mask identifies it as editable.
    imageContext.drawImage(
      source,
      sourceRect.x,
      sourceRect.y,
      sourceRect.width,
      sourceRect.height,
    );

    const maskCanvas = createCanvas(canvasWidth, canvasHeight);
    const maskContext = maskCanvas.getContext("2d");
    const protectedInset = 40;
    maskContext.fillStyle = "#ffffff";
    maskContext.fillRect(
      sourceRect.x + protectedInset,
      sourceRect.y + protectedInset,
      sourceRect.width - protectedInset * 2,
      sourceRect.height - protectedInset * 2,
    );

    return {
      image: imageCanvas.toBuffer("image/png"),
      mask: maskCanvas.toBuffer("image/png"),
      sourceRect,
      canvasHeight,
      canvasWidth,
    };
  } catch {
    throw new HttpError(
      502,
      "CONTENT_FACTORY_AI_IMAGE_INVALID",
      "Не удалось подготовить квадратное изображение для дорисовки. Повторите запрос.",
    );
  }
};

export const composeOutpaintedImage = async (
  content: Buffer,
  sourceContent: Buffer,
  target: { readonly width: number; readonly height: number },
  layout: {
    readonly canvasHeight: number;
    readonly canvasWidth: number;
    readonly sourceRect: {
      readonly height: number;
      readonly width: number;
      readonly x: number;
      readonly y: number;
    };
  },
) => {
  try {
    const generated = await loadImage(content);
    const original = await loadImage(sourceContent);
    const targetRatio = target.width / target.height;
    let cropWidth = generated.width;
    let cropHeight = generated.height;
    if (generated.width / generated.height > targetRatio) {
      cropWidth = Math.round(generated.height * targetRatio);
    } else {
      cropHeight = Math.round(generated.width / targetRatio);
    }
    const cropX = Math.round((generated.width - cropWidth) / 2);
    const cropY = Math.round((generated.height - cropHeight) / 2);
    const canvas = createCanvas(target.width, target.height);
    const context = canvas.getContext("2d");
    context.drawImage(
      generated,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      target.width,
      target.height,
    );

    // Restore the untouched square center so mask-based outpainting cannot
    // rewrite the AI-generated headline or the original scene.
    const sourceLayer = createCanvas(original.width, original.height);
    const sourceContext = sourceLayer.getContext("2d");
    sourceContext.drawImage(original, 0, 0);
    const fade = 40;
    const sourcePixels = sourceContext.getImageData(
      0,
      0,
      original.width,
      original.height,
    );
    for (let y = 0; y < original.height; y += 1) {
      for (let x = 0; x < original.width; x += 1) {
        const distance = Math.min(
          x,
          y,
          original.width - 1 - x,
          original.height - 1 - y,
        );
        const alpha = Math.min(1, distance / fade);
        sourcePixels.data[(y * original.width + x) * 4 + 3] = Math.round(
          255 * alpha,
        );
      }
    }
    sourceContext.putImageData(sourcePixels, 0, 0);

    const scaleX = generated.width / layout.canvasWidth;
    const scaleY = generated.height / layout.canvasHeight;
    const left =
      ((layout.sourceRect.x * scaleX - cropX) / cropWidth) * target.width;
    const top =
      ((layout.sourceRect.y * scaleY - cropY) / cropHeight) * target.height;
    const width =
      ((layout.sourceRect.width * scaleX) / cropWidth) * target.width;
    const height =
      ((layout.sourceRect.height * scaleY) / cropHeight) * target.height;
    context.drawImage(sourceLayer, left, top, width, height);
    return canvas.toBuffer("image/png");
  } catch {
    throw new HttpError(
      502,
      "CONTENT_FACTORY_AI_IMAGE_INVALID",
      "AI-сервис вернул повреждённый результат дорисовки. Повторите запрос.",
    );
  }
};

export const cropGeneratedImageToRatio = async (
  content: Buffer,
  target: { readonly width: number; readonly height: number },
) => {
  try {
    const source = await loadImage(content);
    const targetRatio = target.width / target.height;
    let cropWidth = source.width;
    let cropHeight = source.height;
    if (source.width / source.height > targetRatio) {
      cropWidth = Math.round(source.height * targetRatio);
    } else {
      cropHeight = Math.round(source.width / targetRatio);
    }
    const canvas = createCanvas(target.width, target.height);
    canvas
      .getContext("2d")
      .drawImage(
        source,
        Math.round((source.width - cropWidth) / 2),
        Math.round((source.height - cropHeight) / 2),
        cropWidth,
        cropHeight,
        0,
        0,
        target.width,
        target.height,
      );
    return canvas.toBuffer("image/png");
  } catch {
    throw new HttpError(
      502,
      "CONTENT_FACTORY_AI_IMAGE_INVALID",
      "Не удалось подготовить горизонтальную обложку. Повторите запрос.",
    );
  }
};
