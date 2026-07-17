import { NEWS_ITEMS } from "@/lib/site/editorial";
import {
  ACTIVE_ZONES,
  ANIMATION_PROGRAM,
  EQUIPMENT,
  SEASONS,
} from "@/lib/site/entertainment";
import {
  ACTIVE_OFFERS,
  OFFER_EVENTS,
  READY_SCENARIOS,
} from "@/lib/site/offers";
import { ROOM_CATEGORIES, ROOM_COMPARISON } from "@/lib/site/rooms";
import type { SiteContentItem } from "@/lib/site/site-content-api";

export const SITE_COLLECTIONS = {
  entertainment: {
    "active-zones": ACTIVE_ZONES,
    "animation-programs": ANIMATION_PROGRAM,
    "equipment-cards": EQUIPMENT,
    "seasonal-slides": SEASONS,
  },
  news: { items: NEWS_ITEMS },
  offers: {
    events: OFFER_EVENTS,
    proposals: ACTIVE_OFFERS,
    "ready-scenarios": READY_SCENARIOS,
  },
  rooms: { cards: ROOM_CATEGORIES, comparison: ROOM_COMPARISON },
} as const;

export const getSiteCollection = <T>(
  items: SiteContentItem[] | undefined,
  itemKey: string,
  fallback: readonly T[],
): readonly T[] => {
  const stored = items?.find((item) => item.itemKey === itemKey)?.content.items;
  return Array.isArray(stored) ? (stored as T[]) : fallback;
};
