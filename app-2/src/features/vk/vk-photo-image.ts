import { createCanvas, loadImage } from "@napi-rs/canvas";

import type { VkPublishImage } from "./vk.client.js";

// Shared by the scheduled publisher and the authenticated test publisher.
export const prepareVkPhoto = async (
  image: VkPublishImage,
): Promise<VkPublishImage> => {
  if (!image.content.byteLength || image.content.byteLength > 50 * 1024 * 1024)
    throw new Error("VK image is empty or too large");
  const decoded = await loadImage(Buffer.from(image.content));
  if (
    !decoded.width ||
    !decoded.height ||
    decoded.width * decoded.height > 40_000_000
  )
    throw new Error("VK image dimensions are invalid");
  const scale = Math.min(1, 2560 / Math.max(decoded.width, decoded.height));
  const canvas = createCanvas(
    Math.max(1, Math.round(decoded.width * scale)),
    Math.max(1, Math.round(decoded.height * scale)),
  );
  const context = canvas.getContext("2d");
  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(decoded, 0, 0, canvas.width, canvas.height);
  return {
    content: new Uint8Array(await canvas.encode("jpeg", 90)),
    contentType: "image/jpeg",
    fileName: "vk-photo.jpg",
  };
};
