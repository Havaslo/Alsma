import { useState } from "react";

import {
  type ContentChannel,
  DEMO_PLAN,
  type DraftVariant,
  type PlanPublication,
} from "@/lib/content-factory/contentFactoryData";

const SUGGESTED_PLAN: PlanPublication[] = [
  {
    id: "ai-plan-1",
    title: "Как выбрать день для перезагрузки",
    date: "2026-10-17",
    time: "11:00",
    channels: ["vk", "telegram"],
    status: "На согласовании",
    imageId: "spa-pool",
  },
  {
    id: "ai-plan-2",
    title: "Небольшой гид по термальной зоне",
    date: "2026-10-19",
    time: "13:30",
    channels: ["vk", "zen"],
    status: "Черновик",
    imageId: "spa-thermal",
  },
  {
    id: "ai-plan-3",
    title: "Вечер без спешки: идея для выходного",
    date: "2026-10-22",
    time: "18:00",
    channels: ["telegram", "instagram"],
    status: "Черновик",
    imageId: "river",
  },
  {
    id: "ai-plan-4",
    title: "Ноябрьская акция: напоминание о SPA −20%",
    date: "2026-10-25",
    time: "12:00",
    channels: ["vk", "max", "instagram"],
    status: "На согласовании",
    imageId: "spa-pool",
  },
];

export const useContentFactoryPlanDemo = () => {
  const [posts, setPosts] = useState<PlanPublication[]>(DEMO_PLAN);

  const schedulePublication = (
    date: string,
    time: string,
    variant: DraftVariant,
    channels: ContentChannel[],
  ) => {
    const newPost: PlanPublication = {
      id: `scheduled-${Date.now()}`,
      title: variant.title,
      date,
      time,
      channels,
      status: "Запланировано",
      imageId: variant.imageId,
    };
    setPosts((current) => [...current, newPost]);
  };

  const addSuggestedPosts = () => {
    setPosts((current) => {
      const existingIds = new Set(current.map((post) => post.id));
      return [
        ...current,
        ...SUGGESTED_PLAN.filter((post) => !existingIds.has(post.id)),
      ];
    });
  };

  return { addSuggestedPosts, posts, schedulePublication, setPosts };
};
