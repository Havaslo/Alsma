import { useState } from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";

export const RoomGallery = ({
  images,
  title,
}: {
  readonly images: readonly string[];
  readonly title: string;
}) => {
  const gallery = images.filter(Boolean);
  const [activeIndex, setActiveIndex] = useState(0);
  const currentIndex = Math.min(activeIndex, Math.max(gallery.length - 1, 0));
  const currentImage = gallery[currentIndex];

  if (!currentImage) return null;

  const goTo = (index: number) =>
    setActiveIndex((index + gallery.length) % gallery.length);

  return (
    <div className="relative min-h-0 bg-brand/5">
      <img
        alt={title}
        className="aspect-square size-full object-cover"
        src={currentImage}
      />
      {gallery.length > 1 && (
        <>
          <button
            aria-label="Предыдущее фото"
            className="absolute top-1/2 left-4 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-page/90 text-brand shadow-lg transition hover:bg-page"
            onClick={() => goTo(currentIndex - 1)}
            type="button"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            aria-label="Следующее фото"
            className="absolute top-1/2 right-4 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-page/90 text-brand shadow-lg transition hover:bg-page"
            onClick={() => goTo(currentIndex + 1)}
            type="button"
          >
            <ChevronRight className="size-5" />
          </button>
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
            {gallery.map((image, index) => (
              <button
                aria-label={`Открыть фото ${index + 1}`}
                className={`size-2.5 rounded-full transition ${index === currentIndex ? "bg-page" : "bg-page/55"}`}
                key={`${image}:${index}`}
                onClick={() => goTo(index)}
                type="button"
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
