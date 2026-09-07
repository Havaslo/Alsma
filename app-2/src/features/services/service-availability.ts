import type { PrismaClient } from "../../generated/prisma/client.js";

type AdvisoryLockExecutor = Pick<PrismaClient, "$queryRaw">;

export const WORKDAY_START_MINUTE = 8 * 60;
export const WORKDAY_END_MINUTE = 22 * 60;
// Service schedules are entered as Moscow wall-clock times. Persist their
// corresponding instants so every client can render the same local time.
const SERVICE_TIME_ZONE_OFFSET_MINUTE = 3 * 60;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const isProductVariant = (variantName: string) =>
  variantName.trim().toLocaleLowerCase("ru-RU") === "товар";

/** Serialize writes that could consume the same resource (or capacity slot). */
export const lockServiceAvailability = async (
  database: AdvisoryLockExecutor,
  serviceId: string,
  variant: Pick<AvailabilityVariant, "id" | "resources">,
) => {
  const resourceIds = [...(variant.resources ?? [])]
    .map((resource) => resource.resourceId)
    .sort();
  const lockKeys = resourceIds.length
    ? resourceIds.map((resourceId) => `service-resource:${resourceId}`)
    : [`service-capacity:${serviceId}:${variant.id}`];
  for (const lockKey of lockKeys) {
    // Prisma's pg adapter cannot deserialize PostgreSQL's `void` result.
    // Keep the lock in the transaction while returning a scalar value.
    await database.$queryRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0)) IS NULL AS locked
    `;
  }
};

const toUtcDate = (date: string, minute: number) => {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCMinutes(minute - SERVICE_TIME_ZONE_OFFSET_MINUTE);
  return value;
};

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

const moscowDateTime = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Europe/Moscow",
  }).formatToParts(new Date());
  const value = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    date: `${value("year")}-${String(value("month")).padStart(2, "0")}-${String(value("day")).padStart(2, "0")}`,
    minute: value("hour") * 60 + value("minute"),
  };
};

export const isServiceSlotInThePast = (date: string, minute: number) => {
  const now = moscowDateTime();
  return date < now.date || (date === now.date && minute <= now.minute);
};

type AvailabilityVariant = {
  readonly id: string;
  readonly serviceId: string;
  readonly capacity: number;
  readonly durationMin: number | null;
  readonly resources?: readonly {
    resourceId: string;
    quantity: number;
    resource: { totalUnits: number };
  }[];
};

export type ServiceAvailabilitySlot = {
  startsAt: string;
  endsAt: string;
};

export type ServiceAvailabilityDetails = {
  available: ServiceAvailabilitySlot[];
  occupied: ServiceAvailabilitySlot[];
};

export const listServiceAvailabilityDetails = async (
  database: PrismaClient,
  serviceId: string,
  variant: AvailabilityVariant,
  date: string,
  quantity = 1,
): Promise<ServiceAvailabilityDetails> => {
  if (!isValidDate(date)) return { available: [], occupied: [] };
  const duration = variant.durationMin ?? 60;
  if (duration <= 0) return { available: [], occupied: [] };
  const { from, to } = getDateRange(date);
  const blocks = await database.serviceScheduleBlock.findMany({
    where: {
      serviceId,
      OR: [{ variantId: variant.id }, { variantId: null }],
      startsAt: { lt: toUtcDate(date, WORKDAY_END_MINUTE) },
      endsAt: { gt: from },
    },
  });
  const resourceIds = (variant.resources ?? []).map(
    (assigned) => assigned.resourceId,
  );
  const bookings = await database.serviceBooking.findMany({
    where: {
      ...(resourceIds.length
        ? {
            variant: {
              resources: { some: { resourceId: { in: resourceIds } } },
            },
          }
        : { serviceId, variantId: variant.id }),
      startsAt: { lt: toUtcDate(date, WORKDAY_END_MINUTE) },
      endsAt: { gt: from },
      status: { not: "cancelled" },
    },
    include: {
      orderItem: { select: { quantity: true } },
      variant: {
        include: {
          resources: {
            include: { resource: { select: { totalUnits: true } } },
          },
        },
      },
    },
  });
  const hasBlocks = blocks.length > 0;
  const available: ServiceAvailabilitySlot[] = [];
  const occupied: ServiceAvailabilitySlot[] = [];
  for (
    let minute = WORKDAY_START_MINUTE;
    minute + duration <= WORKDAY_END_MINUTE;
    minute += duration
  ) {
    const startsAt = toUtcDate(date, minute);
    const endsAt = toUtcDate(date, minute + duration);
    const matchingBlocks = blocks.filter(
      (block) => block.startsAt <= startsAt && block.endsAt >= endsAt,
    );
    if (hasBlocks && !matchingBlocks.length) continue;
    const hasResources = (variant.resources?.length ?? 0) > 0;
    const capacity = hasResources
      ? Number.POSITIVE_INFINITY
      : hasBlocks
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
    const capacityUnavailable = booked + quantity > capacity;
    const resourceUnavailable = (variant.resources ?? []).some((assigned) => {
      const used = bookings.reduce((sum, booking) => {
        if (!(booking.startsAt < endsAt && booking.endsAt > startsAt))
          return sum;
        const usage = booking.variant.resources.find(
          (item) => item.resourceId === assigned.resourceId,
        );
        return sum + (usage?.quantity ?? 0) * booking.orderItem.quantity;
      }, 0);
      return used + assigned.quantity * quantity > assigned.resource.totalUnits;
    });
    const slot = {
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    };
    if (
      isServiceSlotInThePast(date, minute) ||
      capacityUnavailable ||
      resourceUnavailable
    )
      occupied.push(slot);
    else available.push(slot);
  }
  return { available, occupied };
};

export const listServiceAvailability = async (
  database: PrismaClient,
  serviceId: string,
  variant: AvailabilityVariant,
  date: string,
  quantity = 1,
) => {
  const details = await listServiceAvailabilityDetails(
    database,
    serviceId,
    variant,
    date,
    quantity,
  );
  return details.available;
};

export const isServiceSlotAvailable = async (
  database: PrismaClient,
  serviceId: string,
  variant: AvailabilityVariant,
  startsAt: Date,
  quantity: number,
) => {
  const date = startsAt.toISOString().slice(0, 10);
  const minute =
    startsAt.getUTCHours() * 60 +
    startsAt.getUTCMinutes() +
    SERVICE_TIME_ZONE_OFFSET_MINUTE;
  if (isServiceSlotInThePast(date, minute)) return false;
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
