const publishingTimeZone = "Europe/Moscow";

const formattedPart = (
  date: Date,
  type: Intl.DateTimeFormatPartTypes,
): string =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone: publishingTimeZone,
    year: "numeric",
  })
    .formatToParts(date)
    .find((part) => part.type === type)?.value ?? "";

export const getMoscowDateTime = (date: Date) => ({
  date: `${formattedPart(date, "year")}-${formattedPart(date, "month")}-${formattedPart(date, "day")}`,
  time: `${formattedPart(date, "hour")}:${formattedPart(date, "minute")}`,
});

export const isFutureInMoscow = (
  scheduledDate: string,
  scheduledTime: string,
  now: Date,
) => {
  const current = getMoscowDateTime(now);
  return (
    `${scheduledDate} ${scheduledTime}` > `${current.date} ${current.time}`
  );
};
