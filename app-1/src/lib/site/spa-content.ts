import type { SiteContentItem } from "@/lib/site/site-content-api";
import { MASSAGES, SPA_PROMOTIONS } from "@/lib/site/spa";

export type SpaMassage = { name: string; duration: string; price: string };
export type SpaPromotion = {
  title: string;
  description: string;
  deadline: string;
  price: string;
  image: string;
  imageName?: string;
};
export type SpaMenuItem = { name: string; description: string; price: string };
export type SpaAdditionalService = {
  service: string;
  price: string;
  description?: string;
  duration?: string;
};
const get = <T>(
  items: SiteContentItem[] | undefined,
  key: string,
  fallback: readonly T[],
) => {
  const value = items?.find((i) => i.itemKey === key)?.content.items;
  return Array.isArray(value) && value.length ? (value as T[]) : [...fallback];
};
const massages = MASSAGES.map(([name, duration, price]) => ({
  name,
  duration,
  price,
}));
const promotions = SPA_PROMOTIONS.map(
  ({ title, description, deadline, price, image }) => ({
    title,
    description,
    deadline,
    price,
    image,
    imageName: "",
  }),
);
const additional = [
  [
    "Аренда SPA-комплекса",
    "15 000 ₽",
    "приватная аренда по предварительной записи",
    "90 минут",
  ],
  ["Баня-бочка", "1 200 ₽", "минимальный заказ от 2 часов", "60 минут"],
  ["Аренда халата", "150 ₽", "на время посещения", ""],
].map(([service, price, description, duration]) => ({
  service,
  price,
  description,
  duration,
}));
const menu = [
  {
    name: "Травяной чай",
    description: "Чайная церемония с травами",
    price: "350 ₽",
  },
  { name: "Ягодный морс", description: "Домашний морс", price: "250 ₽" },
];
export const getSpaDefaults = (items?: SiteContentItem[]) => ({
  massages: get(items, "massages", massages),
  promotions: get(items, "promotions", promotions),
  menu: get(items, "cafe-menu", menu),
  additional: get(items, "additional-services", additional),
});
