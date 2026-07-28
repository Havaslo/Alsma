export type MockRequestStatus = "completed" | "problem" | "processing";
export type MockRequestType = "call" | "chat";
export type MockRequestTopic = "booking" | "consultation" | "manager-transfer";

export type MockRequest = {
  readonly channel: "site" | "telegram" | "telephone" | "vk" | "whatsapp";
  readonly channelLabel: string;
  readonly clientName: string;
  readonly contact: string;
  readonly createdAt: string;
  readonly id: string;
  readonly intent: string;
  readonly result: string;
  readonly status: MockRequestStatus;
  readonly topic: MockRequestTopic;
  readonly topicLabel: string;
  readonly type: MockRequestType;
  readonly typeLabel: string;
};

export type MockTranscriptMessage = {
  readonly author: "guest" | "manager";
  readonly text: string;
};

export type MockRequestDetails = {
  readonly client: readonly { label: string; value: string }[];
  readonly collected: readonly { label: string; value: string }[];
  readonly deadline: string;
  readonly managerTask: string;
  readonly managerLabel?: string;
  readonly outcome: string;
  readonly transcript: readonly MockTranscriptMessage[];
};

export const MOCK_REQUESTS: readonly MockRequest[] = [
  {
    channel: "telephone",
    channelLabel: "Телефон",
    clientName: "Анна",
    contact: "+7 (921) 555-01-11",
    createdAt: "17.06.2026 11:12",
    id: "1",
    intent: "Бронирование на выходные",
    result: "Создана заявка и отправлен расчёт на почту",
    status: "completed",
    topic: "booking",
    topicLabel: "Бронирование",
    type: "call",
    typeLabel: "Звонок",
  },
  {
    channel: "whatsapp",
    channelLabel: "WhatsApp",
    clientName: "Мария",
    contact: "+7 (911) 320-44-19",
    createdAt: "17.06.2026 11:06",
    id: "2",
    intent: "Уточнение по SPA-программе",
    result: "Ожидает подтверждения свободных слотов от команды SPA",
    status: "processing",
    topic: "consultation",
    topicLabel: "Консультация",
    type: "chat",
    typeLabel: "Чат",
  },
  {
    channel: "telegram",
    channelLabel: "Telegram",
    clientName: "Дмитрий",
    contact: "+7 (999) 106-77-24",
    createdAt: "17.06.2026 10:47",
    id: "3",
    intent: "Перевод на менеджера по корпоративному заезду",
    result: "Передано менеджеру, ожидается обратная связь",
    status: "processing",
    topic: "manager-transfer",
    topicLabel: "Перевод на менеджера",
    type: "chat",
    typeLabel: "Чат",
  },
  {
    channel: "telephone",
    channelLabel: "Телефон",
    clientName: "Алексей",
    contact: "+7 (812) 600-10-08",
    createdAt: "17.06.2026 10:05",
    id: "4",
    intent: "Повторный звонок по семейному размещению",
    result: "Звонок пропущен, создан callback для менеджера",
    status: "problem",
    topic: "consultation",
    topicLabel: "Прочее",
    type: "call",
    typeLabel: "Звонок",
  },
  {
    channel: "site",
    channelLabel: "Сайт",
    clientName: "Ольга",
    contact: "+7 (900) 123-45-67",
    createdAt: "17.06.2026 09:51",
    id: "5",
    intent: "Вопрос по раннему заезду",
    result: "Отправлены условия раннего заезда и доплата",
    status: "completed",
    topic: "consultation",
    topicLabel: "Консультация",
    type: "chat",
    typeLabel: "Чат",
  },
  {
    channel: "vk",
    channelLabel: "VK",
    clientName: "Ирина",
    contact: "+7 (901) 555-88-44",
    createdAt: "17.06.2026 09:18",
    id: "6",
    intent: "Запрос стоимости проживания на 5 ночей",
    result: "Подобраны категории номеров и отправлены цены",
    status: "completed",
    topic: "booking",
    topicLabel: "Бронирование",
    type: "chat",
    typeLabel: "Чат",
  },
] as const;

export const MOCK_REQUEST_DETAILS: Readonly<
  Record<string, MockRequestDetails>
> = {
  "1": {
    client: [
      { label: "Имя", value: "Анна" },
      { label: "Телефон", value: "+7 (921) 555-01-11" },
      { label: "Канал", value: "Телефон" },
      { label: "Намерение", value: "Бронирование на выходные" },
      { label: "Статус", value: "Выполнено" },
      { label: "Срок", value: "—" },
      { label: "Дата создания", value: "19.06.2026 06:53" },
    ],
    collected: [
      { label: "Заезд", value: "26.06.2026" },
      { label: "Выезд", value: "28.06.2026" },
      { label: "Кол-во взрослых", value: "2" },
      { label: "Кол-во детей", value: "0" },
      { label: "Тип номера", value: "Коттедж с террасой" },
      {
        label: "Доп. услуги",
        value: "SPA-доступ, поздний выезд, завтрак в номер",
      },
    ],
    deadline: "—",
    managerTask: "Подготовить расчёт и отправить гостю на почту",
    outcome: "Создана заявка и отправлен расчёт на почту",
    transcript: [
      { author: "manager", text: "Добрый день, ALSMA, слушаю вас." },
      {
        author: "guest",
        text: "Добрый день, хочу приехать на выходные и посмотреть коттедж на двоих.",
      },
      { author: "manager", text: "Подскажите даты?" },
      {
        author: "guest",
        text: "С 26 по 28 июня. Интересует ещё SPA и поздний выезд.",
      },
      {
        author: "manager",
        text: "Зафиксировала, подготовлю расчёт и отправлю на почту.",
      },
    ],
  },
  "2": {
    client: [
      { label: "Имя", value: "Ирина" },
      { label: "Телефон", value: "+7 (911) 320-44-19" },
      { label: "Канал", value: "WhatsApp" },
      { label: "Намерение", value: "Уточнение по SPA-программе" },
      { label: "Статус", value: "В работе" },
      { label: "Срок", value: "—" },
      { label: "Дата создания", value: "19.06.2026 06:53" },
    ],
    collected: [
      { label: "Заезд", value: "03.07.2026" },
      { label: "Выезд", value: "06.07.2026" },
      { label: "Кол-во взрослых", value: "1" },
      { label: "Кол-во детей", value: "0" },
      { label: "Тип номера", value: "SPA-люкс" },
      {
        label: "Доп. услуги",
        value: "Массаж, термальная зона, консультация врача",
      },
    ],
    deadline: "—",
    managerLabel: "ALSMA",
    managerTask: "Проверить свободные слоты у SPA-команды",
    outcome: "Ожидает подтверждения свободных слотов от команды SPA",
    transcript: [
      {
        author: "guest",
        text: "Здравствуйте! Подскажите, что входит в программу восстановления?",
      },
      {
        author: "manager",
        text: "Добрый день! Уточняю для вас состав программы и доступные слоты.",
      },
      { author: "guest", text: "Меня интересуют даты с 3 по 6 июля." },
      {
        author: "manager",
        text: "Принято, вернусь с подтверждением после проверки у SPA-команды.",
      },
    ],
  },
};

export const REQUEST_STATUS_LABELS: Record<MockRequestStatus, string> = {
  completed: "Выполнено",
  problem: "Проблема",
  processing: "В работе",
};

export const REQUEST_STATUS_OPTIONS = [
  { label: "Все статусы", value: "all" },
  { label: "Проблема / пропущен", value: "problem" },
  { label: "В работе / не закончен", value: "processing" },
  { label: "Выполнено", value: "completed" },
] as const;

export const REQUEST_TYPE_OPTIONS = [
  { label: "Все", value: "all" },
  { label: "Звонок", value: "call" },
  { label: "Чат", value: "chat" },
] as const;

export const REQUEST_TOPIC_OPTIONS = [
  { label: "Все темы", value: "all" },
  { label: "Бронирование", value: "booking" },
  { label: "Консультация", value: "consultation" },
  { label: "Перевод на менеджера", value: "manager-transfer" },
] as const;

export const REQUEST_CHANNEL_OPTIONS = [
  { label: "Все каналы", value: "all" },
  { label: "Телефон", value: "telephone" },
  { label: "WhatsApp", value: "whatsapp" },
  { label: "Telegram", value: "telegram" },
  { label: "Сайт", value: "site" },
  { label: "VK", value: "vk" },
] as const;
