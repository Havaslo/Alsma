import type { Database } from "../../lib/database/database.js";

type EventRecord = Record<string, unknown>;

export type PublishedVoiceEvent = {
  readonly bookingCta?: string;
  readonly category?: string;
  readonly description?: string;
  readonly endDate?: string;
  readonly startDate?: string;
  readonly title: string;
};

const asRecord = (value: unknown): EventRecord | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as EventRecord)
    : null;

const asText = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const getItems = (content: unknown): EventRecord[] => {
  const record = asRecord(content);
  return Array.isArray(record?.items)
    ? record.items
        .map(asRecord)
        .filter((item): item is EventRecord => Boolean(item))
    : [];
};

const isRelevant = (event: EventRecord, today: string) => {
  if (event.isActive === false) return false;
  const expiration = asText(event.endDate) ?? asText(event.startDate);
  return !expiration || expiration >= today;
};

const toEvent = (event: EventRecord): PublishedVoiceEvent | null => {
  const title = asText(event.title);
  if (!title) return null;
  const buttonText = asText(event.buttonText);
  const buttonLink = asText(event.buttonLink);
  return {
    title,
    startDate: asText(event.startDate),
    endDate: asText(event.endDate),
    category: asText(event.tag),
    description: asText(event.description),
    bookingCta: buttonText
      ? `${buttonText}${buttonLink ? ` (${buttonLink})` : ""}`
      : undefined,
  };
};

export const listPublishedEvents = async (
  database: Database,
  date?: string,
): Promise<PublishedVoiceEvent[]> => {
  const item = await database.client.siteContent.findFirst({
    where: { itemKey: "events", section: "offers", status: "published" },
  });
  const today = new Date().toISOString().slice(0, 10);
  return getItems(item?.content)
    .filter((event) => isRelevant(event, today))
    .map(toEvent)
    .filter((event): event is PublishedVoiceEvent => Boolean(event))
    .filter((event) => {
      if (!date) return true;
      if (event.startDate && date < event.startDate) return false;
      return !event.endDate || date <= event.endDate;
    })
    .sort((left, right) =>
      (left.startDate ?? "9999-12-31").localeCompare(
        right.startDate ?? "9999-12-31",
      ),
    );
};

const formatDateRange = (event: PublishedVoiceEvent) =>
  [event.startDate, event.endDate].filter(Boolean).join(" — ");

export const formatEventsContext = (events: PublishedVoiceEvent[]) =>
  events
    .slice(0, 20)
    .map((event) =>
      [
        event.title,
        formatDateRange(event) && `даты: ${formatDateRange(event)}`,
        event.category && `категория: ${event.category}`,
        event.description,
        event.bookingCta && `CTA: ${event.bookingCta}`,
      ]
        .filter(Boolean)
        .join("; "),
    )
    .join("\n");

export const loadPublishedEventsContext = async (
  database: Database,
  date?: string,
) => formatEventsContext(await listPublishedEvents(database, date));
