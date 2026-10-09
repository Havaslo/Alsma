import { useEffect, useState } from "react";

import { Download, Expand, X } from "lucide-react";

import { resolveMediaUrl } from "@/lib/site/media-url";

export const ContentFactoryImageViewer = ({
  src,
  alt,
  downloadName,
}: {
  src: string;
  alt: string;
  downloadName: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const imageUrl = resolveMediaUrl(src);

  const downloadImage = async () => {
    setIsDownloading(true);
    setDownloadError("");
    try {
      const response = await fetch(imageUrl, { credentials: "include" });
      if (!response.ok) throw new Error("Image download failed");
      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = downloadName;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1_000);
    } catch {
      setDownloadError("Не удалось скачать файл. Попробуйте ещё раз.");
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <>
      <button
        aria-label={`Открыть изображение: ${alt}`}
        className="absolute top-2 right-2 grid size-9 place-items-center rounded-xl border border-white/70 bg-brand-foreground/95 text-page-foreground shadow-sm transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        onClick={() => setIsOpen(true)}
        title="Открыть на весь экран"
        type="button"
      >
        <Expand aria-hidden="true" className="size-4" />
      </button>

      {isOpen && (
        <div
          aria-label="Просмотр изображения"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 p-3 backdrop-blur-sm sm:p-5"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
          role="dialog"
        >
          <header className="flex shrink-0 items-center justify-between gap-3">
            <p className="truncate text-sm font-medium text-white/85">{alt}</p>
            <div className="flex shrink-0 items-center gap-2">
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-wait disabled:opacity-60"
                disabled={isDownloading}
                onClick={() => void downloadImage()}
                type="button"
              >
                <Download aria-hidden="true" className="size-4" />
                <span className="hidden sm:inline">
                  {isDownloading ? "Скачиваем…" : "Скачать"}
                </span>
              </button>
              <button
                aria-label="Закрыть просмотр"
                className="grid size-10 place-items-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
          </header>
          <div className="flex min-h-0 flex-1 items-center justify-center py-4">
            <img
              alt={alt}
              className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
              src={imageUrl}
            />
          </div>
          {downloadError && (
            <p
              aria-live="polite"
              className="shrink-0 pb-2 text-center text-sm text-white"
              role="status"
            >
              {downloadError}
            </p>
          )}
        </div>
      )}
    </>
  );
};
