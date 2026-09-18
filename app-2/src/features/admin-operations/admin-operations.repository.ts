import type { Database } from "../../lib/database/database.js";
import { getPaginationRange } from "../../lib/http/pagination.js";
import type {
  AdminOperationsQuery,
  CreateBookingBody,
  UpdateBonusBody,
  UpdateClientBody,
  UpdateRequestStatusBody,
} from "./admin-operations.schemas.js";

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
    const requests = await database.client.adminRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: { bookingRequests: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    const agentRequests = requests.filter((request) => {
      const details = request.details;
      const createdByAgent =
        details && typeof details === "object" && !Array.isArray(details)
          ? (details as Record<string, unknown>).agentRequestCreated === true ||
            (details as Record<string, unknown>).source === "AI-agent"
          : false;
      return (
        request.bookingRequests.length > 0 ||
        createdByAgent ||
        request.category === "AI-agent"
      );
    });
    const items = agentRequests.map((request) => {
      const booking = request.bookingRequests[0] ?? null;
      return {
        id: booking?.id ?? request.id,
        adminRequestId: request.id,
        adminRequest: {
          category: request.category,
          id: request.id,
          status: request.status,
          title: request.title,
        },
        guestName: booking?.guestName ?? request.requester ?? "Гость",
        phone: booking?.phone ?? request.contact ?? "",
        email: booking?.email ?? null,
        checkInDate: booking?.checkInDate ?? null,
        checkOutDate: booking?.checkOutDate ?? null,
        guestsCount: booking?.guestsCount ?? 0,
        roomName: booking?.roomName ?? null,
        status: booking?.status ?? request.status,
        createdAt: booking?.createdAt ?? request.createdAt,
        description: request.description,
      };
    });
    return { items: items.slice(skip, skip + take), total: items.length };
  },
  listClients: async (query: AdminOperationsQuery) => {
    const { skip, take } = getPaginationRange(query);
    const [items, total] = await database.client.$transaction([
      database.client.guestUser.findMany({
        include: {
          bonusProgram: true,
          _count: { select: { serviceOrders: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      database.client.guestUser.count(),
    ]);
    return {
      items: items.map((client) => ({
        ...client,
        source: "Сайт" as const,
      })),
      total,
    };
  },
  getClient: async (recordId: string) => {
    const client = await database.client.guestUser.findUnique({
      include: {
        bonusProgram: true,
        serviceOrders: {
          where: { paymentStatus: "succeeded" },
          orderBy: { createdAt: "desc" },
          include: { items: { include: { service: true, variant: true } } },
        },
        bookings: { orderBy: { checkInDate: "desc" } },
        _count: { select: { serviceOrders: true } },
      },
      where: { id: recordId },
    });
    return client ? { ...client, source: "Сайт" as const } : null;
  },
  listRequests: async (query: AdminOperationsQuery) => {
    const { skip, take } = getPaginationRange(query);
    // Voice calls have their own journal. Keep both the explicit call category
    // and legacy call-channel requests out of the Requests page at the query
    // boundary, before pagination is applied.
    const requestsWhere = {
      NOT: [
        { category: "voice-call" },
        { details: { path: ["channelType"], equals: "call" } },
      ],
    };
    const [items, total, setting] = await database.client.$transaction([
      database.client.adminRequest.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take,
        where: requestsWhere,
        include: { _count: { select: { chatMessages: true } } },
      }),
      database.client.adminRequest.count({ where: requestsWhere }),
      database.client.appSetting.findUnique({
        where: { key: "agent.settings" },
        select: { value: true },
      }),
    ]);
    const settings =
      setting?.value && typeof setting.value === "object"
        ? (setting.value as Record<string, unknown>)
        : {};
    const stopped = settings.enabled === false || settings.site === false;
    return {
      items: items.map((item) => ({
        ...item,
        agentStopped:
          stopped &&
          (item.details as Record<string, unknown> | null)?.source === "Сайт",
      })),
      total,
    };
  },
  listVoiceCalls: async (query: AdminOperationsQuery) => {
    const { skip, take } = getPaginationRange(query);
    const [items, total] = await database.client.$transaction([
      database.client.voiceCall.findMany({
        orderBy: { startedAt: "desc" },
        skip,
        take,
      }),
      database.client.voiceCall.count(),
    ]);
    return {
      items: items.map((call) => {
        const { recordingUrl: _recordingUrl, ...publicCall } = call;
        return {
          ...publicCall,
          // Mango recordings can be fetched on demand before they are copied to
          // managed storage. Do not hide those calls from the journal.
          hasRecording: Boolean(
            call.recordingObjectId || _recordingUrl || call.providerRecordingId,
          ),
          hasTranscript:
            Array.isArray(call.transcript) && call.transcript.length > 0,
        };
      }),
      total,
    };
  },
  getVoiceCall: async (recordId: string) => {
    const call = await database.client.voiceCall.findUnique({
      where: { id: recordId },
    });
    if (!call) return null;
    const { recordingUrl: _recordingUrl, ...publicCall } = call;
    return {
      ...publicCall,
      hasRecording: Boolean(
        call.recordingObjectId || _recordingUrl || call.providerRecordingId,
      ),
      hasTranscript:
        Array.isArray(call.transcript) && call.transcript.length > 0,
    };
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
    database.client.$transaction(async (transaction) => {
      const request = await transaction.adminRequest.update({
        data: input,
        where: { id: recordId },
      });
      await transaction.bookingRequest.updateMany({
        data: input,
        where: { adminRequestId: recordId },
      });
      return request;
    }),
});

export type AdminOperationsRepository = ReturnType<
  typeof createAdminOperationsRepository
>;
