export type MockIntegrationStatus =
  "approval-required" | "awaiting-data" | "not-connected";

export type MockIntegrationField = {
  readonly id: string;
  readonly label: string;
};

export type MockIntegrationCheckbox = {
  readonly checked: boolean;
  readonly id: string;
  readonly label: string;
};

export type MockIntegrationSection = {
  readonly checkboxes?: readonly MockIntegrationCheckbox[];
  readonly description: string;
  readonly fields: readonly MockIntegrationField[];
  readonly footer?: string;
  readonly id: string;
  readonly status: MockIntegrationStatus;
  readonly title: string;
};

export const INTEGRATION_STATUS_LABELS: Record<MockIntegrationStatus, string> =
  {
    "approval-required": "Нужно согласование",
    "awaiting-data": "Ожидает данных",
    "not-connected": "Не подключено",
  };

export const MOCK_INTEGRATION_OVERVIEW = [
  {
    description:
      "Нужна для передачи заявок, статусов бронирования, доступности номеров и данных гостей между сайтом и PMS.",
    status: "not-connected",
    title: "PMS Eptera",
  },
  {
    description:
      "Канал для отправки уведомлений о новых заявках и ответов AI-агента в чате.",
    status: "awaiting-data",
    title: "MAX",
  },
  {
    description: "Канал для уведомлений и автоответов в сообщениях сообщества.",
    status: "awaiting-data",
    title: "ВКонтакте",
  },
  {
    description:
      "Подключение входящих звонков, маршрутизации, перевода на менеджера и запуска телефонного AI-агента.",
    status: "approval-required",
    title: "Телефония / голосовой агент",
  },
] as const satisfies readonly {
  readonly description: string;
  readonly status: MockIntegrationStatus;
  readonly title: string;
}[];

export const MOCK_INTEGRATION_SECTIONS: readonly MockIntegrationSection[] = [
  {
    description:
      "Нужна как центральная точка по бронированиям, доступности и статусам заявок.",
    fields: [
      { id: "eptera-api-url", label: "API URL или адрес шлюза Eptera" },
      { id: "eptera-client-id", label: "Client ID / API key" },
      { id: "eptera-secret", label: "Секретный ключ или токен доступа" },
      { id: "eptera-webhook", label: "Webhook URL для событий из PMS" },
      {
        id: "eptera-entities",
        label: "ID отеля / объекта / тарифов / категорий номеров",
      },
    ],
    footer:
      "После подключения сможем забирать статусы бронирований, свободные номера, тарифы и передавать заявки из сайта в PMS.",
    id: "eptera",
    status: "not-connected",
    title: "PMS Eptera",
  },
  {
    checkboxes: [
      {
        checked: true,
        id: "max-notifications",
        label: "Отправлять новые заявки в MAX",
      },
      {
        checked: true,
        id: "vk-notifications",
        label: "Отправлять новые заявки во ВКонтакте",
      },
      {
        checked: true,
        id: "ai-chat-replies",
        label: "Разрешить AI отвечать в чатах",
      },
      {
        checked: false,
        id: "manager-escalation",
        label: "Эскалация менеджеру при сложном вопросе",
      },
    ],
    description:
      "Для отправки уведомлений о новых заявках и работы чат-агентов.",
    fields: [
      { id: "messenger-token", label: "Токен бота или приложения" },
      { id: "messenger-channel", label: "ID сообщества / канала / бота" },
      { id: "messenger-webhook", label: "Webhook или callback URL" },
      {
        id: "messenger-permissions",
        label: "Разрешения на отправку и чтение сообщений",
      },
      {
        id: "messenger-test-chat",
        label: "Тестовый чат для проверки уведомлений",
      },
    ],
    id: "messengers",
    status: "awaiting-data",
    title: "MAX и ВКонтакте",
  },
  {
    description:
      "Чтобы автоответ по телефону принимал звонки, отвечал и переводил человека на менеджера.",
    fields: [
      {
        id: "telephony-provider",
        label: "Провайдер телефонии или SIP-шлюз",
      },
      {
        id: "telephony-credentials",
        label: "SIP-учётные данные или API-ключи",
      },
      {
        id: "telephony-numbers",
        label: "Номер(а), на которые приходят звонки",
      },
      {
        id: "telephony-routing",
        label: "Правила перевода на менеджеров",
      },
      {
        id: "telephony-test-scenario",
        label: "Тестовый сценарий звонка и рабочие часы",
      },
    ],
    id: "telephony",
    status: "approval-required",
    title: "Телефония и голосовой AI-агент",
  },
];

export const MOCK_INTEGRATION_FLOW = [
  "Подключаем PMS Eptera и получаем данные по номерам, бронированиям и статусам заявок.",
  "Настраиваем отправку новых заявок из сайта в нужные каналы: MAX и ВКонтакте.",
  "Подключаем чаты, чтобы AI-агент видел новые сообщения и мог отвечать автоматически.",
  "Подключаем телефонию, чтобы голосовой AI-агент принимал звонки, отвечал и переводил на менеджера.",
  "Проводим тесты: новая заявка, новое сообщение, входящий звонок, перевод на сотрудника.",
] as const;

export const MOCK_INTEGRATION_REQUIREMENTS = [
  "Доступы к Eptera: документация API, ключи, тестовый кабинет или контакты техподдержки.",
  "Доступ администратора к MAX и ВКонтакте для создания бота или подключения сообщества.",
  "Данные по телефонии: какой провайдер используется сейчас, есть ли SIP/API, какие номера подключаем.",
  "Список менеджеров и правила: куда отправлять заявки, кто принимает звонки, когда делать перевод на человека.",
  "Тексты и ограничения: что AI можно говорить, какие вопросы он должен переводить сразу менеджеру.",
] as const;
