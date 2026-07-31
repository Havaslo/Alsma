import {
  type EditorialItem,
  NEWS_ITEMS,
  type NewsCategory,
} from "@/lib/site/editorial";
import type { SiteContentItem } from "@/lib/site/site-content-api";

export type NewsItemForm = {
  buttonText: string;
  category: NewsCategory;
  dateValue: string;
  description: string;
  details: string;
  image: string;
  imageName: string;
  isActive: boolean;
  isArchived: boolean;
  sortOrder: number;
  tag: string;
  title: string;
};

export const NEWS_CATEGORY_OPTIONS = [
  { label: "Тематические заезды", value: "arrivals" },
  { label: "Wellness-программы", value: "wellness" },
  { label: "Мероприятия", value: "events" },
] as const;

const isNewsCategory = (value: string): value is NewsCategory =>
  NEWS_CATEGORY_OPTIONS.some((option) => option.value === value);

export const getCurrentDateValue = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const formatNewsDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const getStoredNews = (items?: SiteContentItem[]) => {
  const stored = items?.find((item) => item.itemKey === "items")?.content.items;
  return Array.isArray(stored) && stored.length
    ? (stored as EditorialItem[])
    : NEWS_ITEMS;
};

export const getNewsDefaults = (
  items?: SiteContentItem[],
): { items: NewsItemForm[] } => ({
  items: getStoredNews(items).map((item, index) => ({
    buttonText: item.buttonText ?? "Подробнее",
    category: isNewsCategory(item.category) ? item.category : "wellness",
    dateValue: item.dateValue ?? getCurrentDateValue(),
    description: item.description,
    details: item.details,
    image: item.image,
    imageName: item.imageName ?? "",
    isActive: item.isActive ?? true,
    isArchived: item.isArchived ?? false,
    sortOrder: item.sortOrder ?? index,
    tag: item.tags[0] ?? "",
    title: item.title,
  })),
});
