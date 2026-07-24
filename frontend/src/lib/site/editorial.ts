import liveMusicImage from "@/assets/alsma/entertainment-live-music.png";
import familyImage from "@/assets/alsma/family-holiday.png";
import romanticImage from "@/assets/alsma/romantic-escape.png";
import bathImage from "@/assets/alsma/spa-bath.jpg";
import forestImage from "@/assets/alsma/spa-forest-walk.jpg";
import massageImage from "@/assets/alsma/spa-massage.jpg";
import programsImage from "@/assets/alsma/spa-programs.jpg";
import riverImage from "@/assets/alsma/spa-river-aerial.jpg";
import wellnessImage from "@/assets/alsma/spa-wellness.png";

export type NewsCategory = "arrivals" | "events" | "wellness";
export type EditorialCategory = NewsCategory | "guide" | "stories" | "tips";

export type EditorialItem = {
  readonly buttonLink?: string;
  readonly buttonText?: string;
  readonly category: EditorialCategory;
  readonly date: string;
  readonly dateValue?: string;
  readonly description: string;
  readonly details: string;
  readonly image: string;
  readonly imageName?: string;
  readonly isActive?: boolean;
  readonly isArchived?: boolean;
  readonly remainingPlaces?: string;
  readonly sortOrder?: number;
  readonly tags: readonly string[];
  readonly title: string;
};

export const NEWS_ITEMS: readonly EditorialItem[] = [
  {
    category: "wellness",
    date: "18 сентября 2026",
    dateValue: "2026-09-18",
    description:
      "Трёхдневная программа с диагностикой, гидротермальной зоной и авторскими ритуалами.",
    details:
      "В программу входят welcome-комплимент, диагностика состояния, персональные рекомендации, SPA-ритуал, термальная зона и гастрономическое меню.",
    image: wellnessImage,
    tags: ["Wellness", "Осталось 12 мест"],
    title: "Wellness-уикенд с диагностикой",
  },
  {
    category: "arrivals",
    date: "2 сентября 2026",
    dateValue: "2026-09-02",
    description:
      "Программа для родителей и детей с анимацией, мастер-классами и пикником у реки.",
    details:
      "Заезд включает проживание, семейные активности, игровую программу, вечер у костра и специальные условия на детское меню.",
    image: familyImage,
    tags: ["Семьям", "Осталось 8 мест"],
    title: "Семейный заезд «Лесные каникулы»",
  },
  {
    category: "events",
    date: "27 августа 2026",
    dateValue: "2026-08-27",
    description:
      "Камерное событие с сет-меню от шефа, сопровождением и загородной атмосферой.",
    details:
      "Приветственный аперитив, сезонное меню, живая музыка, фотозона и ночной отдых по специальному тарифу.",
    image: liveMusicImage,
    tags: ["Событие", "Осталось 15 мест"],
    title: "Осенний гастровечер с живой музыкой",
  },
  {
    category: "wellness",
    date: "14 августа 2026",
    dateValue: "2026-08-14",
    description:
      "Романтический формат с парными ритуалами, поздним выездом и wellness-зоной.",
    details:
      "Проживание, парный массаж, аромаритуал, комплимент в номер, поздний завтрак и спокойная вечерняя программа.",
    image: romanticImage,
    tags: ["Для двоих", "Осталось 6 мест"],
    title: "Восстановительный SPA-заезд для двоих",
  },
  {
    category: "arrivals",
    date: "5 августа 2026",
    dateValue: "2026-08-05",
    description:
      "Прогулки, SUP, веломаршруты, банный ритуал и вечер на воздухе.",
    details:
      "В пакет входят активности на воде, прокат оборудования, прогулочные маршруты, банный ритуал и ужин.",
    image: riverImage,
    tags: ["Активный отдых", "Осталось 10 мест"],
    title: "Активный weekend на воде и в лесу",
  },
  {
    category: "wellness",
    date: "21 июля 2026",
    dateValue: "2026-07-21",
    description:
      "Однодневная программа с лекцией, SPA-практиками, массажем и лёгким меню.",
    details:
      "Лекция wellness-эксперта, уходовый ритуал, массаж, фитобар, зона отдыха и авторский обед.",
    image: massageImage,
    tags: ["День для себя", "Осталось 18 мест"],
    title: "Женский день восстановления",
  },
];

export const BLOG_ITEMS: readonly EditorialItem[] = [
  {
    category: "stories",
    date: "12 октября 2026",
    description:
      "История о том, как два дня в лесу и SPA-ритуалы помогают снова почувствовать отдых вместе.",
    details:
      "Поздний заезд, ужин у камина, прогулка по сосновому лесу, парный ритуал и неспешное утро превращают короткую поездку в полноценную перезагрузку.",
    image: romanticImage,
    tags: ["Истории гостей", "Для двоих"],
    title: "Как парам перезагрузиться за weekend",
  },
  {
    category: "guide",
    date: "3 октября 2026",
    description:
      "Мини-гид по красивым точкам региона и идеям маленького путешествия.",
    details:
      "Старинные маршруты, природные виды, локальные фестивали и атмосферные города для коротких выездов из отеля.",
    image: riverImage,
    tags: ["Гид по региону", "Маршруты"],
    title: "5 мест Нижегородской области",
  },
  {
    category: "tips",
    date: "25 сентября 2026",
    description:
      "Как собрать чемодан на короткий wellness-отдых и ничего не забыть.",
    details:
      "Удобная одежда для прогулок, вещи для термальной зоны и небольшие детали, которые делают поездку спокойнее.",
    image: bathImage,
    tags: ["Советы", "SPA-отдых"],
    title: "Что взять с собой на SPA-уикенд",
  },
  {
    category: "stories",
    date: "16 сентября 2026",
    description:
      "Рассказ семьи о поездке, где детям интересно, а родителям спокойно и удобно.",
    details:
      "Семейное размещение, прогулки, анимация и удобный график помогают всем членам семьи отдыхать в одном ритме.",
    image: familyImage,
    tags: ["Истории гостей", "Семейный отдых"],
    title: "Семейный отдых глазами гостей",
  },
  {
    category: "guide",
    date: "7 сентября 2026",
    description:
      "Готовый сценарий поездки по Бору с возвращением к вечернему SPA.",
    details:
      "Поздний завтрак, прогулка по окрестностям, природные остановки, ужин и вечерний wellness без лишней спешки.",
    image: forestImage,
    tags: ["Гид по региону", "Маршрут дня"],
    title: "Маршрут одного дня",
  },
  {
    category: "tips",
    date: "28 августа 2026",
    description: "Как не превращать красивый weekend в гонку за впечатлениями.",
    details:
      "Выберите два-три главных впечатления, оставьте время для тишины и позвольте себе отдых без стремления успеть всё.",
    image: programsImage,
    tags: ["Советы", "Медленный отдых"],
    title: "Как настроиться на медленный отдых",
  },
];
