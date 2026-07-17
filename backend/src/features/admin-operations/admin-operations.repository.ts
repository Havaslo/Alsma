import type { Database } from "../../lib/database/database.js";
import { getPaginationRange } from "../../lib/http/pagination.js";
import type {
  AdminOperationsQuery,
  UpdateBonusBody,
  UpdateRequestStatusBody,
} from "./admin-operations.schemas.js";

export const createAdminOperationsRepository = (database: Database) => ({
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
        include: { bonusProgram: true, _count: { select: { bookings: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      database.client.guestUser.count(),
    ]);
    return { items, total };
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
  updateRequest: (recordId: string, input: UpdateRequestStatusBody) =>
    database.client.adminRequest.update({
      data: input,
      where: { id: recordId },
    }),
});

export type AdminOperationsRepository = ReturnType<
  typeof createAdminOperationsRepository
>;
