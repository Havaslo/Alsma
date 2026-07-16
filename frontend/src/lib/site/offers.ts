import familyImage from "@/assets/alsma/family-holiday.png";
import romanticImage from "@/assets/alsma/romantic-escape.png";
import spaImage from "@/assets/alsma/spa-wellness.png";

export const ACTIVE_OFFERS = [
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
] as const;

export const READY_SCENARIOS = [
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

export const OFFER_EVENTS = [
  {
    date: "18 сентября 2026",
    description:
      "Камерный вечер с сет-меню, живой музыкой и возможностью продлить отдых в отеле.",
    tag: "Событие",
    title: "Осенний гастровечер",
  },
  {
    date: "3–5 октября 2026",
    description:
      "Насыщенная программа с лекциями, ритуалами и релаксом в wellness-пространстве.",
    tag: "Wellness",
    title: "SPA-фестиваль восстановления",
  },
  {
    date: "24–25 октября 2026",
    description:
      "Активности для детей, мастер-классы, пикник и размеренный отдых для родителей.",
    tag: "Семьям",
    title: "Семейные выходные в лесу",
  },
] as const;
