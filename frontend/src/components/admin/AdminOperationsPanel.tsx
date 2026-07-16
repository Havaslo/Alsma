import { useState } from "react";

import {
  BadgeCheck,
  CalendarCheck,
  MessageSquareText,
  UsersRound,
} from "lucide-react";

import type { SiteLead } from "@/lib/admin/admin-api";
import {
  useAdminBookings,
  useAdminClients,
  useAdminRequests,
  useMarkBookingPaid,
  useUpdateAdminRequest,
  useUpdateClientBonus,
} from "@/lib/admin/useAdmin";

type Tab = "bookings" | "clients" | "requests";
const statuses: SiteLead["status"][] = [
  "new",
  "processing",
  "completed",
  "cancelled",
];

export const AdminOperationsPanel = () => {
  const [tab, setTab] = useState<Tab>("bookings");
  const bookings = useAdminBookings();
  const clients = useAdminClients();
  const requests = useAdminRequests();
  const markPaid = useMarkBookingPaid();
  const updateBonus = useUpdateClientBonus();
  const updateRequest = useUpdateAdminRequest();
  const tabs = [
    { icon: CalendarCheck, id: "bookings" as const, label: "Бронирования" },
    { icon: UsersRound, id: "clients" as const, label: "Клиенты" },
    { icon: MessageSquareText, id: "requests" as const, label: "Обращения" },
  ];

  return (
    <section className="mt-8">
      <div className="flex flex-wrap gap-2">
        {tabs.map(({ icon: Icon, id, label }) => (
          <button
            className={
              tab === id
                ? "inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 font-semibold text-brand-foreground"
                : "inline-flex items-center gap-2 rounded-full border border-line bg-panel px-5 py-3 font-semibold text-brand"
            }
            key={id}
            onClick={() => setTab(id)}
            type="button"
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>
      <div className="mt-5 overflow-hidden rounded-3xl border border-line bg-panel">
        {tab === "bookings" && (
          <div>
            {bookings.data?.items.map((item) => (
              <article
                className="flex flex-col justify-between gap-4 border-b border-line p-5 sm:flex-row sm:items-center"
                key={item.id}
              >
                <div>
                  <h3 className="font-semibold text-brand">{item.guestName}</h3>
                  <p className="mt-1 text-sm text-muted-ui-foreground">
                    {item.roomName || "Номер не выбран"} ·{" "}
                    {item.checkInDate?.slice(0, 10) || "без даты"} —{" "}
                    {item.checkOutDate?.slice(0, 10) || "без даты"}
                  </p>
                </div>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-4 py-2 font-semibold text-brand disabled:opacity-50"
                  disabled={Boolean(item.paidAt) || markPaid.isPending}
                  onClick={() => markPaid.mutate(item.id)}
                  type="button"
                >
                  <BadgeCheck className="size-4" />
                  {item.paidAt ? "Оплачено" : "Отметить оплату"}
                </button>
              </article>
            ))}
            {!bookings.data?.items.length && (
              <p className="p-10 text-center text-muted-ui-foreground">
                Бронирований пока нет.
              </p>
            )}
          </div>
        )}
        {tab === "clients" && (
          <div>
            {clients.data?.items.map((item) => (
              <article
                className="grid gap-4 border-b border-line p-5 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                key={item.id}
              >
                <div>
                  <h3 className="font-semibold text-brand">
                    {item.fullName || "Гость АЛСМА"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-ui-foreground">
                    {item.phone} · бронирований: {item._count.bookings}
                  </p>
                </div>
                <input
                  aria-label="Баланс бонусов"
                  className="w-28 rounded-xl border border-line bg-page px-3 py-2"
                  defaultValue={item.bonusProgram?.balance ?? 0}
                  id={`bonus-${item.id}`}
                  min={0}
                  type="number"
                />
                <button
                  className="rounded-full border border-line px-4 py-2 font-semibold text-brand"
                  onClick={() => {
                    const input = document.getElementById(
                      `bonus-${item.id}`,
                    ) as HTMLInputElement;
                    updateBonus.mutate({
                      balance: Number(input.value),
                      level: item.bonusProgram?.level ?? "standard",
                      recordId: item.id,
                    });
                  }}
                  type="button"
                >
                  Сохранить
                </button>
              </article>
            ))}
            {!clients.data?.items.length && (
              <p className="p-10 text-center text-muted-ui-foreground">
                Клиентов пока нет.
              </p>
            )}
          </div>
        )}
        {tab === "requests" && (
          <div>
            {requests.data?.items.map((item) => (
              <article
                className="grid gap-4 border-b border-line p-5 sm:grid-cols-[1fr_auto] sm:items-center"
                key={item.id}
              >
                <div>
                  <h3 className="font-semibold text-brand">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-ui-foreground">
                    {item.category} ·{" "}
                    {item.requester || item.contact || "Без контакта"}
                  </p>
                </div>
                <select
                  className="rounded-xl border border-line bg-page px-3 py-2"
                  onChange={(event) =>
                    updateRequest.mutate({
                      recordId: item.id,
                      status: event.target.value as SiteLead["status"],
                    })
                  }
                  value={item.status}
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </article>
            ))}
            {!requests.data?.items.length && (
              <p className="p-10 text-center text-muted-ui-foreground">
                Обращений пока нет.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
