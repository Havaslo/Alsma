import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const maxPreviewPixels = 4_000_000;
const maxPreviewScale = 1.5;

/**
 * Renders the first PDF page, including its text, vector content and images.
 * This intentionally does not extract an embedded PDF image: embedded images
 * can be only a background layer or a fragment of the actual page.
 */
export const renderFirstPdfPage = async (
  content: Uint8Array,
): Promise<Uint8Array> => {
  const loadingTask = getDocument({
    data: Uint8Array.from(content),
    isImageDecoderSupported: false,
    isOffscreenCanvasSupported: false,
  });
  const pdf = await loadingTask.promise;

  try {
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(
      maxPreviewScale,
      Math.sqrt(maxPreviewPixels / (baseViewport.width * baseViewport.height)),
    );
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height),
    );

    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: canvas.getContext(
        "2d",
      ) as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;

    return Uint8Array.from(await canvas.encode("jpeg", 86));
  } finally {
    await loadingTask.destroy();
  }
};
