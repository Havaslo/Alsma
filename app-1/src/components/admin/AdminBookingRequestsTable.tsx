import { Eye } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { BookingRequest } from "@/lib/admin/admin-api";

const statusLabels: Record<BookingRequest["status"], string> = {
  cancelled: "Отменена",
  completed: "Выполнена",
  new: "Новая",
  processing: "В работе",
};

export const AdminBookingRequestsTable = ({
  items,
  onOpen,
  onStatusChange,
  updatingId,
}: {
  readonly items: readonly BookingRequest[];
  readonly onOpen: (requestId: string) => void;
  readonly onStatusChange: (
    requestId: string,
    status: BookingRequest["status"],
  ) => void;
  readonly updatingId?: string;
}) => (
  <section className="overflow-hidden rounded-3xl border border-line bg-brand-foreground">
    <p className="border-b border-line px-5 py-4 text-sm font-semibold">
      Всего заявок: {items.length}
    </p>
    <div className="overflow-x-auto">
      <table className="w-full min-w-5xl border-collapse text-left text-sm">
        <thead className="bg-page text-xs font-semibold">
          <tr>
            <th className="px-5 py-4">Заявитель</th>
            <th className="px-5 py-4">Описание заявки</th>
            <th className="px-5 py-4">Даты / гости</th>
            <th className="px-5 py-4">Номер</th>
            <th className="px-5 py-4">Статус заявки</th>
            <th className="px-5 py-4">Обращение</th>
            <th className="px-5 py-4">Создана</th>
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
                {item.email && (
                  <span className="block text-xs text-muted-ui-foreground">
                    {item.email}
                  </span>
                )}
              </td>
              <td className="px-5 py-4">
                <strong className="block">{item.adminRequest.title}</strong>
                <span className="mt-1 block text-xs text-muted-ui-foreground">
                  {item.adminRequest.category}
                </span>
                {item.description && (
                  <p className="mt-2 max-w-sm text-xs whitespace-pre-wrap text-muted-ui-foreground">
                    {item.description}
                  </p>
                )}
                <Button
                  className="mt-2 px-3"
                  onClick={() => onOpen(item.adminRequestId)}
                  variant="secondary"
                >
                  <Eye className="size-4" /> Открыть обращение
                </Button>
              </td>
              <td className="px-5 py-4">
                {item.checkInDate && item.checkOutDate
                  ? `${new Date(item.checkInDate).toLocaleDateString("ru-RU")} — ${new Date(item.checkOutDate).toLocaleDateString("ru-RU")}`
                  : "Не бронирование"}
                {item.guestsCount > 0 && (
                  <span className="mt-1 block text-xs text-muted-ui-foreground">
                    Гостей: {item.guestsCount}
                  </span>
                )}
              </td>
              <td className="px-5 py-4">{item.guestsCount}</td>
              <td className="px-5 py-4">{item.roomName ?? "Не выбран"}</td>
              <td className="px-5 py-4">
                <select
                  aria-label={`Статус заявки ${item.guestName}`}
                  className="rounded-xl border border-line bg-page px-3 py-2 text-xs font-semibold text-brand outline-none disabled:opacity-50"
                  disabled={updatingId === item.adminRequestId}
                  onChange={(event) =>
                    onStatusChange(
                      item.adminRequestId,
                      event.target.value as BookingRequest["status"],
                    )
                  }
                  value={item.status}
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-5 py-4 text-muted-ui-foreground">
                {new Date(item.createdAt).toLocaleString("ru-RU")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {!items.length && (
      <p className="p-12 text-center text-muted-ui-foreground">
        Заявок от агентов пока нет.
      </p>
    )}
  </section>
);
