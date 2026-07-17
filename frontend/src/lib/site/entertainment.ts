import trailsImage from "@/assets/alsma/eco-trails.jpg";
import kidsAnimationImage from "@/assets/alsma/entertainment-kids-animation.png";
import liveMusicImage from "@/assets/alsma/entertainment-live-music.png";
import clubImage from "@/assets/alsma/kids-club.jpg";
import terraceImage from "@/assets/alsma/open-terrace-river-view.jpg";
import summerImage from "@/assets/alsma/season-summer.jpg";
import winterImage from "@/assets/alsma/season-winter.jpg";
import ceremonyImage from "@/assets/alsma/spa-ceremony.jpg";
import sportsImage from "@/assets/alsma/sports-ground.jpg";

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

export const SEASONS = [
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

export const ANIMATION_PROGRAM = [
  [
    "09:00–10:00",
    "Йога на рассвете",
    "Хатха-йога на террасе с видом на лес",
    "Взрослые",
  ],
  [
    "Днём",
    "Детский квест",
    "Приключенческие задания на территории",
    "Дети 5–12 лет",
  ],
  [
    "Днём",
    "Мастер-класс",
    "Роспись по дереву, керамика и валяние",
    "Все возрасты",
  ],
  ["Днём", "Спортивные игры", "Боулинг, бадминтон и пленэрбол", "От 8 лет"],
  ["Вечером", "Детская дискотека", "Танцы, конкурсы и игры", "Дети 3–12 лет"],
  [
    "Вечером",
    "Вечерняя программа",
    "Живая музыка, караоке и кино",
    "Все возрасты",
  ],
] as const;

export const EQUIPMENT = [
  {
    items: [
      "Взрослые и детские велосипеды",
      "SUP-борды",
      "Каяки",
      "Палки для ходьбы",
    ],
    title: "Летний спорт",
  },
  {
    items: ["Беговые лыжи", "Классические санки", "Ватрушки", "Снегоступы"],
    title: "Зимний спорт",
  },
  {
    items: ["Настольные игры", "Мячи", "Бадминтон", "Рыболовные снасти"],
    title: "Игры и развлечения",
  },
] as const;

export const KIDS_SERVICES = [
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
