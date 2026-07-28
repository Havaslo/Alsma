import trailsImage from "@/assets/alsma/eco-trails.jpg";
import kidsAnimationImage from "@/assets/alsma/entertainment-kids-animation.png";
import liveMusicImage from "@/assets/alsma/entertainment-live-music.png";
import clubImage from "@/assets/alsma/kids-club.jpg";
import terraceImage from "@/assets/alsma/open-terrace-river-view.jpg";
import summerImage from "@/assets/alsma/season-summer.jpg";
import winterImage from "@/assets/alsma/season-winter.jpg";
import ceremonyImage from "@/assets/alsma/spa-ceremony.jpg";
import sportsImage from "@/assets/alsma/sports-ground.jpg";

export type AnimationProgram = {
  readonly age: string;
  readonly description: string;
  readonly isActive?: boolean;
  readonly sortOrder?: number;
  readonly time: string;
  readonly title: string;
};

export type EquipmentCard = {
  readonly description: string;
  readonly isActive?: boolean;
  readonly items: readonly EquipmentItem[];
  readonly sortOrder?: number;
  readonly title: string;
};

export type EquipmentItem = {
  readonly availability: "included" | "paid";
  readonly label: string;
};

export type KidsService = {
  readonly image: string;
  readonly imageName?: string;
  readonly isActive?: boolean;
  readonly price: string;
  readonly sortOrder?: number;
  readonly tags: readonly string[];
  readonly title: string;
};

export type SeasonalActivity = {
  readonly description: string;
  readonly image: string;
  readonly imageName?: string;
  readonly isActive?: boolean;
  readonly items: readonly string[];
  readonly label: string;
  readonly sortOrder?: number;
  readonly title: string;
};

export const ACTIVE_ZONES = [
  {
    description:
      "Пространство для спокойного отдыха, встреч с семьёй и созерцания природы.",
    image: terraceImage,
    tags: ["Вид на реку", "Открытая терраса", "Спокойный отдых"],
    title: "Открытая терраса с видом на реку",
  },
  {
    description:
      "Зона, где можно размяться, поиграть и добавить в день больше движения.",
    image: sportsImage,
    tags: ["Активный отдых", "Игры на воздухе", "Для всей семьи"],
    title: "Спортивная площадка",
  },
  {
    description:
      "Отдельное пространство для маленьких гостей с играми и семейными программами.",
    image: clubImage,
    tags: ["Для детей", "Семейный отдых", "Комфортный досуг"],
    title: "Детский клуб",
  },
  {
    description:
      "Маршруты для неспешных прогулок, свежего воздуха и близости к природе.",
    image: trailsImage,
    tags: ["Прогулки", "Природа", "Свежий воздух"],
    title: "Экологические тропы",
  },
] as const;

export const SEASONS: readonly SeasonalActivity[] = [
  {
    description:
      "Полноценный отдых на свежем воздухе с водой, прогулками и семейными сценариями.",
    image: summerImage,
    items: [
      "Велопрогулки по лесным маршрутам",
      "SUP и каяки для всей семьи",
      "Пляжный отдых у воды",
      "Семейные квесты",
    ],
    label: "Лето",
    title: "Активности тёплого сезона",
  },
  {
    description:
      "Зимние развлечения среди сосен с катанием и командными активностями.",
    image: winterImage,
    items: [
      "Прогулки по зимнему лесу",
      "Катание на санях",
      "Семейный биатлон",
      "Маршруты на снегоступах",
    ],
    label: "Зима",
    title: "Активности снежного сезона",
  },
] as const;

export const ANIMATION_PROGRAM: readonly AnimationProgram[] = [
  {
    age: "Взрослые",
    description: "Хатха-йога на террасе с видом на лес",
    time: "09:00–10:00",
    title: "Йога на рассвете",
  },
  {
    age: "Дети 5–12 лет",
    description: "Приключенческие задания на территории",
    time: "Днём",
    title: "Детский квест",
  },
  {
    age: "Все возрасты",
    description: "Роспись по дереву, керамика и валяние",
    time: "Днём",
    title: "Мастер-класс",
  },
  {
    age: "От 8 лет",
    description: "Боулинг, бадминтон и пленэрбол",
    time: "Днём",
    title: "Спортивные игры",
  },
  {
    age: "Дети 3–12 лет",
    description: "Танцы, конкурсы и игры",
    time: "Вечером",
    title: "Детская дискотека",
  },
  {
    age: "Все возрасты",
    description: "Живая музыка, караоке и кино",
    time: "Вечером",
    title: "Вечерняя программа",
  },
];

export const EQUIPMENT: readonly EquipmentCard[] = [
  {
    description:
      "Инвентарь для активных прогулок и отдыха у воды в тёплый сезон.",
    items: [
      "Взрослые и детские велосипеды",
      "SUP-борды",
      "Каяки",
      "Палки для ходьбы",
    ].map((label) => ({ availability: "included" as const, label })),
    title: "Летний спорт",
  },
  {
    description:
      "Снаряжение для снежных прогулок и зимних развлечений всей семьёй.",
    items: ["Беговые лыжи", "Классические санки", "Ватрушки", "Снегоступы"].map(
      (label) => ({ availability: "included" as const, label }),
    ),
    title: "Зимний спорт",
  },
  {
    description:
      "Всё для дружеских матчей, настольных игр и спокойного досуга на природе.",
    items: ["Настольные игры", "Мячи", "Бадминтон", "Рыболовные снасти"].map(
      (label) => ({ availability: "included" as const, label }),
    ),
    title: "Игры и развлечения",
  },
] as const;

export const KIDS_SERVICES: readonly KidsService[] = [
  {
    image: kidsAnimationImage,
    price: "от 15 000 ₽",
    tags: ["Творческая зона", "Мягкая зона", "Настольные игры", "Аниматор"],
    title: "Игровая комната «Лесная сказка»",
  },
  {
    image: liveMusicImage,
    price: "от 15 000 ₽",
    tags: ["Аниматоры", "Шоу-программа", "Детское меню", "Оформление"],
    title: "Детские праздники под ключ",
  },
  {
    image: ceremonyImage,
    price: "от 15 000 ₽",
    tags: ["Сбалансированное меню", "Готовим с детьми", "Индивидуально"],
    title: "Детское меню",
  },
] as const;
