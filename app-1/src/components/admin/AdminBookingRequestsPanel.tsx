import { useMemo, useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";

import { AdminBookingRequestsTable } from "@/components/admin/AdminBookingRequestsTable";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import type { BookingRequest } from "@/lib/admin/admin-api";
import { useAdminBookings, useUpdateAdminRequest } from "@/lib/admin/useAdmin";
import { buildRoute } from "@/lib/navigation";
import { ROUTES } from "@/route-constants";

type Status = BookingRequest["status"] | "all";
const statusOptions = [
  { label: "Все статусы", value: "all" },
  { label: "Новая", value: "new" },
  { label: "В работе", value: "processing" },
  { label: "Выполнена", value: "completed" },
  { label: "Отменена", value: "cancelled" },
] satisfies readonly { label: string; value: Status }[];

export const AdminBookingRequestsPanel = () => {
  const bookings = useAdminBookings();
  const updateRequest = useUpdateAdminRequest();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const items = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("ru-RU");
    return (bookings.data?.items ?? []).filter((item) => {
      const haystack = [
        item.guestName,
        item.phone,
        item.email,
        item.roomName,
        item.description,
        item.adminRequest.title,
        item.adminRequest.category,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("ru-RU");
      return (
        (status === "all" || item.status === status) &&
        (!term || haystack.includes(term))
      );
    });
  }, [bookings.data?.items, search, status]);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-line bg-brand-foreground p-6">
        <h1 className="text-3xl font-semibold">Заявки от агентов</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-ui-foreground">
          Здесь отображаются заявки, которые агенты создали из диалогов: на
          бронирование, обратный звонок, мероприятия и другие вопросы. Полная
          переписка и история чатов находятся в разделе «Обращения».
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-[minmax(20rem,1fr)_14rem]">
          <label>
            <span className="mb-2 block text-sm font-medium text-muted-ui-foreground">
              Поиск
            </span>
            <span className="flex min-h-12 items-center gap-3 rounded-2xl border border-line bg-page px-4">
              <Search className="size-4 text-muted-ui-foreground" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-ui-foreground"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Имя, телефон, почта, описание"
                value={search}
              />
            </span>
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-muted-ui-foreground">
              Статус заявки
            </span>
            <DropdownSelect<Status>
              ariaLabel="Фильтр заявок по статусу"
              onChange={setStatus}
              options={statusOptions}
              triggerClassName="min-h-12 rounded-2xl border border-line bg-page px-4 text-sm"
              value={status}
            />
          </label>
        </div>
      </section>
      {bookings.isLoading ? (
        <section className="rounded-3xl border border-line bg-brand-foreground p-12 text-center text-muted-ui-foreground">
          Загружаем реальные заявки…
        </section>
      ) : (
        <AdminBookingRequestsTable
          items={items}
          onOpen={(requestId) =>
            navigate({
              to: buildRoute(ROUTES.adminRequest, { requestId }),
            })
          }
          onStatusChange={(requestId, nextStatus) =>
            updateRequest.mutate({ recordId: requestId, status: nextStatus })
          }
          updatingId={
            updateRequest.isPending
              ? updateRequest.variables?.recordId
              : undefined
          }
        />
      )}
    </div>
  );
};
