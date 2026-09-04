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
export type SpaAdditionalService = { service: string; price: string };
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
  "Душ Шарко|800 ₽",
  "Гидромассажная ванна|1 200 ₽",
  "SPA-капсула водная|1 500 ₽",
  "Дневное посещение — взрослые|1 000 ₽",
  "Дневное посещение — дети|500 ₽",
  "Абонемент на 8 посещений — взрослые|3 500 ₽",
].map((value) => {
  const [service, price] = value.split("|");
  return { service, price };
});
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
