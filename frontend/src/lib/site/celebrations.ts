import liveMusicImage from "@/assets/alsma/entertainment-live-music.png";
import romanticImage from "@/assets/alsma/romantic-escape.png";
import summerImage from "@/assets/alsma/season-summer.jpg";
import buffetImage from "@/assets/alsma/spa-buffet.jpg";
import ceremonyImage from "@/assets/alsma/spa-ceremony.jpg";
import riverImage from "@/assets/alsma/spa-river-aerial.jpg";

export const EVENT_FORMATS = [
  {
    capacity: "20–120 гостей",
    description:
      "Выездная регистрация, банкет, размещение гостей, утренний бранч и SPA-восстановление на следующий день.",
    details: [
      "Выездная церемония",
      "Банкет и декор",
      "Размещение гостей",
      "Персональный координатор",
    ],
    image: romanticImage,
    title: "Свадьбы и семейные торжества",
  },
  {
    capacity: "10–60 гостей",
    description:
      "Камерные праздники, дни рождения и семейные ужины с отдельным залом, авторским меню и вечерней программой.",
    details: [
      "Частный зал или терраса",
      "Праздничное меню",
      "Живая музыка",
      "Фото-зоны и сервировка",
    ],
    image: ceremonyImage,
    title: "Юбилеи и частные события",
  },
  {
    capacity: "15–150 гостей",
    description:
      "Стратегические сессии, командные встречи, ретриты и неформальные выезды с проживанием, питанием и активностями.",
    details: [
      "Конференц-зона",
      "Проживание в номерах и коттеджах",
      "Командные активности",
      "SPA и вечерняя программа",
    ],
    image: summerImage,
    title: "Корпоративные выезды и тимбилдинги",
  },
] as const;

export const EVENT_GALLERY = [
  {
    description: "Welcome-зона, летний ужин или выездная церемония.",
    image: riverImage,
    title: "Локация у реки",
  },
  {
    description: "Фуршетная линия, сервировка и гастрономические акценты.",
    image: buffetImage,
    title: "Банкетная подача",
  },
  {
    description: "Свечи, цветочные композиции и праздничная сервировка.",
    image: ceremonyImage,
    title: "Торжественный декор",
  },
  {
    description:
      "Формат события для пары или небольшой компании с проживанием и SPA.",
    image: romanticImage,
    title: "Пример частного торжества",
  },
  {
    description:
      "Командные активности, отдых на свежем воздухе и неформальное общение.",
    image: summerImage,
    title: "Корпоративный отдых на природе",
  },
  {
    description:
      "Живая музыка, ведущий и праздничная атмосфера после основной части дня.",
    image: liveMusicImage,
    title: "Вечерняя программа",
  },
] as const;
