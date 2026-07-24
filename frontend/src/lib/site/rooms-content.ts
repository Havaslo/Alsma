import {
  ROOM_CATEGORIES,
  ROOM_COMPARISON,
  type RoomCategory,
  type RoomComparisonContent,
  type RoomComparisonRow,
  getRoomComparisonValue,
  getRoomId,
  isRoomComparisonValuesArray,
} from "@/lib/site/rooms";
import type { SiteContentItem } from "@/lib/site/site-content-api";

export type RoomCardFormItem = {
  amenities: string;
  area: string;
  beds: string;
  capacity: string;
  description: string;
  features: string;
  gallery: string[];
  galleryNames: string[];
  homeButtonHref: string;
  homeButtonLabel: string;
  id: string;
  isActive: boolean;
  price: string;
  showOnHomepage: boolean;
  sortOrder: number;
  title: string;
};

export type RoomCardsFormValues = { items: RoomCardFormItem[] };

export type ComparisonFormRow = {
  isActive: boolean;
  label: string;
  sortOrder: number;
  values: Record<string, string>;
};

export type RoomComparisonFormValues = {
  rows: ComparisonFormRow[];
  selectedRoomIds: string[];
};

const getStoredItems = <T>(
  items: SiteContentItem[] | undefined,
  itemKey: string,
) => {
  const stored = items?.find((item) => item.itemKey === itemKey)?.content.items;
  return Array.isArray(stored) ? (stored as T[]) : undefined;
};

export const splitRoomList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const getRoomCards = (items?: SiteContentItem[]): RoomCategory[] => {
  const stored = getStoredItems<RoomCategory>(items, "cards");
  return (stored?.length ? stored : ROOM_CATEGORIES).map((room, index) => ({
    ...room,
    gallery: room.gallery?.length ? room.gallery : [room.image],
    id: getRoomId(room, index),
    image: room.gallery?.[0] ?? room.image,
    isActive: room.isActive ?? true,
    showOnHomepage: room.showOnHomepage ?? index < 4,
    sortOrder: room.sortOrder ?? index,
  }));
};

export const getRoomCardDefaults = (
  items?: SiteContentItem[],
): RoomCardsFormValues => ({
  items: getRoomCards(items).map((room) => ({
    amenities: room.amenities.join(", "),
    area: room.area,
    beds: room.beds,
    capacity: room.capacity,
    description: room.description,
    features: room.features?.join(", ") ?? "",
    gallery: [...(room.gallery ?? [room.image])],
    galleryNames: [...(room.imageNames ?? [])],
    homeButtonHref: room.homeButtonHref ?? "/rooms",
    homeButtonLabel: room.homeButtonLabel ?? "Подробнее",
    id: room.id ?? crypto.randomUUID(),
    isActive: room.isActive ?? true,
    price: room.price,
    showOnHomepage: room.showOnHomepage ?? false,
    sortOrder: room.sortOrder ?? 0,
    title: room.title,
  })),
});

export const serializeRoomCards = (
  values: RoomCardsFormValues,
): RoomCategory[] =>
  values.items
    .map((room) => ({
      amenities: splitRoomList(room.amenities),
      area: room.area,
      beds: room.beds,
      capacity: room.capacity,
      description: room.description,
      features: splitRoomList(room.features),
      gallery: room.gallery,
      homeButtonHref: room.homeButtonHref,
      homeButtonLabel: room.homeButtonLabel,
      id: room.id,
      image: room.gallery[0] ?? "",
      imageNames: room.galleryNames,
      isActive: room.isActive,
      price: room.price,
      showOnHomepage: room.showOnHomepage,
      sortOrder: room.sortOrder,
      title: room.title,
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder);

const getFallbackComparison = (rooms: readonly RoomCategory[]) => {
  const selectedRoomIds = rooms
    .slice(0, 4)
    .map((room, index) => getRoomId(room, index));
  return {
    items: ROOM_COMPARISON.map((row, rowIndex) => ({
      isActive: true,
      label: row.label,
      sortOrder: rowIndex,
      values: Object.fromEntries(
        selectedRoomIds.map((roomId, index) => [
          roomId,
          row.values[index] ?? "",
        ]),
      ),
    })),
    selectedRoomIds,
  };
};

export const getRoomComparison = (
  items: SiteContentItem[] | undefined,
  rooms: readonly RoomCategory[],
): RoomComparisonContent => {
  const stored = items?.find((item) => item.itemKey === "comparison")?.content;
  if (!stored) return getFallbackComparison(rooms);
  const selectedRoomIds = Array.isArray(stored.selectedRoomIds)
    ? stored.selectedRoomIds.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  const rows = Array.isArray(stored.items)
    ? (stored.items as RoomComparisonRow[])
    : [];
  return selectedRoomIds.length && rows.length
    ? { items: rows, selectedRoomIds }
    : getFallbackComparison(rooms);
};

export const getRoomComparisonDefaults = (
  items: SiteContentItem[] | undefined,
  rooms: readonly RoomCategory[],
): RoomComparisonFormValues => {
  const content = getRoomComparison(items, rooms);
  return {
    rows: content.items.map((row, index) => ({
      isActive: row.isActive ?? true,
      label: row.label,
      sortOrder: row.sortOrder ?? index,
      values: isRoomComparisonValuesArray(row.values)
        ? Object.fromEntries(
            content.selectedRoomIds.map((roomId, valueIndex) => [
              roomId,
              getRoomComparisonValue(row.values, roomId, valueIndex),
            ]),
          )
        : { ...row.values },
    })),
    selectedRoomIds: [...content.selectedRoomIds],
  };
};
