import {
  ACTIVE_OFFERS,
  type ActiveOffer,
  OFFER_EVENTS,
  type OfferEvent,
  READY_SCENARIOS,
  type ReadyScenario,
} from "@/lib/site/offers";
import type { SiteContentItem } from "@/lib/site/site-content-api";

export type ActiveOfferForm = Omit<
  ActiveOffer,
  "imageName" | "isActive" | "sortOrder"
> & {
  imageName: string;
  isActive: boolean;
  sortOrder: number;
};

export type ReadyScenarioForm = Omit<
  ReadyScenario,
  "imageName" | "isActive" | "sortOrder" | "tags"
> & {
  imageName: string;
  isActive: boolean;
  sortOrder: number;
  tags: string;
};

export type OfferEventForm = Omit<
  OfferEvent,
  "imageName" | "isActive" | "items" | "sortOrder"
> & {
  endDate: string;
  imageName: string;
  isActive: boolean;
  items: string;
  sortOrder: number;
  startDate: string;
};

const getStoredItems = <T>(
  items: SiteContentItem[] | undefined,
  itemKey: string,
  fallback: readonly T[],
) => {
  const stored = items?.find((item) => item.itemKey === itemKey)?.content.items;
  return Array.isArray(stored) && stored.length ? (stored as T[]) : fallback;
};

export const splitOfferList = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

export const splitOfferTags = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const getProposalDefaults = (
  items?: SiteContentItem[],
): { items: ActiveOfferForm[] } => ({
  items: getStoredItems(items, "proposals", ACTIVE_OFFERS).map(
    (item, index) => ({
      ...item,
      buttonLink: item.buttonLink ?? "",
      imageName: item.imageName ?? "",
      isActive: item.isActive ?? true,
      sortOrder: item.sortOrder ?? index,
    }),
  ),
});

export const getScenarioDefaults = (
  items?: SiteContentItem[],
): { items: ReadyScenarioForm[] } => ({
  items: getStoredItems(items, "ready-scenarios", READY_SCENARIOS).map(
    (item, index) => ({
      ...item,
      buttonLink: item.buttonLink ?? "",
      buttonText: item.buttonText ?? "",
      imageName: item.imageName ?? "",
      isActive: item.isActive ?? true,
      sortOrder: item.sortOrder ?? index,
      tags: item.tags.join(", "),
    }),
  ),
});

export const getEventDefaults = (
  items?: SiteContentItem[],
): { items: OfferEventForm[] } => ({
  items: getStoredItems(items, "events", OFFER_EVENTS).map((item, index) => ({
    ...item,
    endDate: item.endDate ?? "",
    imageName: item.imageName ?? "",
    isActive: item.isActive ?? true,
    items: item.items?.join("\n") ?? "",
    sortOrder: item.sortOrder ?? index,
    startDate: item.startDate ?? "",
  })),
});
