import liveMusicImage from "@/assets/alsma/entertainment-live-music.png";
import familyImage from "@/assets/alsma/family-holiday.png";
import romanticImage from "@/assets/alsma/romantic-escape.png";
import longStayImage from "@/assets/alsma/room-4.jpg";
import programsImage from "@/assets/alsma/spa-programs.jpg";
import spaImage from "@/assets/alsma/spa-wellness.png";

export type ActiveOffer = {
  readonly buttonLink?: string;
  readonly description: string;
  readonly image: string;
  readonly imageName?: string;
  readonly isActive?: boolean;
  readonly sortOrder?: number;
  readonly tag: string;
  readonly title: string;
};

export type ReadyScenario = {
  readonly buttonLink?: string;
  readonly buttonText?: string;
  readonly description: string;
  readonly image: string;
  readonly imageName?: string;
  readonly isActive?: boolean;
  readonly price: string;
  readonly sortOrder?: number;
  readonly tags: readonly string[];
  readonly title: string;
};

export type OfferEvent = {
  readonly buttonLink?: string;
  readonly date: string;
  readonly description: string;
  readonly endDate?: string;
  readonly image: string;
  readonly imageName?: string;
  readonly isActive?: boolean;
  readonly items?: readonly string[];
  readonly month: string;
  readonly sortOrder?: number;
  readonly startDate?: string;
  readonly tag: string;
  readonly title: string;
};

export const ACTIVE_OFFERS: readonly ActiveOffer[] = [
  {
    description:
      "Выходные с термальной зоной, авторскими ритуалами и проживанием в атмосфере полной перезагрузки.",
    image: spaImage,
    tag: "SPA weekend",
    title: "Wellness-уикенд с диагностикой",
  },
  {
    description:
      "Романтический формат с ужином, поздним выездом и приватным wellness-сценарием.",
    image: romanticImage,
    tag: "Для двоих",
    title: "Романтический побег",
  },
  {
    description:
      "Проживание, прогулки, активности и спокойный загородный отдых для всей семьи.",
    image: familyImage,
    tag: "Семьям",
    title: "Семейные каникулы",
  },
  {
    description:
      "Особые условия и дополнительные привилегии для неспешного отдыха от пяти ночей.",
    image: longStayImage,
    tag: "Long stay",
    title: "Длительное проживание",
  },
] as const;

export const READY_SCENARIOS: readonly ReadyScenario[] = [
  {
    description:
      "Диагностика, термальная зона и SPA-ритуалы для глубокой перезагрузки.",
    image: spaImage,
    price: "от 25 000 ₽",
    tags: ["Диагностика", "SPA", "2 ночи"],
    title: "Wellness-уикенд с диагностикой",
  },
  {
    description:
      "Программа для двоих с ужином, поздним выездом и приватным wellness-сценарием.",
    image: romanticImage,
    price: "от 35 000 ₽",
    tags: ["Для двоих", "Поздний выезд"],
    title: "Романтический побег",
  },
  {
    description:
      "Семейный отдых с проживанием, анимацией и спокойными активностями на природе.",
    image: familyImage,
    price: "от 45 000 ₽",
    tags: ["С детьми", "Проживание", "Анимация"],
    title: "Семейные каникулы",
  },
] as const;

export const OFFER_EVENTS: readonly OfferEvent[] = [
  {
    date: "18 сентября 2026",
    description:
      "Камерный вечер с сет-меню, живой музыкой и возможностью продлить отдых в отеле.",
    endDate: "2026-09-18",
    image: liveMusicImage,
    month: "Сентябрь",
    startDate: "2026-09-18",
    tag: "Событие",
    title: "Осенний гастровечер",
  },
  {
    date: "3–5 октября 2026",
    description:
      "Насыщенная программа с лекциями, ритуалами и релаксом в wellness-пространстве.",
    endDate: "2026-10-05",
    image: programsImage,
    month: "Октябрь",
    startDate: "2026-10-03",
    tag: "Wellness",
    title: "SPA-фестиваль восстановления",
  },
  {
    date: "24–25 октября 2026",
    description:
      "Активности для детей, мастер-классы, пикник и размеренный отдых для родителей.",
    endDate: "2026-10-25",
    image: familyImage,
    month: "Октябрь",
    startDate: "2026-10-24",
    tag: "Семьям",
    title: "Семейные выходные в лесу",
  },
] as const;
