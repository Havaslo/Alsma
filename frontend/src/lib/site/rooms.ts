import room1Image from "@/assets/alsma/room-1.jpg";
import room2Image from "@/assets/alsma/room-2.jpg";
import room3Image from "@/assets/alsma/room-3.jpg";

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

export const ROOM_CATEGORIES: readonly RoomCategory[] = [
  {
    amenities: ["Панорамные окна", "Душевая зона", "Мини-бар", "Рабочая зона"],
    area: "32 м²",
    beds: "1 двуспальная кровать",
    capacity: "2 гостя",
    description:
      "Уютный номер для спокойного отдыха в окружении леса с мягкой палитрой и всем необходимым для комфортного короткого заезда.",
    image: room1Image,
    price: "от 18 000 ₽",
    title: "Forest Standard",
  },
  {
    amenities: [
      "Вид на реку",
      "Зона отдыха",
      "Капсульная кофемашина",
      "Большая ванная",
    ],
    area: "45 м²",
    beds: "Двуспальная кровать и диван",
    capacity: "2–3 гостя",
    description:
      "Просторный номер с видом на реку и увеличенной зоной отдыха для пары или гостей, которые хотят больше приватности.",
    image: room2Image,
    price: "от 24 000 ₽",
    title: "River Deluxe",
  },
  {
    amenities: [
      "Две зоны сна",
      "Система хранения",
      "Семейный санузел",
      "Удобно для детей",
    ],
    area: "58 м²",
    beds: "Двуспальная и 2 односпальные кровати",
    capacity: "4 гостя",
    description:
      "Семейный формат размещения с дополнительными спальными местами, расширенной системой хранения и комфортом для отдыха с детьми.",
    image: room3Image,
    price: "от 31 000 ₽",
    title: "Family Suite",
  },
];

export const ROOM_COMPARISON = [
  { label: "Площадь", values: ["32 м²", "45 м²", "58 м²"] },
  { label: "Гости", values: ["2 гостя", "2–3 гостя", "4 гостя"] },
  {
    label: "Кровати",
    values: [
      "1 двуспальная",
      "Двуспальная и диван",
      "Двуспальная и 2 односпальные",
    ],
  },
  {
    label: "Особенности",
    values: [
      "Панорамные окна, мини-бар",
      "Вид на реку, зона отдыха",
      "Семейный формат, 2 зоны сна",
    ],
  },
  { label: "Цена", values: ["от 18 000 ₽", "от 24 000 ₽", "от 31 000 ₽"] },
] as const;
