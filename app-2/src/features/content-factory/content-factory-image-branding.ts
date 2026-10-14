import { createCanvas, loadImage } from "@napi-rs/canvas";
import { readFile } from "node:fs/promises";

import { HttpError } from "../../lib/http/http-error.js";

const logoAspectRatio = 119 / 70;
const greenLogoColor = { red: 26, green: 77, blue: 46 };
const lightLogoColor = { red: 247, green: 244, blue: 238 };

type LogoVariant = "green" | "white";

const toLinearRgb = (value: number) => {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = (color: {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}) =>
  0.2126 * toLinearRgb(color.red) +
  0.7152 * toLinearRgb(color.green) +
  0.0722 * toLinearRgb(color.blue);

const contrastRatio = (first: number, second: number) =>
  (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);

export const selectAlsmaLogoVariant = (
  backgroundPixels: Uint8ClampedArray,
): LogoVariant => {
  const greenLuminance = relativeLuminance(greenLogoColor);
  const lightLuminance = relativeLuminance(lightLogoColor);
  let greenContrast = 0;
  let lightContrast = 0;
  let sampleCount = 0;

  for (let index = 0; index + 3 < backgroundPixels.length; index += 4) {
    const alpha = backgroundPixels[index + 3] ?? 0;
    if (alpha < 128) continue;

    const backgroundLuminance = relativeLuminance({
      red: backgroundPixels[index] ?? 0,
      green: backgroundPixels[index + 1] ?? 0,
      blue: backgroundPixels[index + 2] ?? 0,
    });
    greenContrast += contrastRatio(greenLuminance, backgroundLuminance);
    lightContrast += contrastRatio(lightLuminance, backgroundLuminance);
    sampleCount += 1;
  }

  if (sampleCount === 0) return "green";
  return greenContrast >= lightContrast ? "green" : "white";
};

const logoBuffers: Record<LogoVariant, Promise<Buffer>> = {
  green: readFile(new URL("./assets/logo-green.svg", import.meta.url)),
  white: readFile(new URL("./assets/logo-white.svg", import.meta.url)),
};

export const addAlsmaLogo = async (content: Buffer): Promise<Buffer> => {
  try {
    const background = await loadImage(content);
    const canvas = createCanvas(background.width, background.height);
    const context = canvas.getContext("2d");
    context.drawImage(background, 0, 0);

    const logoWidth = Math.round(
      Math.min(
        background.width * 0.12,
        background.height * 0.1 * logoAspectRatio,
      ),
    );
    const logoHeight = Math.round(logoWidth / logoAspectRatio);
    const marginX = Math.round(background.width * 0.04);
    const marginY = Math.round(background.height * 0.04);
    const logoX = marginX;
    const logoY = background.height - marginY - logoHeight;
    const backgroundPixels = context.getImageData(
      logoX,
      logoY,
      logoWidth,
      logoHeight,
    ).data;
    const variant = selectAlsmaLogoVariant(backgroundPixels);
    const logo = await loadImage(await logoBuffers[variant]);

    context.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
    return canvas.toBuffer("image/png");
  } catch {
    throw new HttpError(
      502,
      "CONTENT_FACTORY_AI_IMAGE_BRANDING_FAILED",
      "Не удалось добавить логотип на изображение. Повторите генерацию.",
    );
  }
};
