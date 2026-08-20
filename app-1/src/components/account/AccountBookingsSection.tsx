import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
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

const getBookingNumber = (id: string) => `ALS-${id.slice(0, 8).toUpperCase()}`;

const getBookingServices = (roomName: string, status: string) =>
  bookingServices[roomName] ?? [status];

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ] ?? character,
  );

const downloadBookingPdf = async (
  booking: GuestProfile["bookings"][number],
  profile: Pick<GuestProfile, "email" | "fullName" | "phone">,
) => {
  const bookingNumber = getBookingNumber(booking.id);
  const guests = booking.guestList ?? [];
  const contactName = [booking.contactFirstName, booking.contactLastName]
    .filter(Boolean)
    .join(" ");
  const clientName = contactName || profile.fullName || "";
  const clientEmail = booking.contactEmail || profile.email || "";
  const clientPhone =
    booking.contactPhone ||
    (profile.phone && !profile.phone.startsWith("email:") ? profile.phone : "");
  const children = guests.filter(
    (guest) => guest.type === "child" || guest.type === "baby",
  );
  const tariff = [
    booking.selectedOffer?.boardType,
    booking.selectedOffer?.rateType,
    booking.selectedOffer?.rateDescription,
  ]
    .filter(Boolean)
    .join(" · ");
  const document = window.document.createElement("div");

  document.style.cssText = [
    "position: fixed",
    "left: -10000px",
    "top: 0",
    "width: 794px",
    "padding: 56px",
    "box-sizing: border-box",
    "background: #f7f4ed",
    "color: #173f34",
    "font-family: Arial, sans-serif",
  ].join(";");
  document.innerHTML = `
    <div style="border-bottom: 2px solid #d9cdbb; padding-bottom: 22px;">
      <div style="font-size: 28px; font-weight: 700; letter-spacing: 2px;">АЛСМА</div>
      <div style="color: #6c716c; font-size: 14px; margin-top: 8px;">Подтверждение бронирования</div>
    </div>
    <div style="margin-top: 42px;">
      <div style="font-size: 28px; font-weight: 700;">${escapeHtml(booking.roomName)}</div>
      <div style="color: #6c716c; font-size: 16px; margin-top: 12px;">Номер брони: ${escapeHtml(booking.voucherNumber ?? bookingNumber)}</div>
    </div>
    <div style="margin-top: 42px; padding-top: 24px; border-top: 1px solid #d9cdbb;">
      <div style="font-size: 14px; color: #6c716c; margin-bottom: 14px;">Контактное лицо</div>
      <div style="font-size: 17px; line-height: 1.8;">${escapeHtml(clientName)}<br />${escapeHtml(clientEmail)}<br />${escapeHtml(clientPhone)}</div>
    </div>
    <div style="margin-top: 28px; padding-top: 24px; border-top: 1px solid #d9cdbb;">
      <div style="font-size: 14px; color: #6c716c; margin-bottom: 14px;">Тариф</div>
      <div style="font-size: 16px; line-height: 1.8;">${escapeHtml([booking.selectedOffer?.boardType, booking.selectedOffer?.rateType, booking.selectedOffer?.rateDescription].filter(Boolean).join(" · ") || "Не указан")}</div>
    </div>
    <div style="margin-top: 28px; padding-top: 24px; border-top: 1px solid #d9cdbb;">
      <div style="font-size: 14px; color: #6c716c; margin-bottom: 14px;">Состав гостей</div>
      <div style="font-size: 16px; line-height: 1.8;">Всего гостей: ${booking.guestsCount}<br />Дети: ${children.length ? `есть, ${children.length}` : "нет"}</div>
    </div>
    <div style="margin-top: 28px; padding-top: 24px; border-top: 1px solid #d9cdbb;">
      <div style="font-size: 14px; color: #6c716c; margin-bottom: 14px;">Тариф</div>
      <div style="font-size: 16px; line-height: 1.8;">${escapeHtml(tariff)}</div>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px 48px; margin-top: 42px;">
      <div><div style="color: #6c716c; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Заезд</div><div style="font-size: 19px; font-weight: 700; margin-top: 8px;">${formatDate(booking.checkInDate)}</div></div>
      <div><div style="color: #6c716c; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Выезд</div><div style="font-size: 19px; font-weight: 700; margin-top: 8px;">${formatDate(booking.checkOutDate)}</div></div>
      <div><div style="color: #6c716c; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Гости</div><div style="font-size: 19px; font-weight: 700; margin-top: 8px;">${booking.guestsCount} гостя</div></div>
      <div><div style="color: #6c716c; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Итоговая цена</div><div style="font-size: 19px; font-weight: 700; margin-top: 8px;">${booking.totalAmount ? `${Number(booking.totalAmount).toLocaleString("ru-RU")} ₽` : "По запросу"}</div></div>
    </div>
  `;
  window.document.body.appendChild(document);

  try {
    const canvas = await html2canvas(document, {
      backgroundColor: "#f7f4ed",
      scale: 2,
    });
    const pdf = new jsPDF({ format: "a4", unit: "mm" });
    const width = 190;
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, 10, width, height);
    pdf.save(`bron-${bookingNumber}.pdf`);
  } finally {
    document.remove();
  }
};

export const AccountBookingsSection = ({
  bookings,
  profile,
}: {
  bookings: GuestProfile["bookings"];
  profile: Pick<GuestProfile, "email" | "fullName" | "phone">;
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
                Номер брони:{" "}
                {booking.voucherNumber ?? getBookingNumber(booking.id)}
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
                {getBookingServices(booking.roomName, booking.status).map(
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
                onClick={() => void downloadBookingPdf(booking, profile)}
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
