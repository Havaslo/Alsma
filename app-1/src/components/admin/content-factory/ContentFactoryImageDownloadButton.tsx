import { useState } from "react";

import { Download, LoaderCircle } from "lucide-react";

import { resolveMediaUrl } from "@/lib/site/media-url";

export const ContentFactoryImageDownloadButton = ({
  src,
  fileName,
  label,
  className,
}: {
  src: string;
  fileName: string;
  label: string;
  className: string;
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");

  const downloadImage = async () => {
    setIsDownloading(true);
    setError("");
    try {
      const response = await fetch(resolveMediaUrl(src), {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Image download failed");
      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1_000);
    } catch {
      setError("Не удалось скачать файл. Попробуйте ещё раз.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <button
        aria-label={`Скачать изображение: ${label}`}
        className={className}
        disabled={isDownloading}
        onClick={() => void downloadImage()}
        title={isDownloading ? "Скачиваем…" : "Скачать изображение"}
        type="button"
      >
        {isDownloading ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Download aria-hidden="true" className="size-4" />
        )}
      </button>
      {error && (
        <span aria-live="polite" className="sr-only" role="status">
          {error}
        </span>
      )}
    </>
  );
};
