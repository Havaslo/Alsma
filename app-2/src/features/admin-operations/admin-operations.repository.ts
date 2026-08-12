import type { Database } from "../../lib/database/database.js";
import { getPaginationRange } from "../../lib/http/pagination.js";
import type {
  AdminOperationsQuery,
  CreateBookingBody,
  UpdateBonusBody,
  UpdateClientBody,
  UpdateRequestStatusBody,
} from "./admin-operations.schemas.js";

const clientSource = (
  bookings: readonly { epteraReservationId: string | null }[],
) =>
  bookings.some((booking) => Boolean(booking.epteraReservationId))
    ? "Eptera"
    : "Личный кабинет";

export const createAdminOperationsRepository = (database: Database) => ({
  listNotifications: async () => {
    const [leads, requests, bookings] = await Promise.all([
      database.client.siteLead.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      database.client.adminRequest.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      database.client.bookingRequest.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);
    const items = [
      ...leads.map((item) => ({
        id: `lead:${item.id}`,
        entityId: item.id,
        type: "lead" as const,
        title: item.formTitle,
        description:
          item.name ?? item.phone ?? item.email ?? "Новая заявка сайта",
        status: item.status,
        createdAt: item.createdAt,
      })),
      ...requests.map((item) => ({
        id: `request:${item.id}`,
        entityId: item.id,
        type: "request" as const,
        title: item.title,
        description:
          item.requester ??
          item.contact ??
          item.description ??
          "Новое обращение",
        status: item.status,
        createdAt: item.createdAt,
      })),
      ...bookings.map((item) => ({
        id: `booking:${item.id}`,
        entityId: item.id,
        type: "booking" as const,
        title: "Новая заявка на бронирование",
        description: item.guestName,
        status: item.status,
        createdAt: item.createdAt,
      })),
    ]
      .sort(
        (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
      )
      .slice(0, 30);
    return {
      items,
      unreadCount: items.filter((item) => item.status === "new").length,
    };
  },
  createBooking: (input: CreateBookingBody) =>
    database.client.bookingRequest.create({ data: input }),
  deleteClient: (recordId: string) =>
    database.client.guestUser.delete({ where: { id: recordId } }),
  listBookings: async (query: AdminOperationsQuery) => {
    const { skip, take } = getPaginationRange(query);
    const [items, total] = await database.client.$transaction([
      database.client.bookingRequest.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      database.client.bookingRequest.count(),
    ]);
    return { items, total };
  },
  listClients: async (query: AdminOperationsQuery) => {
    const { skip, take } = getPaginationRange(query);
    const [items, total] = await database.client.$transaction([
      database.client.guestUser.findMany({
        include: {
          bonusProgram: true,
          bookings: { select: { epteraReservationId: true } },
          _count: { select: { bookings: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      database.client.guestUser.count(),
    ]);
    return {
      items: items.map(({ bookings, ...client }) => ({
        ...client,
        source: clientSource(bookings),
      })),
      total,
    };
  },
  getClient: async (recordId: string) => {
    const client = await database.client.guestUser.findUnique({
      include: {
        bonusProgram: true,
        bookings: { orderBy: { checkInDate: "desc" } },
        _count: { select: { bookings: true } },
      },
      where: { id: recordId },
    });
    return client ? { ...client, source: clientSource(client.bookings) } : null;
  },
  listRequests: async (query: AdminOperationsQuery) => {
    const { skip, take } = getPaginationRange(query);
    const [items, total] = await database.client.$transaction([
      database.client.adminRequest.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      database.client.adminRequest.count(),
    ]);
    return { items, total };
  },
  listTasks: async (query: AdminOperationsQuery) => {
    const { skip, take } = getPaginationRange(query);
    const [items, total] = await database.client.$transaction([
      database.client.managerTask.findMany({
        include: { assignee: { select: { displayName: true, id: true } } },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        skip,
        take,
      }),
      database.client.managerTask.count(),
    ]);
    return { items, total };
  },
  completeTask: (recordId: string) =>
    database.client.managerTask.update({
      data: { completedAt: new Date(), status: "completed" },
      where: { id: recordId },
    }),
  markBookingPaid: (recordId: string) =>
    database.client.bookingRequest.update({
      data: { paidAt: new Date(), status: "completed" },
      where: { id: recordId },
    }),
  updateBonus: (recordId: string, input: UpdateBonusBody) =>
    database.client.guestBonusProgram.upsert({
      create: { ...input, userId: recordId },
      update: input,
      where: { userId: recordId },
    }),
  updateClient: (recordId: string, input: UpdateClientBody) =>
    database.client.guestUser.update({
      data: {
        email: input.email,
        fullName: input.fullName,
        phone: input.phone || `email:${input.email}`,
      },
      where: { id: recordId },
    }),
  updateRequest: (recordId: string, input: UpdateRequestStatusBody) =>
    database.client.adminRequest.update({
      data: input,
      where: { id: recordId },
    }),
});

export type AdminOperationsRepository = ReturnType<
  typeof createAdminOperationsRepository
>;
