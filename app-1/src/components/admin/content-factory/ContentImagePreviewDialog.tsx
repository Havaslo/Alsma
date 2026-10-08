import { Download, X } from "lucide-react";

import type { FactoryMediaItem } from "@/lib/content-factory/contentFactoryData";
import { resolveMediaUrl } from "@/lib/site/media-url";

export const ContentImagePreviewDialog = ({
  image,
  onClose,
}: {
  image: FactoryMediaItem;
  onClose: () => void;
}) => {
  const imageUrl = resolveMediaUrl(image.image);
  const downloadName = `${image.title || "Изображение"}`
    .replace(/[\\/:*?"<>|]/gu, "-")
    .trim();
  const sourceExtension = image.image
    .split(/[?#]/u, 1)[0]
    ?.match(/\.([a-z0-9]{2,5})$/iu)?.[1]
    ?.toLowerCase();
  const extension =
    image.contentType === "image/png"
      ? "png"
      : image.contentType === "image/webp"
        ? "webp"
        : image.contentType === "image/gif"
          ? "gif"
          : sourceExtension &&
              ["jpg", "jpeg", "png", "webp", "gif"].includes(sourceExtension)
            ? sourceExtension
            : "jpg";

  return (
    <div
      aria-label={`Предпросмотр: ${image.title}`}
      aria-modal="true"
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/95 p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
    >
      <section className="flex max-h-full w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-950 shadow-2xl">
        <header className="flex items-center justify-between gap-3 px-4 py-3 text-white sm:px-5">
          <h2 className="min-w-0 truncate text-sm font-semibold sm:text-base">
            {image.title}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            <a
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
              download={`${downloadName}.${extension}`}
              href={imageUrl}
            >
              <Download className="size-4" />
              Скачать
            </a>
            <button
              aria-label="Закрыть предпросмотр"
              className="grid size-10 place-items-center rounded-xl text-white/80 transition hover:bg-white/10 hover:text-white"
              onClick={onClose}
              type="button"
            >
              <X className="size-5" />
            </button>
          </div>
        </header>
        <div className="grid min-h-0 flex-1 place-items-center overflow-auto p-2 sm:p-4">
          <img
            alt={image.title}
            className="max-h-[calc(100vh-8rem)] max-w-full object-contain"
            src={imageUrl}
          />
        </div>
      </section>
    </div>
  );
};
