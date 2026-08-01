import { BLOG_ITEMS, type EditorialItem } from "@/lib/site/editorial";

export type BlogItemForm = Omit<EditorialItem, "category" | "date" | "tags"> & {
  category: "guide" | "stories" | "tips";
  dateValue: string;
  tag: string;
};

export const BLOG_CATEGORY_OPTIONS = [
  { label: "Истории гостей", value: "stories" },
  { label: "Гид по региону", value: "guide" },
  { label: "Полезные советы", value: "tips" },
] as const satisfies readonly {
  label: string;
  value: BlogItemForm["category"];
}[];

const isBlogCategory = (value: string): value is BlogItemForm["category"] =>
  ["guide", "stories", "tips"].includes(value);

export const getBlogDefaults = (
  items?: readonly unknown[],
): { items: BlogItemForm[] } => {
  const stored = Array.isArray(items) ? items : BLOG_ITEMS;
  return {
    items: stored.map((item, index) => {
      const source = (item ?? {}) as Partial<EditorialItem> & {
        category?: string;
        tags?: string[];
      };
      const categoryValue = source.category ?? "";
      const category: BlogItemForm["category"] = isBlogCategory(categoryValue)
        ? categoryValue
        : "stories";
      return {
        buttonLink: source.buttonLink ?? "",
        buttonText: "Читать статью",
        category,
        dateValue: source.dateValue ?? "",
        description: source.description ?? "",
        details: source.details ?? "",
        image: source.image ?? "",
        imageName: source.imageName ?? "",
        isActive: source.isActive !== false,
        sortOrder: source.sortOrder ?? index,
        tag: source.tags?.[0] ?? "",
        title: source.title ?? "",
      };
    }),
  };
};

export const formatBlogDate = (value: string) => {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
};
