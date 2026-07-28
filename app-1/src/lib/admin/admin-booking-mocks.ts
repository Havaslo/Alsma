export type MockBookingPayment = "paid" | "partial" | "pending";
export type MockBookingSource = "ai-agent" | "site" | "vk" | "whatsapp";
export type MockBookingStatus =
  "confirmed" | "new" | "pending-confirmation" | "selection";

export type MockBookingRequest = {
  readonly checkInDate: string;
  readonly checkOutDate: string;
  readonly createdBy: string;
  readonly email: string;
  readonly guestName: string;
  readonly guestsCount: number;
  readonly id: string;
  readonly linkedIntent: string;
  readonly linkedRequestId: string;
  readonly note: string;
  readonly payment: MockBookingPayment;
  readonly phone: string;
  readonly roomName: string;
  readonly source: MockBookingSource;
  readonly sourceLabel: string;
  readonly status: MockBookingStatus;
};

export type MockBookingDraft = Pick<
  MockBookingRequest,
  | "checkInDate"
  | "checkOutDate"
  | "email"
  | "guestName"
  | "guestsCount"
  | "note"
  | "phone"
  | "roomName"
  | "source"
>;

export const MOCK_BOOKINGS: readonly MockBookingRequest[] = [
  {
    checkInDate: "03.07.2026",
    checkOutDate: "06.07.2026",
    createdBy: "Ольга Соколова",
    email: "irina.sm@example.com",
    guestName: "Ирина Смирнова",
    guestsCount: 1,
    id: "booking-1",
    linkedIntent: "Уточнение по SPA-программе",
    linkedRequestId: "2",
    note: "Ждёт подтверждение слота от SPA-команды.",
    payment: "paid",
    phone: "+7 (911) 320-44-19",
    roomName: "SPA-люкс",
    source: "whatsapp",
    sourceLabel: "WhatsApp",
    status: "selection",
  },
  {
    checkInDate: "26.06.2026",
    checkOutDate: "28.06.2026",
    createdBy: "AI-агент",
    email: "anna.petrowa@example.com",
    guestName: "Анна Петрова",
    guestsCount: 2,
    id: "booking-2",
    linkedIntent: "Бронирование на выходные",
    linkedRequestId: "1",
    note: "Гость просил поздний выезд и завтрак в номер.",
    payment: "pending",
    phone: "+7 (921) 555-01-11",
    roomName: "Коттедж с террасой",
    source: "ai-agent",
    sourceLabel: "AI-агент",
    status: "new",
  },
  {
    checkInDate: "11.07.2026",
    checkOutDate: "13.07.2026",
    createdBy: "Наталья Федосеева",
    email: "maria.klimova@example.com",
    guestName: "Мария Климова",
    guestsCount: 3,
    id: "booking-3",
    linkedIntent: "Вопрос по раннему заезду",
    linkedRequestId: "5",
    note: "Согласован ранний заезд, нужна доплата на месте.",
    payment: "partial",
    phone: "+7 (900) 123-45-67",
    roomName: "Стандарт с ранним заездом",
    source: "site",
    sourceLabel: "Сайт",
    status: "pending-confirmation",
  },
  {
    checkInDate: "02.08.2026",
    checkOutDate: "07.08.2026",
    createdBy: "AI-агент",
    email: "ek.voronova@example.com",
    guestName: "Екатерина Воронова",
    guestsCount: 4,
    id: "booking-4",
    linkedIntent: "Запрос стоимости проживания на 5 ночей",
    linkedRequestId: "6",
    note: "Подключить детскую анимацию и all inclusive.",
    payment: "paid",
    phone: "+7 (901) 555-88-44",
    roomName: "Семейный номер",
    source: "vk",
    sourceLabel: "VK",
    status: "confirmed",
  },
] as const;

export const BOOKING_PAYMENT_LABELS: Record<MockBookingPayment, string> = {
  paid: "Оплачено",
  partial: "Частично оплачено",
  pending: "Ожидает оплаты",
};

export const BOOKING_STATUS_LABELS: Record<MockBookingStatus, string> = {
  confirmed: "Подтверждена",
  new: "Новый лид",
  "pending-confirmation": "Ожидает подтверждение",
  selection: "Подбор варианта",
};

export const BOOKING_SOURCE_OPTIONS = [
  { label: "Все источники", value: "all" },
  { label: "WhatsApp", value: "whatsapp" },
  { label: "AI-агент", value: "ai-agent" },
  { label: "Сайт", value: "site" },
  { label: "VK", value: "vk" },
] as const;

export const BOOKING_FORM_SOURCE_OPTIONS = [
  { label: "WhatsApp", value: "whatsapp" },
  { label: "AI-агент", value: "ai-agent" },
  { label: "Сайт", value: "site" },
  { label: "VK", value: "vk" },
] as const;

export const BOOKING_STATUS_OPTIONS = [
  { label: "Все статусы заявки", value: "all" },
  { label: "Подбор варианта", value: "selection" },
  { label: "Новый лид", value: "new" },
  { label: "Ожидает подтверждение", value: "pending-confirmation" },
  { label: "Подтверждена", value: "confirmed" },
] as const;
