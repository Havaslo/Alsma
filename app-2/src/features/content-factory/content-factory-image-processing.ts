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
