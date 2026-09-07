export const SERVICE_TIME_ZONE = "Europe/Moscow";

export const serviceToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: SERVICE_TIME_ZONE,
  }).format(new Date());

export const isServiceSlotPast = (date: string, minutes: number) => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: SERVICE_TIME_ZONE,
  }).formatToParts(now);
  const value = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const today = `${value("year")}-${String(value("month")).padStart(2, "0")}-${String(value("day")).padStart(2, "0")}`;
  return (
    date < today ||
    (date === today && minutes <= value("hour") * 60 + value("minute"))
  );
};

export const formatServiceDateTime = (value: string) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: SERVICE_TIME_ZONE,
  }).format(new Date(value));

export const formatServiceTime = (value: string) =>
  new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: SERVICE_TIME_ZONE,
  }).format(new Date(value));

export const serviceDateKey = (value: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: SERVICE_TIME_ZONE,
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
};

/** Convert a Moscow wall-clock slot to the instant persisted by the API. */
export const serviceSlotDate = (date: string, minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return new Date(
    `${date}T${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}:00+03:00`,
  );
};
