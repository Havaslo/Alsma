import room4Image from "@/assets/alsma/room-4.jpg";
import duplexTwoBedroomImage from "@/assets/alsma/rooms/duplex-two-bedroom.jpg";
import duplexImage from "@/assets/alsma/rooms/duplex.jpg";
import guestHouseImage from "@/assets/alsma/rooms/guest-house.jpg";
import luxTwoRoomImage from "@/assets/alsma/rooms/lux-two-room.jpg";
import luxImage from "@/assets/alsma/rooms/lux.jpg";
import polulyuksNoBalconyImage from "@/assets/alsma/rooms/polulyuks-no-balcony.jpg";
import polulyuksPlusImage from "@/assets/alsma/rooms/polulyuks-plus.jpg";
import polulyuksImage from "@/assets/alsma/rooms/polulyuks.jpg";
import russianBathImage from "@/assets/alsma/rooms/russian-bath.jpg";
import standardImage from "@/assets/alsma/rooms/standard.jpg";
import superiorImage from "@/assets/alsma/rooms/superior.jpg";
import tripleStandardImage from "@/assets/alsma/rooms/triple-standard.jpg";
import tripleSuperiorImage from "@/assets/alsma/rooms/triple-superior.jpg";

export type RoomCategory = {
  readonly amenities: readonly string[];
  readonly area: string;
  readonly beds: string;
  readonly capacity: string;
  readonly description: string;
  readonly image: string;
  readonly price: string;
  readonly title: string;
};

const standardAmenities = [
  "Wi-Fi",
  "Телевизор",
  "Чайная станция",
  "Холодильник",
  "Косметические принадлежности",
] as const;

export const ROOM_CATEGORIES: readonly RoomCategory[] = [
  {
    amenities: [...standardAmenities, "Душевая кабина", "Тапочки"],
    area: "—",
    beds: "1 двуспальная + диван",
    capacity: "до 4 взрослых",
    description:
      "Номер с двуспальной кроватью и раскладным диваном. Вид на спортивную площадку.",
    image: polulyuksNoBalconyImage,
    price: "от 17 500 ₽",
    title: "Полулюкс (без балкона, корпус 5)",
  },
  {
    amenities: standardAmenities,
    area: "24–26 м²",
    beds: "1 двуспальная или 2 односпальные + кресло-кровать",
    capacity: "2+1",
    description:
      "Номер с двуспальной или двумя односпальными кроватями и раскладным креслом-кроватью. Балкон, вид на лес или соседнее здание.",
    image: polulyuksImage,
    price: "от 17 500 ₽",
    title: "Полулюкс (корпус 5)",
  },
  {
    amenities: standardAmenities,
    area: "24–29 м²",
    beds: "1 двуспальная или 2 односпальные + диван",
    capacity: "до 4 взрослых",
    description:
      "Номер с двуспальной или двумя односпальными кроватями и раскладным диваном. Балкон, вид на лес или соседнее здание.",
    image: polulyuksPlusImage,
    price: "от 18 340 ₽",
    title: "Полулюкс + (корпус 5)",
  },
  {
    amenities: standardAmenities,
    area: "30–35 м²",
    beds: "1 двуспальная или 2 односпальные + диван",
    capacity: "до 4 взрослых",
    description:
      "Номер с двуспальной или двумя односпальными кроватями и раскладным диваном. Балкон, вид на соседнее здание.",
    image: luxImage,
    price: "от 19 740 ₽",
    title: "Люкс (корпус 5)",
  },
  {
    amenities: [...standardAmenities, "Балкон с подвесным креслом"],
    area: "35–42 м²",
    beds: "1 двуспальная или 2 односпальные + диван",
    capacity: "до 4 взрослых",
    description:
      "Просторный номер для семейного отдыха: спальня и гостиная с диваном. Балкон с подвесным креслом, вид на территорию.",
    image: luxTwoRoomImage,
    price: "от 21 140 ₽",
    title: "Люкс двухкомнатный (корпус 4)",
  },
  {
    amenities: [...standardAmenities, "Отдельный вход", "Балкон"],
    area: "32 м²",
    beds: "1 этаж: диван, 2 этаж: двуспальная или 2 односпальные",
    capacity: "до 4 взрослых",
    description:
      "Двухэтажный номер с отдельным входом. На первом этаже гостиная с диваном, на втором — спальня. Балкон, вид на территорию.",
    image: duplexImage,
    price: "от 24 240 ₽",
    title: "Двухуровневый полулюкс (корпус 1)",
  },
  {
    amenities: [...standardAmenities, "Отдельный вход", "Два балкона"],
    area: "60 м²",
    beds: "3–5 кроватей",
    capacity: "до 6 взрослых",
    description:
      "Двухэтажный номер с отдельным входом. На втором этаже две спальни. Два балкона, вид на территорию.",
    image: duplexTwoBedroomImage,
    price: "от 26 740 ₽",
    title: "Двухуровневый полулюкс с 2 спальнями (корпус 1)",
  },
  {
    amenities: [...standardAmenities, "Балкон", "Мангальная зона"],
    area: "40 м²",
    beds: "2 двуспальные кровати",
    capacity: "до 4 гостей",
    description:
      "Отдельный уединённый коттедж. На первом этаже обеденная зона, на втором — спальня с двумя двуспальными кроватями.",
    image: russianBathImage,
    price: "от 10 000 ₽",
    title: 'Коттедж "Русская баня"',
  },
  {
    amenities: [
      "Wi-Fi",
      "Телевизор",
      "Кухонная зона",
      "Терраса",
      "Зона барбекю и мангал",
    ],
    area: "140 м²",
    beds: "5 комнат",
    capacity: "16–32 гостя",
    description:
      "Просторный коттедж для больших компаний. Пять жилых комнат, кухонная зона, терраса и зона барбекю.",
    image: guestHouseImage,
    price: "от 17 000 ₽",
    title: 'Коттедж "Гостевой Дом"',
  },
  {
    amenities: standardAmenities,
    area: "до 19 м²",
    beds: "1 двуспальная или 2 односпальные",
    capacity: "2 гостя",
    description:
      "Компактный номер с одной двуспальной или двумя односпальными кроватями.",
    image: standardImage,
    price: "от 12 180 ₽",
    title: "Стандарт (корпус 4)",
  },
  {
    amenities: [...standardAmenities, "Балкон"],
    area: "до 21 м²",
    beds: "3 отдельные кровати",
    capacity: "2+1 или 3 гостя",
    description:
      "Комфортный номер на двух или трёх взрослых. Три отдельные кровати. Балкон, вид на лес или территорию.",
    image: tripleStandardImage,
    price: "от 14 630 ₽",
    title: "Стандарт трехместный (корпус 4)",
  },
  {
    amenities: [...standardAmenities, "Балкон с мебелью"],
    area: "22 м²",
    beds: "1 или 2 кровати",
    capacity: "2+1",
    description:
      "Удобный номер с одной или двумя кроватями. Балкон с мебелью, вид на лес или территорию.",
    image: superiorImage,
    price: "от 15 680 ₽",
    title: "Супериор (корпус 3)",
  },
  {
    amenities: [...standardAmenities, "Балкон"],
    area: "23 м²",
    beds: "2 отдельные или 1 двуспальная + диван",
    capacity: "2+1",
    description:
      "Комфортный номер для двух взрослых и ребёнка. Две отдельные или двуспальная кровать с диваном. Балкон.",
    image: tripleSuperiorImage,
    price: "от 16 380 ₽",
    title: "Супериор трехместный (корпус 3)",
  },
];

export const HOME_ROOM_CATEGORIES: readonly RoomCategory[] = [
  {
    ...ROOM_CATEGORIES[0],
    capacity: "1–2 гостя",
    title: "Студия в сосновом лесу",
  },
  {
    ...ROOM_CATEGORIES[1],
    area: "48 м²",
    capacity: "2–4 гостя",
    title: "Семейный номер Люкс",
  },
  {
    ...ROOM_CATEGORIES[2],
    area: "76 м²",
    capacity: "4–6 гостей",
    title: "Коттедж на берегу",
  },
  {
    amenities: ["Панорамные окна", "Гостиная", "Мини-бар", "Ванная"],
    area: "58 м²",
    beds: "1 двуспальная кровать",
    capacity: "1–2 гостя",
    description:
      "Светлый просторный номер с панорамным видом на сосновый лес и приватной зоной отдыха.",
    image: room4Image,
    price: "от 27 000 ₽",
    title: "Панорамный сьют",
  },
];

export const ROOM_COMPARISON = [
  { label: "Площадь", values: ["—", "24–26 м²", "24–29 м²", "30–35 м²"] },
  { label: "Гости", values: ["до 4", "2+1", "до 4", "до 4"] },
  {
    label: "Кровати",
    values: [
      "Двуспальная и диван",
      "Двуспальная или 2 односпальные",
      "Двуспальная или 2 односпальные и диван",
      "Двуспальная или 2 односпальные и диван",
    ],
  },
  {
    label: "Особенности",
    values: ["3 этаж, без балкона", "Балкон, вид на лес", "Балкон", "Балкон"],
  },
  {
    label: "Цена",
    values: ["от 17 500 ₽", "от 17 500 ₽", "от 18 340 ₽", "от 19 740 ₽"],
  },
] as const;
