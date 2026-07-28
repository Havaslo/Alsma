import { CalendarDays, Download, Printer } from "lucide-react";

import type { GuestProfile } from "@/lib/auth/guest-auth-api";

const bookingServices: Record<string, readonly string[]> = {
  "SPA-weekend в лесном корпусе": [
    "Wellness-программа",
    "Ранний заезд",
    "Завтрак",
    "Термальная зона",
  ],
  "Семейный заезд с all inclusive": [
    "Всё включено",
    "Детская анимация",
    "Поздний выезд",
  ],
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export const AccountBookingsSection = ({
  bookings,
}: {
  bookings: GuestProfile["bookings"];
}) => (
  <section className="mt-8">
    <div className="flex items-center gap-3">
      <CalendarDays className="size-7 text-brand" />
      <h2 className="font-heading text-3xl font-semibold text-brand">
        История бронирований
      </h2>
    </div>
    <div className="mt-6 space-y-5">
      {bookings.map((booking) => (
        <article
          className="rounded-4xl border border-line bg-panel p-6 sm:p-8"
          key={booking.id}
        >
          <div className="flex flex-col justify-between gap-6 lg:flex-row">
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-semibold text-brand">
                {booking.roomName}
              </h3>
              <p className="mt-2 text-sm text-muted-ui-foreground">
                Номер брони: ALS-{booking.id.slice(0, 8).toUpperCase()}
              </p>
              <dl className="mt-7 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <dt className="text-xs tracking-wider text-muted-ui-foreground uppercase">
                    Заезд
                  </dt>
                  <dd className="mt-2 font-semibold">
                    {formatDate(booking.checkInDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs tracking-wider text-muted-ui-foreground uppercase">
                    Выезд
                  </dt>
                  <dd className="mt-2 font-semibold">
                    {formatDate(booking.checkOutDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs tracking-wider text-muted-ui-foreground uppercase">
                    Гости
                  </dt>
                  <dd className="mt-2 font-semibold">
                    {booking.guestsCount} гостя
                  </dd>
                </div>
                <div>
                  <dt className="text-xs tracking-wider text-muted-ui-foreground uppercase">
                    Итоговая цена
                  </dt>
                  <dd className="mt-2 font-semibold text-brand">
                    {booking.totalAmount
                      ? `${Number(booking.totalAmount).toLocaleString("ru-RU")} ₽`
                      : "По запросу"}
                  </dd>
                </div>
              </dl>
              <div className="mt-7 flex flex-wrap gap-2">
                {(bookingServices[booking.roomName] ?? [booking.status]).map(
                  (service) => (
                    <span
                      className="rounded-full border border-line bg-page px-4 py-2 text-sm"
                      key={service}
                    >
                      {service}
                    </span>
                  ),
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-3">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-page px-5 py-3 font-semibold text-brand"
                onClick={() => window.print()}
                type="button"
              >
                <Download className="size-4" /> Скачать PDF
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-5 py-3 font-semibold text-brand"
                onClick={() => window.print()}
                type="button"
              >
                <Printer className="size-4" /> Распечатать
              </button>
            </div>
          </div>
        </article>
      ))}
      {!bookings.length && (
        <div className="rounded-3xl bg-panel p-8 text-muted-ui-foreground">
          Активных бронирований пока нет.
        </div>
      )}
    </div>
  </section>
);
