import barbecueImage from "@/assets/alsma/barbecue-glass-dome.jpg";
import buffetImage from "@/assets/alsma/breakfast-lunch-dinner.jpg";
import liveMusicImage from "@/assets/alsma/entertainment-live-music.png";
import beachImage from "@/assets/alsma/river-beach.jpg";
import spaProgramsImage from "@/assets/alsma/spa-programs.jpg";
import welcomeImage from "@/assets/alsma/welcome-day.jpg";

export const INCLUSIVE_OVERVIEW = [
  {
    description:
      "Трёхразовый шведский стол: горячие блюда, салаты, десерты, фрукты и напитки.",
    title: "Питание",
  },
  {
    description:
      "Термальная зона, бассейны и джакузи помогают восстановить силы в течение отдыха.",
    title: "SPA",
  },
  {
    description:
      "Песчаный пляж у воды для солнечных пауз, прогулок и семейного отдыха.",
    title: "Пляж",
  },
  {
    description:
      "Дневные активности и вечерние программы для взрослых и детей.",
    title: "Анимация",
  },
] as const;

export const FOOD_FORMATS = [
  {
    eyebrow: "Основное питание",
    image: buffetImage,
    items: [
      "Завтрак, обед и ужин в формате шведского стола",
      "Супы, мясо, курица, рыба и разнообразные гарниры",
      "Свежие закуски, салаты, десерты, фрукты и напитки",
    ],
    title: "Завтрак, обед и ужин",
  },
  {
    eyebrow: "Дополнительно",
    image: welcomeImage,
    items: [
      "Лёгкий перекус между основными приёмами пищи",
      "Сезонные чай, лимонад или глинтвейн",
      "Заботливая пауза в насыщенной программе дня",
    ],
    title: "«Велком» в течение дня",
  },
] as const;

export const FEATURED_FORMATS = [
  {
    description:
      "Барбекю на открытом огне в стеклянном куполе с видом на природу и комфортом в любую погоду.",
    image: barbecueImage,
    items: ["Шашлык и овощи на гриле", "Люля-кебаб", "Рыба горячего копчения"],
    title: "Барбекю-вечеринки в стеклянном куполе",
  },
  {
    description:
      "Термальная зона, бассейн с минеральной водой и пространства для спокойного восстановления доступны гостям отеля.",
    image: spaProgramsImage,
    items: ["Термальная зона", "Минеральный бассейн", "Зоны отдыха"],
    title: "Локации для отдыха и восстановления",
  },
  {
    description:
      "Вечером отдых продолжается в баре с авторскими напитками, живой музыкой и спокойной атмосферой.",
    image: liveMusicImage,
    items: ["Барная карта", "Живая музыка", "Камерные вечера"],
    title: "Барная карта и атмосфера вечера",
  },
  {
    description:
      "Природное пространство для солнечных пауз, прогулок у воды и спокойного семейного времени.",
    image: beachImage,
    items: [
      "Песчаная береговая линия",
      "Отдых у воды",
      "Прогулки и семейные сценарии",
    ],
    title: "Речной пляж",
  },
] as const;
