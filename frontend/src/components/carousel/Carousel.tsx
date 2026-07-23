import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  useEffect,
  useState,
} from "react";

import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type EmblaOptions = Parameters<typeof useEmblaCarousel>[0];
type EmblaPlugins = Parameters<typeof useEmblaCarousel>[1];

export type CarouselSlide = {
  /** Rendered slide body. */
  readonly content: ReactNode;
  /** Stable key used by React. */
  readonly id: string;
  /** Optional accessible slide name. */
  readonly label?: string;
};

export type CarouselProps = Omit<
  ComponentPropsWithoutRef<"section">,
  "children"
> & {
  /** Accessible name announced for the carousel region. */
  readonly ariaLabel?: string;
  readonly nextLabel?: string;
  /** Embla options forwarded to the local carousel instance. */
  readonly options?: EmblaOptions;
  /** Optional Embla plugins, such as autoplay. */
  readonly plugins?: EmblaPlugins;
  readonly previousLabel?: string;
  readonly showDots?: boolean;
  readonly showNavigation?: boolean;
  /** Classes applied to every slide, commonly used to set its basis. */
  readonly slideClassName?: string;
  readonly slides: readonly CarouselSlide[];
};

export const Carousel = ({
  ariaLabel = "Content carousel",
  className,
  nextLabel = "Next slide",
  options,
  plugins,
  previousLabel = "Previous slide",
  showDots = true,
  showNavigation = true,
  slideClassName,
  slides,
  ...props
}: CarouselProps) => {
  const [viewportRef, api] = useEmblaCarousel(options, plugins);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [canScrollPrevious, setCanScrollPrevious] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [snapCount, setSnapCount] = useState(0);

  useEffect(() => {
    if (!api) return;

    const syncState = () => {
      setCanScrollNext(api.canScrollNext());
      setCanScrollPrevious(api.canScrollPrev());
      setSelectedIndex(api.selectedScrollSnap());
      setSnapCount(api.scrollSnapList().length);
    };
    syncState();
    api.on("reInit", syncState).on("select", syncState);

    return () => {
      api.off("reInit", syncState).off("select", syncState);
    };
  }, [api]);

  return (
    <section
      aria-label={ariaLabel}
      aria-roledescription="carousel"
      className={cn("grid gap-4", className)}
      {...props}
    >
      <div className="overflow-hidden" ref={viewportRef}>
        <div className="-ml-4 flex touch-pan-y">
          {slides.map((slide, index) => (
            <div
              aria-label={slide.label ?? `${index + 1} of ${slides.length}`}
              aria-roledescription="slide"
              className={cn("min-w-0 flex-[0_0_100%] pl-4", slideClassName)}
              key={slide.id}
              role="group"
            >
              {slide.content}
            </div>
          ))}
        </div>
      </div>
      {(showNavigation || showDots) && (
        <div className="flex items-center justify-between gap-4">
          {showDots ? (
            <div className="flex flex-wrap items-center gap-2" role="group">
              {Array.from({ length: snapCount }, (_, index) => (
                <button
                  aria-label={`Go to slide ${index + 1}`}
                  aria-pressed={index === selectedIndex}
                  className={cn(
                    "h-2 rounded-full transition-[width,background-color] focus-visible:ring-4 focus-visible:ring-focus/15 focus-visible:outline-none",
                    index === selectedIndex
                      ? "w-6 bg-brand"
                      : "w-2 bg-muted-ui-foreground/35 hover:bg-muted-ui-foreground/60",
                  )}
                  key={index}
                  onClick={() => api?.scrollTo(index)}
                  type="button"
                />
              ))}
            </div>
          ) : (
            <span />
          )}
          {showNavigation && (
            <div className="flex items-center gap-2">
              <Button
                aria-label={previousLabel}
                className="size-10 min-h-0 p-0"
                disabled={!canScrollPrevious}
                onClick={() => api?.scrollPrev()}
                variant="secondary"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
              </Button>
              <Button
                aria-label={nextLabel}
                className="size-10 min-h-0 p-0"
                disabled={!canScrollNext}
                onClick={() => api?.scrollNext()}
                variant="secondary"
              >
                <ChevronRight aria-hidden="true" className="size-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
