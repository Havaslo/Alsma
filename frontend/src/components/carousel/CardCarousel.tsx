import type { ReactNode } from "react";

import { Carousel, type CarouselProps } from "@/components/carousel/Carousel";
import { FeatureCard } from "@/components/ui/FeatureCard";

export type CardCarouselItem = {
  /** Optional footer action rendered by FeatureCard. */
  readonly action?: ReactNode;
  readonly description: ReactNode;
  readonly eyebrow?: ReactNode;
  readonly icon?: ReactNode;
  /** Stable key for the carousel slide. */
  readonly id: string;
  readonly media?: ReactNode;
  readonly title: ReactNode;
};

export type CardCarouselProps = Omit<CarouselProps, "slides"> & {
  readonly items: readonly CardCarouselItem[];
};

export const CardCarousel = ({ items, ...props }: CardCarouselProps) => {
  return (
    <Carousel
      slides={items.map((item) => ({
        content: (
          <FeatureCard
            action={item.action}
            description={item.description}
            eyebrow={item.eyebrow}
            icon={item.icon}
            media={item.media}
            title={item.title}
          />
        ),
        id: item.id,
        label: String(item.title),
      }))}
      {...props}
    />
  );
};
