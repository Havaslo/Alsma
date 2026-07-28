import { BadgeCheck, Eye } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  BOOKING_PAYMENT_LABELS,
  BOOKING_STATUS_LABELS,
  type MockBookingPayment,
  type MockBookingRequest,
  type MockBookingStatus,
} from "@/lib/admin/admin-booking-mocks";
import { cn } from "@/lib/cn";

const paymentTones: Record<MockBookingPayment, string> = {
  paid: "bg-brand/10 text-brand",
  partial: "bg-supporting/25 text-accent-ui-foreground",
  pending: "bg-supporting/25 text-accent-ui-foreground",
};

const statusTones: Record<MockBookingStatus, string> = {
  confirmed: "bg-brand/10 text-brand",
  new: "bg-supporting/25 text-accent-ui-foreground",
  "pending-confirmation": "bg-supporting/25 text-accent-ui-foreground",
  selection: "bg-supporting/25 text-accent-ui-foreground",
};

export const AdminBookingRequestsTable = ({
  items,
  onMarkPaid,
  onOpen,
}: {
  readonly items: readonly MockBookingRequest[];
  readonly onMarkPaid: (bookingId: string) => void;
  readonly onOpen: (requestId: string) => void;
}) => (
  <section className="overflow-hidden rounded-3xl border border-line bg-brand-foreground">
    <p className="border-b border-line px-5 py-4 text-sm font-semibold">
      Всего заявок: {items.length}
    </p>
    <div className="overflow-x-auto">
      <table className="w-full min-w-7xl border-collapse text-left text-sm">
        <thead className="bg-page text-xs font-semibold">
          <tr>
            <th className="px-5 py-4">Заявка</th>
            <th className="px-5 py-4">Поездка</th>
            <th className="px-5 py-4">Номер</th>
            <th className="px-5 py-4">Источник / создано</th>
            <th className="px-5 py-4">Статусы</th>
            <th className="px-5 py-4">Связанное обращение</th>
            <th className="px-5 py-4 text-right">Действия</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr className="border-t border-line align-top" key={item.id}>
              <td className="px-5 py-4">
                <strong className="block text-brand">{item.guestName}</strong>
                <span className="mt-1 block text-xs text-muted-ui-foreground">
                  {item.phone}
                </span>
                <span className="block text-xs text-muted-ui-foreground">
                  {item.email || "Почта не указана"}
                </span>
                <span className="mt-3 block max-w-64 text-xs leading-5">
                  {item.note}
                </span>
              </td>
              <td className="px-5 py-4">
                <strong className="block">
                  {item.checkInDate} — {item.checkOutDate}
                </strong>
                <span className="mt-1 block text-xs text-muted-ui-foreground">
                  {item.guestsCount} гостя(ей)
                </span>
              </td>
              <td className="px-5 py-4 font-medium">{item.roomName}</td>
              <td className="px-5 py-4">
                <strong className="block">{item.sourceLabel}</strong>
                <span className="mt-1 block text-xs text-muted-ui-foreground">
                  Создал: {item.createdBy}
                </span>
              </td>
              <td className="px-5 py-4">
                <div className="flex flex-col items-start gap-2">
                  <StatusChip
                    label={BOOKING_STATUS_LABELS[item.status]}
                    tone={statusTones[item.status]}
                  />
                  <StatusChip
                    label={BOOKING_PAYMENT_LABELS[item.payment]}
                    tone={paymentTones[item.payment]}
                  />
                </div>
              </td>
              <td className="px-5 py-4">
                <strong className="block">
                  Обращение #{item.linkedRequestId}
                </strong>
                <span className="mt-1 block max-w-52 text-xs text-muted-ui-foreground">
                  {item.linkedIntent}
                </span>
              </td>
              <td className="w-56 px-5 py-4">
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => onOpen(item.linkedRequestId)}
                    variant="secondary"
                  >
                    <Eye className="size-4" /> Открыть обращение
                  </Button>
                  <Button
                    className={cn(
                      item.payment === "paid" &&
                        "bg-brand/10 text-brand shadow-none",
                    )}
                    disabled={item.payment === "paid"}
                    onClick={() => onMarkPaid(item.id)}
                    variant="secondary"
                  >
                    <BadgeCheck className="size-4" />
                    {item.payment === "paid"
                      ? "Уже оплачено"
                      : "Отметить оплаченной"}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {!items.length && (
      <p className="p-12 text-center text-muted-ui-foreground">
        По выбранным фильтрам заявок нет.
      </p>
    )}
  </section>
);

const StatusChip = ({
  label,
  tone,
}: {
  readonly label: string;
  readonly tone: string;
}) => (
  <span
    className={cn(
      "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
      tone,
    )}
  >
    {label}
  </span>
);
