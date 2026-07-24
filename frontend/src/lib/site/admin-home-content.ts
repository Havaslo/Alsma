import heroImage from "@/assets/alsma/hero.jpg";
import {
  HOME_POPUP_BANNERS,
  HOME_REST_CARDS,
  HOME_REVIEWS,
} from "@/lib/site/home-content";
import type { SiteContentItem } from "@/lib/site/site-content-api";

export type HomeHeroFormValues = {
  description: string;
  mediaName: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  posterName: string;
  posterUrl: string;
  title: string;
};

export type HomeRestCardFormValue = {
  description: string;
  href: string;
  image: string;
  imageName: string;
  isActive: boolean;
  price: string;
  sortOrder: number;
  tags: string;
  title: string;
};

export type HomeRestFormValues = {
  items: HomeRestCardFormValue[];
};

export type HomeReviewFormValue = {
  image: string;
  imageName: string;
  isActive: boolean;
  name: string;
  sortOrder: number;
  source: string;
  text: string;
};

export type HomeReviewsFormValues = {
  items: HomeReviewFormValue[];
};

export type HomeBannerFormValue = {
  badge: string;
  buttonHref: string;
  buttonLabel: string;
  description: string;
  displayDelaySeconds: number;
  image: string;
  imageName: string;
  isActive: boolean;
  pagePaths: string[];
  sortOrder: number;
  title: string;
};

export type HomeBannersFormValues = {
  items: HomeBannerFormValue[];
};

const itemContent = (
  items: SiteContentItem[] | undefined,
  itemKey: string,
): Record<string, unknown> | undefined =>
  items?.find((item) => item.itemKey === itemKey)?.content;

const storedItems = <T>(
  items: SiteContentItem[] | undefined,
  itemKey: string,
): T[] | undefined => {
  const value = itemContent(items, itemKey)?.items;
  return Array.isArray(value) ? (value as T[]) : undefined;
};

export const getHeroDefaults = (
  items: SiteContentItem[] | undefined,
): HomeHeroFormValues => {
  const hero = itemContent(items, "hero");
  const mediaUrl =
    typeof hero?.mediaUrl === "string"
      ? hero.mediaUrl
      : typeof hero?.image === "string"
        ? hero.image
        : heroImage;
  const videoMedia =
    hero?.mediaType === "video" ||
    /\.(mp4|webm)(?:$|\?)/i.test(mediaUrl) ||
    /contentType=video(?:%2F|\/)/i.test(mediaUrl);
  return {
    description:
      typeof hero?.description === "string"
        ? hero.description
        : "Загородный отель премиум-класса на слиянии двух рек в 35 км от Нижнего Новгорода.",
    mediaName: typeof hero?.mediaName === "string" ? hero.mediaName : "",
    mediaType: videoMedia ? "video" : "image",
    mediaUrl,
    posterName: typeof hero?.posterName === "string" ? hero.posterName : "",
    posterUrl: typeof hero?.posterUrl === "string" ? hero.posterUrl : "",
    title:
      typeof hero?.title === "string"
        ? hero.title
        : "Отдых, который возвращает к себе",
  };
};

export const getRestDefaults = (
  items: SiteContentItem[] | undefined,
): HomeRestFormValues => ({
  items: (
    storedItems<HomeRestCardFormValue & { tags?: string[] }>(
      items,
      "ideal-rest",
    ) ?? HOME_REST_CARDS
  ).map((item, index) => ({
    description: item.description,
    href: item.href ?? "",
    image: item.image,
    imageName: ("imageName" in item ? item.imageName : "") ?? "",
    isActive: ("isActive" in item ? item.isActive : true) ?? true,
    price: item.price,
    sortOrder: ("sortOrder" in item ? item.sortOrder : index) ?? index,
    tags: typeof item.tags === "string" ? item.tags : [...item.tags].join(", "),
    title: item.title,
  })),
});

export const getReviewDefaults = (
  items: SiteContentItem[] | undefined,
): HomeReviewsFormValues => ({
  items: (
    storedItems<HomeReviewFormValue>(items, "reviews") ?? HOME_REVIEWS
  ).map((item, index) => ({
    image: ("image" in item ? item.image : "") ?? "",
    imageName: ("imageName" in item ? item.imageName : "") ?? "",
    isActive: ("isActive" in item ? item.isActive : true) ?? true,
    name: item.name,
    sortOrder: ("sortOrder" in item ? item.sortOrder : index) ?? index,
    source: item.source,
    text: item.text,
  })),
});

export const getBannerDefaults = (
  items: SiteContentItem[] | undefined,
): HomeBannersFormValues => ({
  items: (
    storedItems<HomeBannerFormValue>(items, "popup-banners") ??
    HOME_POPUP_BANNERS
  ).map((item, index) => ({
    ...item,
    imageName: ("imageName" in item ? item.imageName : "") ?? "",
    isActive: ("isActive" in item ? item.isActive : true) ?? true,
    pagePaths: [...item.pagePaths],
    sortOrder: ("sortOrder" in item ? item.sortOrder : index) ?? index,
  })),
});

export const splitTags = (tags: string): string[] =>
  tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
