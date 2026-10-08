import restaurant from "@/assets/alsma/cafe-mineral-food.webp";
import celebrations from "@/assets/alsma/celebrations.jpg";
import riverBeach from "@/assets/alsma/river-beach.jpg";
import rooms from "@/assets/alsma/rooms-hero.webp";
import winter from "@/assets/alsma/season-winter.jpg";
import spaBath from "@/assets/alsma/spa-bath-new.jpg";
import spaMassage from "@/assets/alsma/spa-massage-new.jpg";
import spaPool from "@/assets/alsma/spa-pool-new.webp";
import spaPrograms from "@/assets/alsma/spa-programs-v2.jpg";
import spaThermal from "@/assets/alsma/spa-thermal-zone.webp";

export const CONTENT_CHANNELS = [
  { id: "vk", label: "VK", shortLabel: "VK" },
  { id: "telegram", label: "Telegram", shortLabel: "TG" },
  { id: "max", label: "Max", shortLabel: "M" },
  { id: "instagram", label: "Instagram", shortLabel: "IG" },
  { id: "zen", label: "Яндекс.Дзен", shortLabel: "Д" },
] as const;

export type ContentChannel = (typeof CONTENT_CHANNELS)[number]["id"];

export const getChannelLabel = (channel: ContentChannel) =>
  CONTENT_CHANNELS.find((item) => item.id === channel)?.label ?? channel;

export interface FactoryMediaItem {
  id: string;
  title: string;
  category: string;
  tags: string[];
  image: string;
  subtitle: string;
  contentType?: string;
}

export const MEDIA_ITEMS: FactoryMediaItem[] = [
  {
    id: "spa-pool",
    title: "Тёплая вода и тишина",
    category: "SPA",
    tags: ["бассейн", "релакс", "акция"],
    image: spaPool,
    subtitle: "1600 × 1067",
  },
  {
    id: "spa-thermal",
    title: "Термальная зона",
    category: "SPA",
    tags: ["пар", "восстановление"],
    image: spaThermal,
    subtitle: "1600 × 1067",
  },
  {
    id: "spa-programs",
    title: "Программы отдыха",
    category: "SPA",
    tags: ["процедуры", "забота о себе"],
    image: spaPrograms,
    subtitle: "1600 × 1067",
  },
  {
    id: "spa-massage",
    title: "Ритуал восстановления",
    category: "SPA",
    tags: ["массаж", "спокойствие"],
    image: spaMassage,
    subtitle: "1600 × 1067",
  },
  {
    id: "spa-bath",
    title: "Отдых в чане",
    category: "Чан",
    tags: ["чан", "на открытом воздухе"],
    image: spaBath,
    subtitle: "1600 × 1067",
  },
  {
    id: "river",
    title: "Берег для долгих прогулок",
    category: "Территория",
    tags: ["река", "природа"],
    image: riverBeach,
    subtitle: "1600 × 1067",
  },
  {
    id: "restaurant",
    title: "Завтрак в ресторане",
    category: "Ресторан",
    tags: ["еда", "завтрак"],
    image: restaurant,
    subtitle: "1600 × 1067",
  },
  {
    id: "rooms",
    title: "Номер для спокойного отдыха",
    category: "Номера",
    tags: ["интерьер", "комфорт"],
    image: rooms,
    subtitle: "1600 × 1067",
  },
  {
    id: "events",
    title: "Место для особенного дня",
    category: "Мероприятия",
    tags: ["праздник", "встреча"],
    image: celebrations,
    subtitle: "1600 × 1067",
  },
  {
    id: "winter",
    title: "Зимние выходные в ALSMA",
    category: "Сезоны",
    tags: ["зима", "отдых"],
    image: winter,
    subtitle: "1600 × 1067",
  },
];

export interface DraftVariant {
  id: string;
  label: string;
  title: string;
  concept: string;
  text: string;
  /** Original inputs used as AI references; falls back to imageId for older drafts. */
  sourceImageIds?: string[];
  imageId: string;
  channelImageIds: Record<ContentChannel, string>;
  /** Optional for compatibility with drafts saved before multi-image support. */
  channelImageGalleryIds?: Record<ContentChannel, string[]>;
  adaptations: Record<ContentChannel, string>;
}

export const getDraftVariantSourceImageIds = (variant: DraftVariant) => {
  if (variant.sourceImageIds !== undefined) {
    return [...new Set(variant.sourceImageIds.filter(Boolean))];
  }
  return variant.imageId ? [variant.imageId] : [];
};

export const getDraftVariantImageIds = (
  variant: DraftVariant,
  channel: ContentChannel,
) => {
  const galleryIds = variant.channelImageGalleryIds?.[channel]?.filter(Boolean);
  if (galleryIds?.length) return galleryIds;
  const singleImageId = variant.channelImageIds[channel] || variant.imageId;
  return singleImageId ? [singleImageId] : [];
};

export const DEMO_VARIANTS: DraftVariant[] = [
  {
    id: "warm-pause",
    label: "Вариант 1",
    title: "Тёплая пауза среди ноября",
    concept: "Мягко показываем SPA как повод замедлиться и уделить время себе.",
    text: "Ноябрь — хороший повод немного замедлиться. 🍂\n\nВесь месяц — скидка 20% на SPA, чтобы отдыхать, восстанавливаться и возвращаться к своим делам с новыми силами.\n\nВыберите день для тёплой паузы — подробности акции можно уточнить при бронировании.",
    imageId: "spa-pool",
    channelImageIds: {
      vk: "spa-pool",
      telegram: "spa-pool",
      max: "spa-pool",
      instagram: "spa-pool",
      zen: "spa-pool",
    },
    adaptations: {
      vk: "Ноябрь — хороший повод немного замедлиться. 🍂\n\nВ течение месяца действует скидка 20% на SPA. Проведите время в спокойной атмосфере, отдохните от привычного ритма и уделите внимание себе.\n\nВыберите удобный день, а подробности акции и доступность уточните при бронировании.",
      telegram:
        "Пусть в ноябре будет время для себя 🍂\n\nСкидка 20% на SPA весь месяц — повод поставить заботу о себе в календарь.\n\nПодробности — при бронировании.",
      max: "Ноябрьская пауза для себя 🍂\n\nВесь месяц — скидка 20% на SPA. Выберите день для отдыха, а детали акции уточните при бронировании.",
      instagram:
        "Тепло, тишина и немного времени для себя 🍂\n\nВ ноябре — скидка 20% на SPA.\n\nПодробности акции — при бронировании.\n\n#ALSMA #SPA #времяДляСебя",
      zen: "Как устроить себе небольшую перезагрузку в ноябре\n\nОсенью особенно важно находить время для отдыха. SPA помогает сменить привычный ритм и сделать паузу в насыщенном расписании. В ноябре на посещение SPA действует скидка 20%.\n\nПланируя визит, уточните условия предложения и доступность выбранного времени при бронировании.",
    },
  },
  {
    id: "gift-yourself",
    label: "Вариант 2",
    title: "Подарок, который не нужно откладывать",
    concept: "Делаем акцент на личной заботе и простом следующем шаге.",
    text: "Подарите себе не вещь, а передышку. 🤍\n\nВ ноябре SPA ALSMA — со скидкой 20%. Выберите удобный день, оставьте заботы на потом и посвятите несколько часов себе.\n\nУточнить детали предложения можно при бронировании.",
    imageId: "spa-massage",
    channelImageIds: {
      vk: "spa-massage",
      telegram: "spa-massage",
      max: "spa-massage",
      instagram: "spa-massage",
      zen: "spa-massage",
    },
    adaptations: {
      vk: "Подарок, который можно сделать себе уже сейчас. 🤍\n\nВ ноябре действует скидка 20% на SPA ALSMA. Несколько спокойных часов помогут сменить обстановку и позаботиться о себе.\n\nУсловия предложения и доступность уточняйте при бронировании.",
      telegram:
        "В этом ноябре подарите себе паузу 🤍\n\nSPA ALSMA — со скидкой 20%. Детали и свободное время — при бронировании.",
      max: "Время для себя — хороший план на ноябрь 🤍\n\nСкидка 20% на SPA ALSMA. Условия акции уточняйте при бронировании.",
      instagram:
        "Небольшое напоминание: вы тоже заслуживаете заботы 🤍\n\nВ ноябре — 20% на SPA.\nУточнить условия можно при бронировании.\n\n#ALSMA #заботаосебе #SPA",
      zen: "Почему полезно заранее планировать отдых\n\nВ плотном графике свободное время редко появляется само. Запланированная пауза помогает переключиться и уделить внимание своему самочувствию. В ноябре SPA ALSMA доступно со скидкой 20%.\n\nПеред визитом уточните актуальные условия предложения и свободные даты.",
    },
  },
  {
    id: "slow-november",
    label: "Вариант 3",
    title: "Разрешите себе никуда не спешить",
    concept: "Атмосферный вариант с акцентом на настроение и визуальный образ.",
    text: "За окном ноябрь, а у вас — планы на тёплый и спокойный день.\n\nВесь месяц действует скидка 20% на SPA. Выдохнуть, сменить обстановку и провести время в своём темпе — хороший план на любой день недели.\n\nПодробности акции уточняйте при бронировании.",
    imageId: "spa-thermal",
    channelImageIds: {
      vk: "spa-thermal",
      telegram: "spa-thermal",
      max: "spa-thermal",
      instagram: "spa-thermal",
      zen: "spa-thermal",
    },
    adaptations: {
      vk: "За окном ноябрь, а в планах — день без спешки.\n\nВ течение месяца действует скидка 20% на SPA. Смените привычный ритм, отдохните и проведите время в своём темпе.\n\nПодробности предложения и доступность уточняйте при бронировании.",
      telegram:
        "Ноябрьский план: никуда не спешить.\n\nВесь месяц — скидка 20% на SPA. Подробности — при бронировании.",
      max: "Тёплый план на ноябрь: SPA со скидкой 20%.\n\nУсловия предложения можно уточнить при бронировании.",
      instagram:
        "Ноябрь может быть тёплым. 🍂\n\nSPA со скидкой 20% — весь месяц.\nПодробности — при бронировании.\n\n#ALSMA #осень #SPA",
      zen: "Ноябрьский отдых без спешки: идея для свободного дня\n\nИногда лучший план — оставить в расписании немного свободного места. В ноябре можно устроить себе спокойный день и посетить SPA со скидкой 20%.\n\nАктуальные условия предложения и доступные даты уточняйте при бронировании.",
    },
  },
];

export type PlanStatus =
  | "В очереди"
  | "Создаётся"
  | "На проверке"
  | "Одобрен к публикации"
  | "Ошибка генерации"
  | "Отменён"
  | "Черновик"
  | "На согласовании"
  | "Запланировано"
  | "Опубликовано"
  | "Ошибка";

export interface PlanPublication {
  id: string;
  title: string;
  date: string;
  time: string;
  channels: ContentChannel[];
  status: PlanStatus;
  imageId: string;
  postType?: string;
  format?: string;
  text?: string;
  imagePrompt?: string;
  sourceImageRecommendation?: string;
  generationError?: string | null;
  sourceStatus?: string;
  audience?: string;
  keyFacts?: string;
  callToAction?: string;
  styleGuidance?: string;
  importFileName?: string;
}
