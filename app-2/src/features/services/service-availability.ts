import type { PrismaClient } from "../../generated/prisma/client.js";

export const WORKDAY_START_MINUTE = 9 * 60;
export const WORKDAY_END_MINUTE = 21 * 60;
const SLOT_STEP_MINUTE = 30;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const isProductVariant = (variantName: string) =>
  variantName.trim().toLocaleLowerCase("ru-RU") === "товар";

const toUtcDate = (date: string, minute: number) =>
  new Date(
    `${date}T${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}:00.000Z`,
  );

const getDateRange = (date: string) => ({
  from: toUtcDate(date, 0),
  to: toUtcDate(date, 24 * 60 - 1),
});

const isValidDate = (date: string) => {
  if (!datePattern.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
};

type AvailabilityVariant = {
  readonly id: string;
  readonly serviceId: string;
  readonly capacity: number;
  readonly durationMin: number | null;
};

export const listServiceAvailability = async (
  database: PrismaClient,
  serviceId: string,
  variant: AvailabilityVariant,
  date: string,
  quantity = 1,
) => {
  if (!isValidDate(date)) return [];
  const duration = variant.durationMin ?? 60;
  if (duration <= 0) return [];
  const { from, to } = getDateRange(date);
  const blocks = await database.serviceScheduleBlock.findMany({
    where: {
      serviceId,
      OR: [{ variantId: variant.id }, { variantId: null }],
      startsAt: { lt: toUtcDate(date, WORKDAY_END_MINUTE) },
      endsAt: { gt: from },
    },
  });
  const bookings = await database.serviceBooking.findMany({
    where: {
      serviceId,
      variantId: variant.id,
      startsAt: { lt: toUtcDate(date, WORKDAY_END_MINUTE) },
      endsAt: { gt: from },
      status: { not: "cancelled" },
    },
    include: { orderItem: { select: { quantity: true } } },
  });
  const hasBlocks = blocks.length > 0;
  const slots: Array<{ startsAt: string; endsAt: string }> = [];
  for (
    let minute = WORKDAY_START_MINUTE;
    minute + duration <= WORKDAY_END_MINUTE;
    minute += SLOT_STEP_MINUTE
  ) {
    const startsAt = toUtcDate(date, minute);
    const endsAt = toUtcDate(date, minute + duration);
    const matchingBlocks = blocks.filter(
      (block) => block.startsAt <= startsAt && block.endsAt >= endsAt,
    );
    if (hasBlocks && !matchingBlocks.length) continue;
    const capacity = hasBlocks
      ? Math.min(
          variant.capacity,
          ...matchingBlocks.map((block) => block.capacity),
        )
      : variant.capacity;
    const booked = bookings
      .filter(
        (booking) => booking.startsAt < endsAt && booking.endsAt > startsAt,
      )
      .reduce((sum, booking) => sum + booking.orderItem.quantity, 0);
    if (booked + quantity > capacity) continue;
    slots.push({
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    });
  }
  return slots;
};

export const isServiceSlotAvailable = async (
  database: PrismaClient,
  serviceId: string,
  variant: AvailabilityVariant,
  startsAt: Date,
  quantity: number,
) => {
  const date = startsAt.toISOString().slice(0, 10);
  const slots = await listServiceAvailability(
    database,
    serviceId,
    variant,
    date,
    quantity,
  );
  return slots.some(
    (slot) => new Date(slot.startsAt).getTime() === startsAt.getTime(),
  );
};
