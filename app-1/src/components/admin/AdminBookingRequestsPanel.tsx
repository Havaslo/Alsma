import { type ReactNode, useMemo, useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import { CirclePlus, Search } from "lucide-react";

import { AdminBookingForm } from "@/components/admin/AdminBookingForm";
import { AdminBookingRequestsTable } from "@/components/admin/AdminBookingRequestsTable";
import { Button } from "@/components/ui/Button";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { Modal } from "@/components/ui/Modal";
import {
  BOOKING_FORM_SOURCE_OPTIONS,
  BOOKING_SOURCE_OPTIONS,
  BOOKING_STATUS_OPTIONS,
  MOCK_BOOKINGS,
  type MockBookingDraft,
  type MockBookingRequest,
  type MockBookingSource,
  type MockBookingStatus,
} from "@/lib/admin/admin-booking-mocks";
import { buildRoute } from "@/lib/navigation";
import { ROUTES } from "@/route-constants";

type SourceFilter = MockBookingSource | "all";
type StatusFilter = MockBookingStatus | "all";

const formatInputDate = (value: string) => value.split("-").reverse().join(".");

export const AdminBookingRequestsPanel = () => {
  const [bookings, setBookings] = useState<MockBookingRequest[]>(() => [
    ...MOCK_BOOKINGS,
  ]);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [source, setSource] = useState<SourceFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const items = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("ru-RU");
    return bookings.filter((item) => {
      const haystack = [item.email, item.guestName, item.phone, item.roomName]
        .join(" ")
        .toLocaleLowerCase("ru-RU");
      return (
        (source === "all" || item.source === source) &&
        (status === "all" || item.status === status) &&
        (!term || haystack.includes(term))
      );
    });
  }, [bookings, search, source, status]);

  const createBooking = (draft: MockBookingDraft) => {
    const sourceLabel =
      BOOKING_FORM_SOURCE_OPTIONS.find(
        (option) => option.value === draft.source,
      )?.label ?? "Вручную";
    setBookings((current) => [
      {
        ...draft,
        checkInDate: formatInputDate(draft.checkInDate),
        checkOutDate: formatInputDate(draft.checkOutDate),
        createdBy: "Вручную",
        id: `booking-${current.length + 1}`,
        linkedIntent: "Новое обращение",
        linkedRequestId: "1",
        payment: "pending",
        sourceLabel,
        status: "new",
      },
      ...current,
    ]);
    setShowForm(false);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-line bg-brand-foreground p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Заявки на бронирование</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-ui-foreground">
              Заявки от агентов и менеджеров со статусами этапа и оплаты,
              привязкой к обращениям и быстрыми действиями.
            </p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <CirclePlus className="size-4" /> Новая заявка
          </Button>
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(20rem,1fr)_14rem_15rem]">
          <label>
            <span className="mb-2 block text-sm font-medium text-muted-ui-foreground">
              Поиск
            </span>
            <span className="flex min-h-12 items-center gap-3 rounded-2xl border border-line bg-page px-4">
              <Search className="size-4 text-muted-ui-foreground" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-ui-foreground"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Имя, телефон, почта, номер"
                value={search}
              />
            </span>
          </label>
          <FilterField label="Источник">
            <DropdownSelect<SourceFilter>
              ariaLabel="Фильтр заявок по источнику"
              onChange={setSource}
              options={BOOKING_SOURCE_OPTIONS}
              triggerClassName="min-h-12 rounded-2xl border border-line bg-page px-4 text-sm"
              value={source}
            />
          </FilterField>
          <FilterField label="Статус заявки">
            <DropdownSelect<StatusFilter>
              ariaLabel="Фильтр заявок по статусу"
              onChange={setStatus}
              options={BOOKING_STATUS_OPTIONS}
              triggerClassName="min-h-12 rounded-2xl border border-line bg-page px-4 text-sm"
              value={status}
            />
          </FilterField>
        </div>
      </section>

      <AdminBookingRequestsTable
        items={items}
        onMarkPaid={(bookingId) =>
          setBookings((current) =>
            current.map((booking) =>
              booking.id === bookingId
                ? { ...booking, payment: "paid" }
                : booking,
            ),
          )
        }
        onOpen={(requestId) =>
          navigate({
            to: buildRoute(ROUTES.adminRequest, { requestId }),
          })
        }
      />

      <Modal
        className="max-w-3xl"
        closeLabel="Закрыть форму новой заявки"
        onClose={() => setShowForm(false)}
        open={showForm}
        title="Новая заявка"
      >
        <AdminBookingForm
          onCancel={() => setShowForm(false)}
          onCreate={createBooking}
        />
      </Modal>
    </div>
  );
};

const FilterField = ({
  children,
  label,
}: {
  readonly children: ReactNode;
  readonly label: string;
}) => (
  <label>
    <span className="mb-2 block text-sm font-medium text-muted-ui-foreground">
      {label}
    </span>
    {children}
  </label>
);
