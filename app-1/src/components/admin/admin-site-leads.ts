import type { SiteLead } from "@/lib/admin/admin-api";

const PAGE_LABELS: Readonly<Record<string, string>> = {
  about: "О нас",
  "all-inclusive": "Всё включено",
  celebrations: "Торжества",
  entertainment: "Развлечения",
  "hardware-procedures": "Аппаратные процедуры",
  home: "Главная",
  news: "Новости",
  offers: "Акции",
  rooms: "Номера",
  spa: "SPA",
};

export const getLeadPageLabel = (sourcePage: string) =>
  PAGE_LABELS[sourcePage] ?? sourcePage;

export const formatLeadDate = (value: string) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));

export const getLeadDetailsSummary = (lead: SiteLead) => {
  const { checkInDate, checkOutDate, comment, guestsCount } = lead.details;
  if (checkInDate || checkOutDate) {
    return [
      [checkInDate, checkOutDate].filter(Boolean).join(" — "),
      guestsCount ? `${guestsCount} гост.` : "",
    ]
      .filter(Boolean)
      .join(", ");
  }
  return comment || "Заявка отправлена без дополнительного комментария";
};
