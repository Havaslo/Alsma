import romanticImage from "@/assets/alsma/romantic-escape.png";
import summerImage from "@/assets/alsma/season-summer.jpg";
import buffetImage from "@/assets/alsma/spa-buffet.jpg";
import ceremonyImage from "@/assets/alsma/spa-ceremony.jpg";
import riverImage from "@/assets/alsma/spa-river-aerial.jpg";

export const EVENT_FORMATS = [
  {
    capacity: "20–120 гостей",
    description:
      "Выездная регистрация, банкет, размещение гостей, утренний бранч и SPA-восстановление.",
    details: [
      "Выездная церемония",
      "Банкет и декор",
      "Размещение",
      "Координатор",
    ],
    image: romanticImage,
    title: "Свадьбы и семейные торжества",
  },
  {
    capacity: "10–60 гостей",
    description:
      "Камерные праздники и семейные ужины с отдельным залом, авторским меню и программой.",
    details: ["Частный зал", "Праздничное меню", "Живая музыка", "Фотозоны"],
    image: ceremonyImage,
    title: "Юбилеи и частные события",
  },
  {
    capacity: "15–150 гостей",
    description:
      "Стратегические сессии, командные встречи и ретриты с проживанием и активностями.",
    details: [
      "Конференц-зона",
      "Проживание",
      "Тимбилдинг",
      "SPA и вечерняя программа",
    ],
    image: summerImage,
    title: "Корпоративные выезды",
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
] as const;
