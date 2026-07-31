import allInclusiveImage from "@/assets/alsma/all-inclusive.jpg";
import celebrationsImage from "@/assets/alsma/celebrations.jpg";
import entertainmentImage from "@/assets/alsma/entertainment.jpg";
import heroImage from "@/assets/alsma/hero.jpg";
import natureImage from "@/assets/alsma/nature.jpg";
import offersImage from "@/assets/alsma/offers.png";
import restaurantImage from "@/assets/alsma/restaurant.jpg";
import roomsImage from "@/assets/alsma/rooms-hero.webp";
import spaImage from "@/assets/alsma/spa.jpg";

export type PublicPageKey =
  | "about"
  | "all-inclusive"
  | "blog"
  | "celebrations"
  | "entertainment"
  | "hardware-procedures"
  | "home"
  | "news"
  | "offers"
  | "privacy"
  | "rooms"
  | "spa";
export type PublicPageDefinition = {
  readonly description: string;
  readonly eyebrow: string;
  readonly heroImage: string;
  readonly highlights: readonly { description: string; title: string }[];
  readonly key: PublicPageKey;
  readonly title: string;
};

export const PUBLIC_PAGES: Record<PublicPageKey, PublicPageDefinition> = {
  about: {
    description:
      "«АЛСМА» — загородный SPA-отель с большой территорией, бассейнами и отдыхом для всей семьи.",
    eyebrow: "Об отеле",
    heroImage: natureImage,
    highlights: [
      {
        title: "Сосновый лес",
        description:
          "Тишина, чистый воздух и прогулочные маршруты прямо от отеля.",
      },
      {
        title: "Забота в деталях",
        description:
          "Команда, которая помогает сделать каждый заезд особенным.",
      },
    ],
    key: "about",
    title: "АЛСМА — отдых в гармонии с природой",
  },
  "all-inclusive": {
    description:
      "Главный ресторан со шведским столом, барбекю в стеклянном куполе, лёгкое меню в SPA-зоне и вечерняя барная атмосфера — всё, что делает отдых в АЛСМЕ по-настоящему беззаботным.",
    eyebrow: "Всё включено",
    heroImage: allInclusiveImage,
    highlights: [
      {
        title: "Трёхразовое питание",
        description: "Свежие блюда ресторана и сезонное меню.",
      },
      {
        title: "Программа на весь день",
        description: "От спорта до семейной анимации и вечерних событий.",
      },
    ],
    key: "all-inclusive",
    title: "Вкусный отдых, который входит в ваш ритм восстановления",
  },
  blog: {
    description:
      "Маршруты, идеи для отдыха и истории из жизни загородного отеля.",
    eyebrow: "Журнал АЛСМА",
    heroImage: restaurantImage,
    highlights: [
      {
        title: "Гид по отдыху",
        description: "Полезные рекомендации для идеального путешествия.",
      },
      {
        title: "Вкус сезона",
        description: "Рассказываем о кухне, продуктах и новых блюдах.",
      },
    ],
    key: "blog",
    title: "Вдохновение для следующей поездки",
  },
  celebrations: {
    description:
      "Природная площадка для свадеб, юбилеев, встреч и корпоративных заездов.",
    eyebrow: "События",
    heroImage: celebrationsImage,
    highlights: [
      {
        title: "Персональный сценарий",
        description: "Соберём программу под формат и количество гостей.",
      },
      {
        title: "Проживание рядом",
        description: "Гости остаются в комфортных номерах после события.",
      },
    ],
    key: "celebrations",
    title: "Торжества и корпоративный отдых",
  },
  entertainment: {
    description:
      "Насыщенная программа активностей, спортивных мероприятий и развлечений для гостей всех возрастов.",
    eyebrow: "Развлечения",
    heroImage: entertainmentImage,
    highlights: [
      {
        title: "Семейная анимация",
        description: "Игры, мастер-классы и тематические программы.",
      },
      {
        title: "Сезонные активности",
        description: "Прокат, спорт, прогулки и вечерние события.",
      },
    ],
    key: "entertainment",
    title: "Каждый день наполнен впечатлениями",
  },
  "hardware-procedures": {
    description:
      "Современные процедуры для восстановления, лёгкости и заботы о теле.",
    eyebrow: "Wellness",
    heroImage: spaImage,
    highlights: [
      {
        title: "Индивидуальный подбор",
        description: "Специалист поможет составить программу процедур.",
      },
      {
        title: "Современное оборудование",
        description: "Комфортные и бережные wellness-методики.",
      },
    ],
    key: "hardware-procedures",
    title: "Аппаратные процедуры",
  },
  home: {
    description:
      "Загородный спа-отель на слиянии двух рек в окружении соснового леса.",
    eyebrow: "Главная страница",
    heroImage,
    highlights: [],
    key: "home",
    title: "Отдых, который возвращает к себе",
  },
  news: {
    description: "Новые программы, события и важные обновления отеля.",
    eyebrow: "Новости",
    heroImage: natureImage,
    highlights: [
      {
        title: "События сезона",
        description: "Анонсы ближайших заездов и специальных программ.",
      },
      {
        title: "Обновления отеля",
        description: "Новые услуги, пространства и возможности для гостей.",
      },
    ],
    key: "news",
    title: "Что нового в АЛСМА",
  },
  offers: {
    description:
      "Выгодные условия для семейных, длительных и ранних бронирований.",
    eyebrow: "Спецпредложения",
    heroImage: offersImage,
    highlights: [
      {
        title: "Семейный отдых",
        description: "Особые условия для путешествий с детьми.",
      },
      {
        title: "Длительное проживание",
        description:
          "Больше дней для восстановления с дополнительными привилегиями.",
      },
    ],
    key: "offers",
    title: "Выберите предложение под свой формат отдыха",
  },
  privacy: {
    description:
      "Как АЛСМА обрабатывает и защищает персональные данные гостей.",
    eyebrow: "Документы",
    heroImage: natureImage,
    highlights: [
      {
        title: "Конфиденциальность",
        description:
          "Данные используются только для оказания услуг и связи с гостем.",
      },
      {
        title: "Контроль",
        description: "Вы можете запросить уточнение или удаление своих данных.",
      },
    ],
    key: "privacy",
    title: "Политика конфиденциальности",
  },
  rooms: {
    description:
      "Почувствуйте ритм загородного отдыха: уютные номера, тишина соснового леса и всё необходимое для перезагрузки вдали от городской суеты.",
    eyebrow: "Проживание",
    heroImage: roomsImage,
    highlights: [
      {
        title: "Комфорт для семьи",
        description: "Категории номеров для пар, семей и компаний.",
      },
      {
        title: "Природа за окном",
        description: "Тишина леса и свежий воздух с первого утра.",
      },
    ],
    key: "rooms",
    title: "Номера, в которых хочется остаться",
  },
  spa: {
    description:
      "Пространство тепла, воды и тишины для полноценного восстановления.",
    eyebrow: "SPA и wellness",
    heroImage: spaImage,
    highlights: [
      {
        title: "Ритуалы восстановления",
        description: "Массажи и программы для глубокого расслабления.",
      },
      {
        title: "Зона отдыха",
        description: "Спокойное пространство без суеты и спешки.",
      },
    ],
    key: "spa",
    title: "Время для себя",
  },
};
