import {
  ANIMATION_PROGRAM,
  type AnimationProgram,
  EQUIPMENT,
  type EquipmentCard,
  type EquipmentItem,
  KIDS_SERVICES,
  type KidsService,
  SEASONS,
  type SeasonalActivity,
} from "@/lib/site/entertainment";
import type { SiteContentItem } from "@/lib/site/site-content-api";

export type SeasonalActivityForm = Omit<
  SeasonalActivity,
  "items" | "isActive" | "sortOrder"
> & {
  imageName: string;
  isActive: boolean;
  items: string[];
  sortOrder: number;
};

export type AnimationProgramForm = Required<AnimationProgram>;

export type KidsServiceForm = Omit<
  KidsService,
  "price" | "tags" | "isActive" | "sortOrder"
> & {
  description: string;
  imageName: string;
  isActive: boolean;
  sortOrder: number;
  tags: string;
};

export type EquipmentCardForm = Omit<
  EquipmentCard,
  "items" | "isActive" | "sortOrder"
> & {
  isActive: boolean;
  items: EquipmentItem[];
  sortOrder: number;
};

const getStoredItems = <T>(
  items: SiteContentItem[] | undefined,
  itemKey: string,
  fallback: readonly T[],
) => {
  const stored = items?.find((item) => item.itemKey === itemKey)?.content.items;
  return Array.isArray(stored) && stored.length ? (stored as T[]) : fallback;
};

export const splitEntertainmentTags = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const normalizeAnimationProgram = (
  item: AnimationProgram | readonly string[],
  index: number,
): AnimationProgramForm =>
  Array.isArray(item)
    ? {
        age: item[3] ?? "",
        description: item[2] ?? "",
        isActive: true,
        sortOrder: index,
        time: item[0] ?? "",
        title: item[1] ?? "",
      }
    : {
        ...(item as AnimationProgram),
        isActive: (item as AnimationProgram).isActive ?? true,
        sortOrder: (item as AnimationProgram).sortOrder ?? index,
      };

export const getSeasonDefaults = (
  items?: SiteContentItem[],
): { items: SeasonalActivityForm[] } => ({
  items: getStoredItems(items, "seasonal-slides", SEASONS).map(
    (item, index) => ({
      ...item,
      imageName: item.imageName ?? "",
      isActive: item.isActive ?? true,
      items: [...item.items],
      sortOrder: item.sortOrder ?? index,
    }),
  ),
});

export const getAnimationDefaults = (
  items?: SiteContentItem[],
): { items: AnimationProgramForm[] } => ({
  items: getStoredItems<AnimationProgram | readonly string[]>(
    items,
    "animation-programs",
    ANIMATION_PROGRAM,
  ).map(normalizeAnimationProgram),
});

export const getKidsDefaults = (
  items?: SiteContentItem[],
): { items: KidsServiceForm[] } => ({
  items: getStoredItems(items, "kids-services", KIDS_SERVICES).map(
    (item, index) => ({
      ...item,
      description:
        (item as KidsService & { readonly description?: string }).description ??
        "",
      imageName: item.imageName ?? "",
      isActive: item.isActive ?? true,
      sortOrder: item.sortOrder ?? index,
      tags: item.tags.join(", "),
    }),
  ),
});

export const getEquipmentDefaults = (
  items?: SiteContentItem[],
): { items: EquipmentCardForm[] } => ({
  items: getStoredItems(items, "equipment-cards", EQUIPMENT).map(
    (item, index) => ({
      ...item,
      isActive: item.isActive ?? true,
      items: item.items.map((equipmentItem) =>
        typeof equipmentItem === "string"
          ? { availability: "included" as const, label: equipmentItem }
          : equipmentItem,
      ),
      sortOrder: item.sortOrder ?? index,
    }),
  ),
});
