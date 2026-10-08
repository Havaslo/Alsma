import { useState } from "react";

import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { FactoryMediaItem } from "@/lib/content-factory/contentFactoryData";
import { resolveMediaUrl } from "@/lib/site/media-url";

export const ChannelImageOrderDialog = ({
  channelLabel,
  images,
  onClose,
  onSave,
}: {
  channelLabel: string;
  images: FactoryMediaItem[];
  onClose: () => void;
  onSave: (imageIds: string[]) => Promise<boolean>;
}) => {
  const [orderedImages, setOrderedImages] = useState(images);
  const [isSaving, setIsSaving] = useState(false);

  const moveImage = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= orderedImages.length) return;
    setOrderedImages((current) => {
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex]!, next[index]!];
      return next;
    });
  };

  const saveOrder = async () => {
    setIsSaving(true);
    try {
      if (await onSave(orderedImages.map((image) => image.id))) onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      className="max-w-xl"
      closeLabel="Закрыть"
      footer={
        <>
          <Button
            disabled={isSaving}
            onClick={onClose}
            type="button"
            variant="secondary"
          >
            Отмена
          </Button>
          <Button disabled={isSaving} onClick={() => void saveOrder()}>
            {isSaving ? "Сохраняем…" : "Сохранить порядок"}
          </Button>
        </>
      }
      onClose={isSaving ? () => undefined : onClose}
      open
      title={`Порядок изображений · ${channelLabel}`}
    >
      <p className="mb-4 text-sm text-muted-ui-foreground">
        Меняйте порядок стрелками. Первое изображение будет показываться первым.
      </p>
      <ol className="space-y-2">
        {orderedImages.map((image, index) => (
          <li
            className="flex items-center gap-3 rounded-xl border border-line bg-page/60 p-2.5"
            key={image.id}
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
              {index + 1}
            </span>
            <img
              alt=""
              className="size-14 shrink-0 rounded-lg object-cover"
              src={resolveMediaUrl(image.image)}
            />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-page-foreground">
              {image.title}
            </span>
            <GripVertical
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-ui-foreground"
            />
            <button
              aria-label={`Переместить ${image.title} выше`}
              className="grid size-9 place-items-center rounded-lg border border-line bg-brand-foreground text-page-foreground transition hover:bg-page disabled:cursor-not-allowed disabled:opacity-35"
              disabled={index === 0 || isSaving}
              onClick={() => moveImage(index, -1)}
              type="button"
            >
              <ArrowUp className="size-4" />
            </button>
            <button
              aria-label={`Переместить ${image.title} ниже`}
              className="grid size-9 place-items-center rounded-lg border border-line bg-brand-foreground text-page-foreground transition hover:bg-page disabled:cursor-not-allowed disabled:opacity-35"
              disabled={index === orderedImages.length - 1 || isSaving}
              onClick={() => moveImage(index, 1)}
              type="button"
            >
              <ArrowDown className="size-4" />
            </button>
          </li>
        ))}
      </ol>
    </Modal>
  );
};
