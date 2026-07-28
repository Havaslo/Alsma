import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { MediaUploadField } from "@/components/ui/MediaUploadField";

export const AdminRoomGalleryField = ({
  names,
  onChange,
  urls,
}: {
  readonly names: readonly string[];
  readonly onChange: (urls: string[], names: string[]) => void;
  readonly urls: readonly string[];
}) => (
  <div className="space-y-4">
    <p className="text-sm font-medium text-panel-foreground">Фотогалерея</p>
    {urls.length > 0 && (
      <div className="grid gap-4 md:grid-cols-2">
        {urls.map((url, index) => (
          <figure
            className="overflow-hidden rounded-2xl border border-line bg-panel"
            key={`${url}:${index}`}
          >
            <img
              alt={`Фото номера ${index + 1}`}
              className="h-56 w-full object-cover"
              src={url}
            />
            <figcaption className="flex items-center gap-3 p-3">
              <span className="min-w-0 flex-1 truncate text-xs text-muted-ui-foreground">
                {names[index] || url}
              </span>
              <Button
                aria-label={`Удалить фото ${index + 1}`}
                className="text-destructive"
                onClick={() =>
                  onChange(
                    urls.filter((_, itemIndex) => itemIndex !== index),
                    names.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
                variant="secondary"
              >
                <Trash2 className="size-4" />
              </Button>
            </figcaption>
          </figure>
        ))}
      </div>
    )}
    <MediaUploadField
      label="Загрузить фото в галерею"
      onUploaded={(asset) =>
        onChange([...urls, asset.url], [...names, asset.fileName])
      }
    />
    <p className="text-xs leading-5 text-muted-ui-foreground">
      Первое изображение используется как обложка карточки.
    </p>
  </div>
);
