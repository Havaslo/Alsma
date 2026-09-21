import { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  UsersRound,
} from "lucide-react";

import { AdminManualBookingModal } from "@/components/admin/AdminManualBookingModal";
import { cn } from "@/lib/cn";
import {
  type ServiceBooking,
  loadServiceCalendar,
  loadServiceCatalog,
} from "@/lib/services/admin-services-api";
import {
  formatServiceTime,
  isServiceSlotPast,
  serviceDateKey,
  serviceSlotDate,
} from "@/lib/services/service-time";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
const dateKey = (value: string) => {
  return serviceDateKey(value);
};
const getCalendarRange = () => {
  const now = new Date();
  const from = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const to = new Date(from);
  to.setDate(to.getDate() + 31);
  return { from, to };
};

// The services API stores and validates availability in UTC. Keep the grid on
// the same contract so a displayed slot serializes to the exact slot checked
// by the manual-booking endpoint.
const DAY_START_HOUR = 8;
const DAY_END_HOUR = 22;
const statusLabel = (status: string) =>
  ({
    cancelled: "Отменена",
    completed: "Завершена",
    confirmed: "Подтверждена",
    requested: "Ожидает подтверждения",
  })[status] ?? status;
const bookingSourceLabel = (source: string) =>
  ({
    legacy: "Источник не определён",
    manual: "Ручная запись менеджером",
    online: "Пользователь записался самостоятельно",
  })[source] ?? source;
const paymentStatusLabel = (status: string) =>
  ({
    pending: "Ожидает оплаты",
    succeeded: "Оплачено",
    failed: "Ошибка оплаты",
    refunded: "Возвращено",
  })[status] ?? status;
const slotDate = (date: string, minutes: number) => {
  // The API stores UTC instants, while the calendar is a local-time interface.
  // Constructing this as local time keeps the visible 08:00–22:00 workday and
  // serializes the selected wall-clock time to the correct UTC instant.
  return serviceSlotDate(date, minutes);
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

const bookingStartsInSlot = (
  booking: ServiceBooking,
  date: string,
  start: number,
) => new Date(booking.startsAt).getTime() === slotDate(date, start).getTime();

const BookingSlot = ({ booking }: { readonly booking: ServiceBooking }) => (
  <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-brand">
    <UsersRound className="size-3" /> Занято · запись{" "}
    {formatServiceTime(booking.startsAt)}–{formatServiceTime(booking.endsAt)}
  </div>
);

const OverlappingBookingSlot = () => (
  <div className="mt-2 text-xs font-semibold text-brand">
    Занято · пересечение записи
  </div>
);

const BookingCount = ({ count }: { readonly count: number }) => (
  <div className="mt-2 text-xs font-semibold text-brand">
    Записей в слоте: {count}
  </div>
);

const BookingDetails = ({
  bookings,
  date,
  end,
  start,
  onClose,
}: {
  readonly bookings: ServiceBooking[];
  readonly date: string;
  readonly end: number;
  readonly start: number;
  readonly onClose: () => void;
}) => (
  <div
    className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
    onClick={onClose}
    role="presentation"
  >
    <div
      aria-labelledby="booking-details-title"
      className="w-full max-w-md rounded-3xl bg-brand-foreground p-6 shadow-2xl"
      onClick={(event) => event.stopPropagation()}
      role="dialog"
    >
      <p className="text-sm text-muted-ui-foreground">Записи в слоте</p>
      <h2
        className="mt-1 font-heading text-2xl font-semibold"
        id="booking-details-title"
      >
        {formatServiceTime(slotDate(date, start).toISOString())} —{" "}
        {formatServiceTime(slotDate(date, end).toISOString())}
      </h2>
      <p className="mt-2 text-sm text-muted-ui-foreground">
        Записей в интервале: {bookings.length}
      </p>
      <div className="mt-5 grid gap-3">
        {bookings.map((booking) => (
          <article
            className="rounded-2xl border border-line bg-page p-4 text-sm"
            key={booking.id}
          >
            <h3 className="font-semibold text-brand">
              {booking.orderItem.order.name}
            </h3>
            <div className="mt-2 grid gap-1.5">
              <p>
                <span className="text-muted-ui-foreground">Телефон:</span>{" "}
                {booking.orderItem.order.phone}
              </p>
              <p>
                <span className="text-muted-ui-foreground">Email:</span>{" "}
                {booking.orderItem.order.email}
              </p>
              <p>
                <span className="text-muted-ui-foreground">Услуга:</span>{" "}
                {booking.service.name} · {booking.variant.name}
              </p>
              <p>
                <span className="text-muted-ui-foreground">Время:</span>{" "}
                {formatServiceTime(booking.startsAt)} —{" "}
                {formatServiceTime(booking.endsAt)}
              </p>
              <p>
                <span className="text-muted-ui-foreground">Статус:</span>{" "}
                {statusLabel(booking.status)}
              </p>
              <p>
                <span className="text-muted-ui-foreground">Источник:</span>{" "}
                {bookingSourceLabel(booking.bookingSource)}
              </p>
              <p>
                <span className="text-muted-ui-foreground">Кто внёс:</span>{" "}
                {booking.createdByAdmin?.displayName ??
                  (booking.bookingSource === "online"
                    ? "Пользователь"
                    : "Не определён")}
              </p>
              <p>
                <span className="text-muted-ui-foreground">Оплата:</span>{" "}
                {paymentStatusLabel(booking.orderItem.order.paymentStatus)}
              </p>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <button
          className="rounded-full bg-brand px-5 py-2 font-semibold text-brand-foreground"
          onClick={onClose}
          type="button"
        >
          Закрыть
        </button>
      </div>
    </div>
  </div>
);

export const AdminServiceCalendarPage = () => {
  const range = useMemo(() => getCalendarRange(), []);
  const [selectedDate, setSelectedDate] = useState(
    range.from.toISOString().slice(0, 10),
  );
  const [selectedServiceId, setSelectedServiceId] = useState<string>();
  const [expandedServiceId, setExpandedServiceId] = useState<string>();
  const [selectedVariantIds, setSelectedVariantIds] = useState<
    Record<string, string>
  >({});
  const [manualSlot, setManualSlot] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{
    bookings: ServiceBooking[];
    start: number;
    end: number;
  }>();
  const catalog = useQuery({
    queryKey: ["service-calendar-catalog"],
    queryFn: async () => (await loadServiceCatalog()).data,
    refetchOnMount: "always",
  });
  const calendar = useQuery({
    queryKey: ["service-calendar", selectedDate],
    queryFn: async () =>
      (
        await loadServiceCalendar(
          serviceSlotDate(selectedDate, 0).toISOString(),
          serviceSlotDate(selectedDate, 24 * 60 - 1).toISOString(),
        )
      ).data,
    enabled: Boolean(selectedDate),
  });
  const services = catalog.data?.services ?? [];
  const activeServiceId = selectedServiceId ?? services[0]?.id;
  const selectedService = services.find(
    (service) => service.id === activeServiceId,
  );
  const selectedVariantId = selectedService
    ? (selectedVariantIds[selectedService.id] ??
      selectedService.variants[0]?.id)
    : undefined;
  const selectedVariant = selectedService?.variants.find(
    (variant) => variant.id === selectedVariantId,
  );
  const selectedResources = (selectedVariant?.resources ?? []).filter(
    (resource) => resource.resource,
  ) as Array<{
    readonly resourceId: string;
    readonly quantity: number;
    readonly resource: {
      readonly id: string;
      readonly name: string;
      readonly totalUnits: number;
    };
  }>;
  const bookings = (calendar.data?.bookings ?? []).filter((booking) => {
    if (
      booking.status === "cancelled" ||
      dateKey(booking.startsAt) !== selectedDate
    )
      return false;
    if (booking.service.id === activeServiceId) return true;
    return selectedResources.some((selectedResource) =>
      booking.variant.resources.some(
        (bookingResource) =>
          bookingResource.resourceId === selectedResource.resourceId,
      ),
    );
  });
  const durationMinutes = selectedVariant?.durationMin ?? 60;
  // A service's duration is also the calendar step. This prevents a 60-minute
  // service from exposing overlapping 30-minute start times.
  const slots = Array.from(
    {
      length: Math.max(
        0,
        Math.floor(((DAY_END_HOUR - DAY_START_HOUR) * 60) / durationMinutes),
      ),
    },
    (_, index) => {
      const start = DAY_START_HOUR * 60 + index * durationMinutes;
      const end = start + durationMinutes;
      return {
        bookings: bookings.filter((booking) =>
          bookingInSlot(booking, selectedDate, start, end),
        ),
        end,
        label: `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`,
        start,
      };
    },
  );
  const resourceUsageFor = (slotBookings: ServiceBooking[]) =>
    selectedResources.map((selectedResource) => {
      const used = slotBookings.reduce((total, booking) => {
        const assignment = booking.variant.resources.find(
          (resource) => resource.resourceId === selectedResource.resourceId,
        );
        return total + (assignment?.quantity ?? 0) * booking.orderItem.quantity;
      }, 0);
      return {
        name: selectedResource.resource.name,
        total: selectedResource.resource.totalUnits,
        used,
      };
    });

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
            {services.map((service) => {
              const isActive = service.id === activeServiceId;
              const isExpanded =
                service.id === (expandedServiceId ?? activeServiceId);
              const currentVariantId =
                selectedVariantIds[service.id] ?? service.variants[0]?.id;
              return (
                <div
                  className={cn(
                    "mb-1 rounded-2xl border px-3 py-2 transition",
                    isActive
                      ? "text-foreground border-brand/35 bg-muted-ui/35 shadow-sm"
                      : "border-transparent hover:bg-muted-ui/50",
                  )}
                  key={service.id}
                >
                  <button
                    aria-expanded={isExpanded}
                    className="flex w-full items-center gap-2 py-1 text-left"
                    onClick={() => {
                      setSelectedServiceId(service.id);
                      setExpandedServiceId((current) =>
                        current === service.id ? undefined : service.id,
                      );
                    }}
                    type="button"
                  >
                    {isExpanded ? (
                      <ChevronDown className="size-4 shrink-0" />
                    ) : (
                      <ChevronRight className="size-4 shrink-0" />
                    )}
                    <strong className="block truncate text-sm">
                      {service.name}
                    </strong>
                  </button>
                  {isExpanded && (
                    <div className="mt-1 ml-6 grid gap-1 border-l border-brand/25 pl-2">
                      {service.variants.map((variant) => {
                        const isVariantActive = variant.id === currentVariantId;
                        return (
                          <button
                            className={cn(
                              "rounded-lg border px-2 py-1.5 text-left text-xs transition",
                              isVariantActive
                                ? "text-foreground border-brand/35 bg-brand-foreground font-semibold shadow-sm"
                                : "hover:text-foreground border-transparent text-muted-ui-foreground hover:bg-muted-ui/50",
                            )}
                            key={variant.id}
                            onClick={() => {
                              setSelectedServiceId(service.id);
                              setSelectedVariantIds((current) => ({
                                ...current,
                                [service.id]: variant.id,
                              }));
                            }}
                            type="button"
                          >
                            {variant.name} · {variant.durationMin ?? 60} мин
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
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
                  <div className="border-b border-line bg-muted-ui/20 px-4 py-3 text-xs font-semibold tracking-[0.12em] text-muted-ui-foreground uppercase">
                    Матрица доступности · {selectedVariant?.name} ·{" "}
                    {durationMinutes} мин
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                    {slots.map((slot) => (
                      <button
                        className={cn(
                          "min-h-20 rounded-xl border p-3 text-left transition",
                          slot.bookings.length > 0
                            ? "cursor-default border-brand/30 bg-brand/10"
                            : isServiceSlotPast(selectedDate, slot.start)
                              ? "cursor-not-allowed border-line bg-page opacity-60"
                              : "border-emerald-200 bg-emerald-50 hover:border-emerald-400 hover:bg-emerald-100",
                        )}
                        key={`${slot.label}-${durationMinutes}`}
                        onClick={() =>
                          slot.bookings.length > 0
                            ? setSelectedSlot({
                                bookings: slot.bookings,
                                end: slot.end,
                                start: slot.start,
                              })
                            : isServiceSlotPast(selectedDate, slot.start)
                              ? undefined
                              : setManualSlot(slot.start)
                        }
                        type="button"
                      >
                        <div className="text-sm font-semibold">
                          {slot.label}
                        </div>
                        {slot.bookings.length > 0 ? (
                          <>
                            <BookingCount count={slot.bookings.length} />
                            {resourceUsageFor(slot.bookings).map((resource) => (
                              <div
                                className="mt-1 text-xs font-semibold text-brand"
                                key={resource.name}
                              >
                                {resource.name}: {resource.used}/
                                {resource.total}
                              </div>
                            ))}
                            {slot.bookings.map((booking) =>
                              bookingStartsInSlot(
                                booking,
                                selectedDate,
                                slot.start,
                              ) ? (
                                <BookingSlot
                                  booking={booking}
                                  key={booking.id}
                                />
                              ) : (
                                <OverlappingBookingSlot key={booking.id} />
                              ),
                            )}
                          </>
                        ) : isServiceSlotPast(selectedDate, slot.start) ? (
                          <div className="mt-2 text-xs font-semibold text-muted-ui-foreground">
                            Недоступно: время прошло
                          </div>
                        ) : (
                          <div className="mt-2 flex items-center gap-1 text-xs text-emerald-700">
                            <Check className="size-3" /> Свободно
                          </div>
                        )}
                        <div className="mt-1 text-xs text-muted-ui-foreground">
                          до{" "}
                          {String(Math.floor(slot.end / 60)).padStart(2, "0")}:
                          {String(slot.end % 60).padStart(2, "0")}
                        </div>
                      </button>
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
      {manualSlot !== null && selectedService && (
        <AdminManualBookingModal
          date={formatDate(selectedDate)}
          onClose={() => setManualSlot(null)}
          onCreated={() => void calendar.refetch()}
          selectedVariantId={selectedVariantId}
          serviceName={selectedService.name}
          startsAt={slotDate(selectedDate, manualSlot).toISOString()}
          variants={selectedService.variants}
        />
      )}
      {selectedSlot && (
        <BookingDetails
          bookings={selectedSlot.bookings}
          date={selectedDate}
          end={selectedSlot.end}
          onClose={() => setSelectedSlot(undefined)}
          start={selectedSlot.start}
        />
      )}
    </section>
  );
};
