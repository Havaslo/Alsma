import { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Check, Clock3, UsersRound } from "lucide-react";

import { cn } from "@/lib/cn";
import {
  type ServiceBooking,
  loadServiceCalendar,
  loadServiceCatalog,
} from "@/lib/services/admin-services-api";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
const formatTime = (value: string) =>
  new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
const dateKey = (value: string) => new Date(value).toISOString().slice(0, 10);
const getCalendarRange = () => {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 31);
  return { from, to };
};

const DAY_START_HOUR = 8;
const DAY_END_HOUR = 22;
const SLOT_MINUTES = 30;
const timeSlots = Array.from(
  { length: ((DAY_END_HOUR - DAY_START_HOUR) * 60) / SLOT_MINUTES },
  (_, index) => {
    const minutes = DAY_START_HOUR * 60 + index * SLOT_MINUTES;
    return {
      end: minutes + SLOT_MINUTES,
      label: `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
      start: minutes,
    };
  },
);
const statusLabel = (status: string) =>
  ({
    cancelled: "Отменена",
    completed: "Завершена",
    confirmed: "Подтверждена",
    requested: "Ожидает подтверждения",
  })[status] ?? status;
const slotDate = (date: string, minutes: number) => {
  const value = new Date(`${date}T00:00:00`);
  value.setMinutes(minutes);
  return value;
};
const bookingInSlot = (
  booking: ServiceBooking,
  date: string,
  start: number,
  end: number,
) => {
  const slotStart = slotDate(date, start).getTime();
  const slotEnd = slotDate(date, end).getTime();
  return (
    new Date(booking.startsAt).getTime() < slotEnd &&
    new Date(booking.endsAt).getTime() > slotStart
  );
};

const BookingSlot = ({ booking }: { readonly booking: ServiceBooking }) => (
  <div className="rounded-xl border border-brand/20 bg-brand/5 p-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-brand">
          <Clock3 className="size-4" /> {formatTime(booking.startsAt)} —{" "}
          {formatTime(booking.endsAt)}
        </div>
        <p className="mt-1 text-sm font-medium">{booking.variant.name}</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-ui-foreground">
          <UsersRound className="size-4" />
          {booking.orderItem.order.name} · {booking.orderItem.order.phone}
        </p>
      </div>
      <span className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-brand-foreground">
        {statusLabel(booking.status)}
      </span>
    </div>
  </div>
);

export const AdminServiceCalendarPage = () => {
  const range = useMemo(() => getCalendarRange(), []);
  const [selectedDate, setSelectedDate] = useState(
    range.from.toISOString().slice(0, 10),
  );
  const [selectedServiceId, setSelectedServiceId] = useState<string>();
  const catalog = useQuery({
    queryKey: ["service-calendar-catalog"],
    queryFn: async () => (await loadServiceCatalog()).data,
  });
  const calendar = useQuery({
    queryKey: ["service-calendar", range.from.toISOString()],
    queryFn: async () =>
      (
        await loadServiceCalendar(
          range.from.toISOString(),
          range.to.toISOString(),
        )
      ).data,
  });
  const services = catalog.data?.services ?? [];
  const activeServiceId = selectedServiceId ?? services[0]?.id;
  const selectedService = services.find(
    (service) => service.id === activeServiceId,
  );
  const bookings = (calendar.data?.bookings ?? []).filter(
    (booking) =>
      booking.service.id === activeServiceId &&
      dateKey(booking.startsAt) === selectedDate,
  );
  const slots = timeSlots.map((slot) => ({
    ...slot,
    booking: bookings.find((booking) =>
      bookingInSlot(booking, selectedDate, slot.start, slot.end),
    ),
  }));

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm tracking-[0.18em] text-brand uppercase">Услуги</p>
        <h1 className="mt-2 font-heading text-4xl font-semibold">
          Календарь записей
        </h1>
        <p className="mt-2 text-muted-ui-foreground">
          Выберите услугу слева, чтобы увидеть занятые временные слоты.
        </p>
      </div>
      <div className="grid min-h-[34rem] overflow-hidden rounded-3xl border border-line bg-brand-foreground lg:grid-cols-[minmax(15rem,22rem)_1fr]">
        <aside className="border-b border-line bg-muted-ui/20 lg:border-r lg:border-b-0">
          <div className="border-b border-line px-5 py-4">
            <p className="text-xs font-semibold tracking-[0.16em] text-muted-ui-foreground uppercase">
              Все услуги
            </p>
            <p className="mt-1 text-sm text-muted-ui-foreground">
              {services.length} доступно для записи
            </p>
          </div>
          <div className="p-3">
            {catalog.isLoading && (
              <p className="p-3 text-sm text-muted-ui-foreground">
                Загружаем услуги…
              </p>
            )}
            {!catalog.isLoading && !services.length && (
              <p className="p-3 text-sm text-muted-ui-foreground">
                Услуг пока нет.
              </p>
            )}
            {services.map((service) => (
              <button
                className={cn(
                  "mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition",
                  service.id === activeServiceId
                    ? "bg-brand text-brand-foreground shadow-sm"
                    : "hover:bg-muted-ui/50",
                )}
                key={service.id}
                onClick={() => setSelectedServiceId(service.id)}
                type="button"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-current/10 text-sm font-bold">
                  {service.name.slice(0, 1)}
                </span>
                <span className="min-w-0">
                  <strong className="block truncate text-sm">
                    {service.name}
                  </strong>
                  <span className="mt-1 block text-xs opacity-70">
                    {service.variants.length} варианта
                  </span>
                </span>
              </button>
            ))}
          </div>
        </aside>
        <div className="min-w-0 p-5 sm:p-7">
          {selectedService ? (
            <>
              <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm text-muted-ui-foreground">
                    Выбранная услуга
                  </p>
                  <h2 className="mt-1 font-heading text-2xl font-semibold">
                    {selectedService.name}
                  </h2>
                </div>
                <label className="grid gap-1.5 text-sm font-semibold">
                  <span className="text-muted-ui-foreground">День</span>
                  <input
                    className="rounded-xl border border-line bg-brand-foreground px-3 py-2 font-normal"
                    min={range.from.toISOString().slice(0, 10)}
                    onChange={(event) => setSelectedDate(event.target.value)}
                    type="date"
                    value={selectedDate}
                  />
                </label>
              </div>
              <div className="mt-6 flex items-center gap-2 text-sm text-muted-ui-foreground">
                <CalendarDays className="size-4 text-brand" />
                {formatDate(selectedDate)}
              </div>
              {calendar.isLoading && (
                <p className="mt-6 text-muted-ui-foreground">
                  Загружаем занятые слоты…
                </p>
              )}
              {!calendar.isLoading && (
                <div className="mt-6 overflow-hidden rounded-2xl border border-line">
                  <div className="grid grid-cols-[5rem_1fr] border-b border-line bg-muted-ui/20 px-4 py-3 text-xs font-semibold tracking-[0.12em] text-muted-ui-foreground uppercase sm:grid-cols-[7rem_1fr]">
                    <span>Время</span>
                    <span>Состояние записи</span>
                  </div>
                  <div className="divide-y divide-line">
                    {slots.map((slot) => (
                      <div
                        className="grid min-h-20 grid-cols-[5rem_1fr] items-stretch sm:grid-cols-[7rem_1fr]"
                        key={slot.label}
                      >
                        <div className="flex items-start border-r border-line px-4 py-4 text-sm font-semibold text-muted-ui-foreground">
                          {slot.label}
                        </div>
                        <div
                          className={cn(
                            "p-2",
                            slot.booking ? "bg-brand/5" : "bg-brand-foreground",
                          )}
                        >
                          {slot.booking ? (
                            <BookingSlot booking={slot.booking} />
                          ) : (
                            <div className="flex h-full min-h-14 items-center gap-2 rounded-xl border border-dashed border-line px-3 text-sm text-muted-ui-foreground">
                              <Check className="size-4 text-emerald-600" />{" "}
                              Свободно
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="grid h-full min-h-80 place-items-center text-center text-muted-ui-foreground">
              <div>
                <CalendarDays className="mx-auto size-10 text-brand/60" />
                <p className="mt-3">Выберите услугу</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
