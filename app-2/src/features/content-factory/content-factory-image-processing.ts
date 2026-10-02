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

export const cropGeneratedImage = async (
  content: Buffer,
  target: { readonly width: number; readonly height: number },
) => {
  try {
    const source = await loadImage(content);
    const targetRatio = target.width / target.height;
    const sourceRatio = source.width / source.height;
    const cropWidth =
      sourceRatio > targetRatio ? source.height * targetRatio : source.width;
    const cropHeight =
      sourceRatio > targetRatio ? source.height : source.width / targetRatio;
    const canvas = createCanvas(target.width, target.height);
    const context = canvas.getContext("2d");
    context.drawImage(
      source,
      (source.width - cropWidth) / 2,
      (source.height - cropHeight) / 2,
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
      "AI-сервис вернул повреждённое изображение. Повторите запрос.",
    );
  }
};
