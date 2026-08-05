import colorHallImage from "@/assets/alsma/event-color-hall.jpg";
import outdoorCeremonyImage from "@/assets/alsma/event-outdoor-ceremony.jpg";
import restaurantHallImage from "@/assets/alsma/event-restaurant-hall.jpg";
import tentImage from "@/assets/alsma/event-tent.jpg";
import whiteHallImage from "@/assets/alsma/event-white-hall.jpg";
import romanticImage from "@/assets/alsma/romantic-escape.png";
import summerImage from "@/assets/alsma/season-summer.jpg";
import ceremonyImage from "@/assets/alsma/spa-ceremony.jpg";

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
    description:
      "Просторная светлая площадка для свадеб, выпускных, банкетов и летних мероприятий среди природы.",
    details: [
      "До 100 человек за банкетом",
      "До 130 человек при фуршете или конференции",
    ],
    image: tentImage,
    title: "Шатер (120 м²)",
  },
  {
    description:
      "Уютный зал для камерных свадеб, юбилеев, семейных праздников и деловых встреч.",
    details: [
      "До 40 человек за банкетом",
      "До 60 человек при фуршете или конференции",
    ],
    image: whiteHallImage,
    title: "Банкетный зал «Белый» (закрытый)",
  },
  {
    description:
      "Пространство с зеркалами и экраном для конференций, тренингов, спортивных сборов, танцевальных групп и ретритов.",
    details: [
      "Зеркала для занятий и репетиций",
      "Экран для презентаций",
      "Подходит для тренингов и конференций",
      "Удобен для спортивных и творческих групп",
      "До 80 человек при конференциях и обучающих мероприятиях",
      "До 40 человек при тренировках и занятиях спортом",
    ],
    image: colorHallImage,
    title: "Зал «Цветной»",
  },
  {
    description: "Пространство ресторана для больших праздничных мероприятий.",
    details: ["До 150 человек при банкете"],
    image: restaurantHallImage,
    title: "Зал ресторана",
  },
  {
    description:
      "Красивая церемония среди сосен, с живой природой вокруг и возможностью продумать запасной вариант на случай погоды.",
    details: [
      "Открытые площадки в тёплый сезон",
      "Красивые локации для фото",
      "Крытая терраса как альтернатива",
      "Можно провести всё событие на одной территории",
    ],
    image: outdoorCeremonyImage,
    title: "Выездная регистрация на природе",
  },
] as const;
