import { useMemo, useState } from "react";

import { BadgeCheck, CirclePlus, Search } from "lucide-react";

import { AdminBookingForm } from "@/components/admin/AdminBookingForm";
import { Loader } from "@/components/ui/Loader";
import { useAdminBookings, useMarkBookingPaid } from "@/lib/admin/useAdmin";

export const AdminBookingRequestsPanel = () => {
  const bookings = useAdminBookings();
  const markPaid = useMarkBookingPaid();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const items = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("ru-RU");
    if (!term) return bookings.data?.items ?? [];
    return (bookings.data?.items ?? []).filter((item) =>
      [
        item.guestName,
        item.phone,
        item.email,
        item.roomName,
        item.checkInDate,
        item.checkOutDate,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("ru-RU")
        .includes(term),
    );
  }, [bookings.data?.items, search]);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-line bg-brand-foreground p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Заявки на бронирование</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-ui-foreground">
              Таблица для заявок, которые приходят от менеджеров, со страницы
              этапа и оплаты, приложений и обращений с быстрым действием.
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground"
            onClick={() => setShowForm((current) => !current)}
            type="button"
          >
            <CirclePlus className="size-4" />
            Новая заявка
          </button>
        </div>
      </section>

      {showForm && <AdminBookingForm onCancel={() => setShowForm(false)} />}

      <section className="rounded-3xl border border-line bg-brand-foreground p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_15rem]">
          <label className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3">
            <Search className="size-4 text-muted-ui-foreground" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-ui-foreground"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Имя, телефон, почта, номер"
              value={search}
            />
          </label>
          <div className="rounded-2xl border border-line px-4 py-3 text-sm text-muted-ui-foreground">
            Всего заявок:{" "}
            <strong className="text-page-foreground">
              {bookings.data?.pagination.totalItems ?? 0}
            </strong>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-line bg-brand-foreground">
        <div className="overflow-x-auto">
          <table className="w-full min-w-7xl border-collapse text-left text-sm">
            <thead className="bg-page text-xs font-semibold">
              <tr>
                <th className="px-5 py-4">Заявка</th>
                <th className="px-5 py-4">Поездка</th>
                <th className="px-5 py-4">Номер</th>
                <th className="px-5 py-4">Источник / создано</th>
                <th className="px-5 py-4">Статусы</th>
                <th className="px-5 py-4">Связанный звонок</th>
                <th className="px-5 py-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr className="border-t border-line align-top" key={item.id}>
                  <td className="px-5 py-4">
                    <strong className="block">{item.guestName}</strong>
                    <span className="mt-1 block text-xs text-muted-ui-foreground">
                      {item.phone}
                    </span>
                    <span className="block text-xs text-muted-ui-foreground">
                      {item.email || "Почта не указана"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <strong className="block">
                      {item.checkInDate?.slice(0, 10) || "Без даты"} —{" "}
                      {item.checkOutDate?.slice(0, 10) || "Без даты"}
                    </strong>
                    <span className="mt-1 block text-xs text-muted-ui-foreground">
                      {item.guestsCount} гост.
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {item.roomName || "Номер не выбран"}
                  </td>
                  <td className="px-5 py-4 text-muted-ui-foreground">
                    Система бронирования
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-supporting/25 px-3 py-1 text-xs font-semibold text-brand">
                      {item.paidAt ? "Оплачено" : "Ожидает оплаты"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted-ui-foreground">—</td>
                  <td className="px-5 py-4 text-right">
                    <button
                      className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-xs font-semibold text-brand disabled:opacity-50"
                      disabled={Boolean(item.paidAt) || markPaid.isPending}
                      onClick={() => markPaid.mutate(item.id)}
                      type="button"
                    >
                      <BadgeCheck className="size-4" />
                      {item.paidAt ? "Уже оплачено" : "Отметить оплату"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {bookings.isLoading && (
          <div className="grid place-items-center p-12">
            <Loader className="text-brand" />
          </div>
        )}
        {!bookings.isLoading && !items.length && (
          <p className="p-12 text-center text-muted-ui-foreground">
            По выбранному запросу заявок нет.
          </p>
        )}
      </section>
    </div>
  );
};
