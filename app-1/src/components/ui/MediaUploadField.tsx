import { useRef, useState } from "react";

import { Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/ui/Loader";
import { resolveMediaUrl } from "@/lib/site/media-url";
import { uploadSiteMedia } from "@/lib/site/site-content-api";

export const MediaUploadField = ({
  accept = "image/*",
  currentName,
  currentUrl,
  label = "Загрузить файл",
  onUploaded,
}: {
  readonly accept?: string;
  readonly currentName?: string;
  readonly currentUrl?: string;
  readonly label?: string;
  readonly onUploaded: (asset: {
    readonly contentType: string;
    readonly fileName: string;
    readonly url: string;
  }) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File>();
  const [uploading, setUploading] = useState(false);
  const previewUrl = currentUrl ? resolveMediaUrl(currentUrl) : undefined;

  const upload = async () => {
    if (!file) {
      toast.error("Сначала выберите файл.");
      return;
    }
    setUploading(true);
    try {
      const asset = await uploadSiteMedia(file);
      onUploaded(asset);
      setFile(undefined);
      if (inputRef.current) inputRef.current.value = "";
      toast.success("Файл загружен");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось загрузить файл.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-page/50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          accept={accept}
          className="sr-only"
          onChange={(event) => setFile(event.target.files?.[0])}
          ref={inputRef}
          type="file"
        />
        <Button
          className="shrink-0"
          onClick={() => inputRef.current?.click()}
          variant="secondary"
        >
          <Upload className="size-4" />
          Выбрать файл
        </Button>
        <span className="min-w-0 flex-1 truncate text-sm text-muted-ui-foreground">
          {file?.name ?? currentName ?? "Файл не выбран"}
        </span>
        <Button disabled={!file || uploading} onClick={() => void upload()}>
          {uploading && <Loader className="text-current" size="sm" />}
          {label}
        </Button>
      </div>
      {previewUrl && (
        <div className="mt-4 overflow-hidden rounded-xl border border-line bg-panel">
          {previewUrl.includes("contentType=video%2F") ||
          /\.(mp4|webm)(?:$|\?)/i.test(previewUrl) ? (
            <video
              className="h-44 w-full object-cover"
              controls
              muted
              src={previewUrl}
            />
          ) : (
            <img alt="" className="h-44 w-full object-cover" src={previewUrl} />
          )}
        </div>
      )}
    </div>
  );
};
