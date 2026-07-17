import { AMAZI_ROUTES } from "@/AMAZI_ROUTES";
import familyImage from "@/assets/alsma/family-holiday.png";
import romanticImage from "@/assets/alsma/romantic-escape.png";
import summerImage from "@/assets/alsma/season-summer.jpg";
import wellnessImage from "@/assets/alsma/spa-wellness.png";

export type HomeRestCard = {
  readonly description: string;
  readonly href?: string;
  readonly image: string;
  readonly price: string;
  readonly tags: readonly string[];
  readonly title: string;
};

export type HomeReview = {
  readonly name: string;
  readonly source: string;
  readonly text: string;
};

export type HomePopupBanner = {
  readonly badge: string;
  readonly buttonHref: string;
  readonly buttonLabel: string;
  readonly description: string;
  readonly displayDelaySeconds: number;
  readonly image: string;
  readonly pagePaths: readonly string[];
  readonly title: string;
};

export const HOME_REST_CARDS: readonly HomeRestCard[] = [
  {
    description:
      "Два дня глубокой перезагрузки с массажем, термальной зоной, гастрономическим завтраком и медленным отдыхом в тишине соснового леса.",
    image: wellnessImage,
    price: "от 25 000 ₽",
    tags: ["2 ночи", "SPA-ритуал", "Завтрак включён"],
    title: "SPA & Wellness выходные",
  },
  {
    description:
      "Сценарий для двоих с камерным ужином, ароматическим ритуалом, поздним выездом и атмосферой уединённого отдыха.",
    image: romanticImage,
    price: "от 35 000 ₽",
    tags: ["Для двоих", "Ужин у камина", "Поздний выезд"],
    title: "Романтический побег",
  },
  {
    description:
      "Просторное размещение, лесные прогулки, меню для всей семьи и мягкий ритм загородного отдыха без лишней суеты.",
    href: AMAZI_ROUTES.allInclusive,
    image: familyImage,
    price: "от 45 000 ₽",
    tags: ["Семейный отдых", "Прогулки", "Детское меню"],
    title: "Семейные каникулы",
  },
  {
    description:
      "Выезды для команд с проживанием, банкетом, локациями для встреч и программой отдыха на природе.",
    href: AMAZI_ROUTES.celebrations,
    image: summerImage,
    price: "по запросу",
    tags: ["15–150 гостей", "Тимбилдинг", "Банкет и SPA"],
    title: "Корпоративные заезды",
  },
];

export const HOME_REVIEWS: readonly HomeReview[] = [
  {
    name: "Анна",
    source: "Яндекс Карты",
    text: "В АЛСМА получилось полностью отключиться от ритма города: тишина, мягкий свет, безупречный сервис.",
  },
  {
    name: "Михаил",
    source: "2ГИС",
    text: "Идеальное сочетание приватности, качественного SPA и продуманной гастрономии — редкий уровень для загородного формата.",
  },
  {
    name: "Елена",
    source: "Google Карты",
    text: "Очень спокойная атмосфера, красивые интерьеры и ощущение, будто ты в дорогом журнале про путешествия и wellness.",
  },
  {
    name: "Игорь",
    source: "Яндекс Карты",
    text: "Бронировали коттедж на выходные — вживую он даже лучше, чем на фото. Удобно, что можно сразу выбрать программу в SPA.",
  },
  {
    name: "Ольга",
    source: "2ГИС",
    text: "Очень понравились завтраки и внимание персонала. Дети тоже были в восторге от прогулок и тёплого бассейна.",
  },
  {
    name: "Сергей",
    source: "Яндекс Карты",
    text: "Приехали на сутки, а уезжать не хотелось. Место действительно помогает выдохнуть и перезагрузиться.",
  },
  {
    name: "Наталья",
    source: "Google Карты",
    text: "Отдыхали небольшой компанией: всем хватило пространства, и у каждого был свой комфортный сценарий отдыха.",
  },
  {
    name: "Дмитрий",
    source: "Яндекс Карты",
    text: "Отдельно отмечу чистоту, тишину и очень красивую территорию — это тот случай, когда реальность лучше ожиданий.",
  },
];

export const HOME_POPUP_BANNERS: readonly HomePopupBanner[] = [
  {
    badge: "Спецпредложение",
    buttonHref: AMAZI_ROUTES.offers,
    buttonLabel: "Узнать подробнее",
    description:
      "Забронируйте отдых заранее и получите SPA-ритуал или wellness-привилегию на выбор.",
    displayDelaySeconds: 3,
    image: romanticImage,
    pagePaths: [AMAZI_ROUTES.home],
    title: "Раннее бронирование со SPA-бонусом",
  },
];
