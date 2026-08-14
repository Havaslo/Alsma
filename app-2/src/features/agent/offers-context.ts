import type { Database } from "../../lib/database/database.js";

type OfferRecord = Record<string, unknown>;

const asRecord = (value: unknown): OfferRecord | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as OfferRecord)
    : null;

const asRecords = (value: unknown) =>
  Array.isArray(value)
    ? value.map(asRecord).filter((item): item is OfferRecord => Boolean(item))
    : [];

const isCurrent = (offer: OfferRecord, today: string) =>
  offer.isActive !== false &&
  (typeof offer.endDate !== "string" || offer.endDate >= today);

const formatOffer = (offer: OfferRecord) => {
  const fields = [
    ["Название", offer.title],
    ["Метка", offer.tag],
    ["Описание", offer.description],
    ["Цена", offer.price],
    ["Дата", offer.date],
    ["Начало", offer.startDate],
    ["Окончание", offer.endDate],
    ["Состав", Array.isArray(offer.items) ? offer.items.join(", ") : undefined],
    ["Теги", Array.isArray(offer.tags) ? offer.tags.join(", ") : undefined],
  ] as const;
  return fields
    .filter(([, value]) => typeof value === "string" && value.trim())
    .map(([label, value]) => `${label}: ${value}`)
    .join("; ");
};

const fallbackOffers = [
  "Действующие предложения: Wellness-уикенд с диагностикой — выходные с термальной зоной, авторскими ритуалами и проживанием.",
  "Действующие предложения: Романтический побег — романтический формат с ужином, поздним выездом и приватным wellness-сценарием.",
  "Действующие предложения: Семейные каникулы — проживание, прогулки, активности и загородный отдых для всей семьи.",
  "Действующие предложения: Длительное проживание — особые условия и привилегии при отдыхе от пяти ночей.",
];

export const loadPublishedOffersContext = async (database: Database) => {
  const items = await database.client.siteContent.findMany({
    orderBy: { position: "asc" },
    where: { section: "offers", status: "published" },
  });
  const today = new Date().toISOString().slice(0, 10);
  const records = items.flatMap((item) => {
    const content = asRecord(item.content);
    if (!content) return [];
    const collection =
      item.itemKey === "proposals"
        ? "Действующие предложения"
        : item.itemKey === "ready-scenarios"
          ? "Готовые сценарии"
          : item.itemKey === "events"
            ? "Ближайшие мероприятия"
            : "";
    if (!collection) return [];
    return asRecords(content.items)
      .filter((offer) => isCurrent(offer, today))
      .map((offer) => `${collection}: ${formatOffer(offer)}`);
  });
  return records.filter(Boolean).join("\n") || fallbackOffers.join("\n");
};
