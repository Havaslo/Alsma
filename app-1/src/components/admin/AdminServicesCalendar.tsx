import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";

import { AdminServicesCatalog } from "@/components/admin/AdminServicesCatalog";
import { cn } from "@/lib/cn";
import { loadServiceCalendar } from "@/lib/services/admin-services-api";

export const AdminServicesCalendar = () => {
  type ServicesTab = "catalog" | "calendar";
  const [tab, setTab] = useState<ServicesTab>(() =>
    window.location.hash === "#calendar" ? "calendar" : "catalog",
  );
  const [range] = useState(() => {
    const from = new Date();
    return { from, to: new Date(from.getTime() + 31 * 86400000) };
  });
  useEffect(() => {
    const onHashChange = () =>
      setTab(window.location.hash === "#calendar" ? "calendar" : "catalog");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  const selectTab = (next: ServicesTab) => {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}#${next}`,
    );
    setTab(next);
  };
  const query = useQuery({
    queryKey: ["service-calendar"],
    queryFn: () =>
      loadServiceCalendar(range.from.toISOString(), range.to.toISOString()),
  });
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm tracking-[0.18em] text-brand uppercase">Услуги</p>
        <h1 className="mt-2 font-heading text-4xl font-semibold">
          Записи услуг
        </h1>
      </div>
      <section className="border-b border-line">
        <div className="flex items-end gap-8">
          {(
            [
              ["catalog", "Каталог услуг"],
              ["calendar", "Календарь записей"],
            ] as const
          ).map(([value, label]) => (
            <button
              className={cn(
                "border-b-2 pb-3 text-sm font-semibold",
                tab === value
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-ui-foreground",
              )}
              key={value}
              onClick={() => selectTab(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </section>
      {tab === "catalog" && <AdminServicesCatalog />}
      {tab === "calendar" && (
        <div className="rounded-3xl border border-line bg-brand-foreground p-6">
          <div className="flex items-center gap-3 text-brand">
            <CalendarDays />
            <strong>Ближайшие 30 дней</strong>
          </div>
          {query.isLoading && (
            <p className="mt-5 text-muted-ui-foreground">Загружаем записи…</p>
          )}
          {query.data?.data.bookings.length === 0 && (
            <p className="mt-5 text-muted-ui-foreground">Записей пока нет.</p>
          )}
          <div className="mt-5 divide-y divide-line">
            {query.data?.data.bookings.map((booking) => (
              <div
                className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                key={booking.id}
              >
                <div>
                  <strong>
                    {new Date(booking.startsAt).toLocaleString("ru-RU", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </strong>
                  <p className="text-sm text-muted-ui-foreground">
                    {booking.service.name} · {booking.variant.name}
                  </p>
                </div>
                <div className="text-sm">
                  {booking.orderItem.order.name}
                  <br />
                  <span className="text-muted-ui-foreground">
                    {booking.orderItem.order.phone}
                  </span>
                </div>
                <span className="rounded-full bg-page px-3 py-1 text-xs">
                  {booking.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
