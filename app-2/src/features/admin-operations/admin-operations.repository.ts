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
  getAnalytics: async (start: Date, end: Date) => {
    const range = { gte: start, lt: end } as const;
    const days = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / 86_400_000),
    );
    const bucket = (date: Date) =>
      Math.min(
        days - 1,
        Math.max(
          0,
          Math.floor((date.getTime() - start.getTime()) / 86_400_000),
        ),
      );
    const [requests, messages, leads, bookings, paidBookings, tasks] =
      await Promise.all([
        database.client.adminRequest.findMany({
          where: { createdAt: range },
          select: { createdAt: true, status: true, details: true },
        }),
        database.client.chatMessage.findMany({
          where: { createdAt: range },
          select: { author: true, createdAt: true },
        }),
        database.client.siteLead.findMany({
          where: { createdAt: range },
          select: { createdAt: true },
        }),
        database.client.bookingRequest.findMany({
          where: { createdAt: range },
          select: { createdAt: true, status: true, amount: true },
        }),
        database.client.guestBooking.findMany({
          where: { createdAt: range },
          select: { createdAt: true, paymentStatus: true, paymentAmount: true },
        }),
        database.client.managerTask.findMany({
          where: { createdAt: range },
          select: { createdAt: true },
        }),
      ]);
    const contacts = Array.from({ length: days }, () => 0);
    const aiHandled = Array.from({ length: days }, () => 0);
    const bookingColumns = Array.from({ length: 5 }, () => 0);
    const revenue = Array.from({ length: days }, () => 0);
    for (const item of requests) contacts[bucket(item.createdAt)]! += 1;
    for (const item of leads) contacts[bucket(item.createdAt)]! += 1;
    for (const item of messages) {
      if (item.author === "agent") aiHandled[bucket(item.createdAt)]! += 1;
    }
    for (const item of bookings) {
      bookingColumns[
        Math.min(4, Math.floor((item.createdAt.getHours() / 24) * 5))
      ]! += 1;
      if (item.status === "completed")
        revenue[bucket(item.createdAt)]! += Number(item.amount ?? 0);
    }
    for (const item of paidBookings) {
      if (item.paymentStatus === "succeeded")
        revenue[bucket(item.createdAt)]! += Number(item.paymentAmount ?? 0);
    }
    // Analytics intentionally has a closed channel vocabulary. Legacy sources
    // (and malformed/unknown details) must not leak into the dashboard or
    // inflate the denominator used by its percentages.
    const channelCounts = new Map([
      ["Звонки", 0],
      ["MAX", 0],
      ["VK", 0],
      ["Сайт", 0],
    ]);
    for (const item of requests) {
      const details = item.details;
      const source =
        details && typeof details === "object" && !Array.isArray(details)
          ? String((details as Record<string, unknown>).source ?? "Другое")
          : "Другое";
      const normalizedSource = source.trim().toLocaleLowerCase("ru-RU");
      const channel =
        normalizedSource === "телефон" ||
        normalizedSource === "звонки" ||
        normalizedSource === "звонок" ||
        normalizedSource === "voice"
          ? "Звонки"
          : normalizedSource === "сайт" ||
              normalizedSource === "чат на сайте" ||
              normalizedSource === "site" ||
              normalizedSource === "website"
            ? "Сайт"
            : normalizedSource === "max"
              ? "MAX"
              : normalizedSource === "vk" || normalizedSource === "вконтакте"
                ? "VK"
                : null;
      if (channel) channelCounts.set(channel, channelCounts.get(channel)! + 1);
    }
    const statusCounts = ["new", "processing", "completed", "cancelled"].map(
      (status) => requests.filter((item) => item.status === status).length,
    );
    return {
      aiHandled,
      aiMaximum: Math.max(1, ...aiHandled),
      bookingColumns,
      channelCounts: [
        channelCounts.get("Звонки") ?? 0,
        channelCounts.get("MAX") ?? 0,
        channelCounts.get("VK") ?? 0,
        channelCounts.get("Сайт") ?? 0,
      ],
      contacts,
      contactsMaximum: Math.max(1, ...contacts),
      funnelCounts: [requests.length, leads.length, bookings.length],
      incomingCalls: Array.from({ length: 9 }, () => 0),
      incomingMaximum: 1,
      managerTotal:
        tasks.length +
        messages.filter((item) => item.author === "manager").length,
      requestCounts: statusCounts,
      revenue,
      revenueMaximum: Math.max(1, ...revenue),
    };
  },
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
        include: { _count: { select: { chatMessages: true } } },
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
