import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { MediaUploadField } from "@/components/ui/MediaUploadField";
import { resolveMediaUrl } from "@/lib/site/media-url";

export const AdminRoomGalleryField = ({
  names,
  onChange,
  urls,
}: {
  readonly names: readonly string[];
  readonly onChange: (urls: string[], names: string[]) => void;
  readonly urls: readonly string[];
}) => {
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= urls.length) return;
    const nextUrls = [...urls];
    const nextNames = [...names];
    [nextUrls[index], nextUrls[target]] = [nextUrls[target], nextUrls[index]];
    [nextNames[index], nextNames[target]] = [
      nextNames[target] ?? "",
      nextNames[index] ?? "",
    ];
    onChange(nextUrls, nextNames);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-panel-foreground">
          Фотографии проживания
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-ui-foreground">
          Добавьте несколько фото. Первое фото — обложка карточки и первое фото
          в галерее на сайте. Измените порядок стрелками.
        </p>
      </div>
      {urls.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {urls.map((url, index) => (
            <figure
              className="overflow-hidden rounded-2xl border border-line bg-panel"
              key={`${url}:${index}`}
            >
              <div className="relative aspect-square w-full">
                <img
                  alt={`Фото проживания ${index + 1}`}
                  className="size-full object-cover"
                  src={resolveMediaUrl(url)}
                />
                {index === 0 && (
                  <span className="absolute top-3 left-3 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground">
                    Обложка
                  </span>
                )}
              </div>
              <figcaption className="flex items-center gap-2 p-3">
                <span className="min-w-0 flex-1 truncate text-xs text-muted-ui-foreground">
                  {names[index] || `Фото ${index + 1}`}
                </span>
                <Button
                  aria-label={`Поднять фото ${index + 1}`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  variant="secondary"
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  aria-label={`Опустить фото ${index + 1}`}
                  disabled={index === urls.length - 1}
                  onClick={() => move(index, 1)}
                  variant="secondary"
                >
                  <ChevronDown className="size-4" />
                </Button>
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
        label="Добавить фото в галерею"
        onUploaded={(asset) =>
          onChange([...urls, asset.url], [...names, asset.fileName])
        }
      />
    </div>
  );
};
