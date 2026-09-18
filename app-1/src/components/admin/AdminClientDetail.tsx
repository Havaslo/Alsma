import { useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";

import { AdminClientBonusModal } from "@/components/admin/AdminClientBonusModal";
import { AdminClientEditModal } from "@/components/admin/AdminClientEditModal";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Loader } from "@/components/ui/Loader";
import { useAdminClient, useDeleteAdminClient } from "@/lib/admin/useAdmin";
import { ROUTES } from "@/route-constants";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("ru-RU").format(new Date(value));
const formatMoney = (value: string | null) =>
  value
    ? new Intl.NumberFormat("ru-RU", {
        currency: "RUB",
        maximumFractionDigits: 0,
        style: "currency",
      }).format(Number(value))
    : "—";
const levelLabel = (level?: string) =>
  ({ gold: "Gold", silver: "Silver", standard: "Standard" })[
    level ?? "standard"
  ] ?? level;
const bookingStatusLabel = (status: string) =>
  ({
    awaiting_payment: "Ожидает оплаты",
    cancellation_failed: "Ошибка отмены",
    cancelled: "Отменена",
    confirmed: "Подтверждена",
    payment_sync_failed: "Ошибка подтверждения оплаты",
    payment_sync_pending: "Подтверждение оплаты",
  })[status] ?? status;
const paymentStatusLabel = (status: string) =>
  ({
    creation_failed: "Ошибка создания",
    payment_pending: "Ожидает оплаты",
    succeeded: "Оплачено",
  })[status] ?? status;

export const AdminClientDetail = ({
  clientId,
}: {
  readonly clientId: string;
}) => {
  const navigate = useNavigate();
  const clientQuery = useAdminClient(clientId);
  const remove = useDeleteAdminClient();
  const [editOpen, setEditOpen] = useState(false);
  const [bonusOpen, setBonusOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"services" | "bookings">(
    "services",
  );
  const client = clientQuery.data?.client;

  if (clientQuery.isLoading)
    return (
      <div className="grid min-h-80 place-items-center">
        <Loader className="text-brand" size="lg" />
      </div>
    );
  if (!client)
    return (
      <section className="rounded-3xl border border-line bg-brand-foreground p-8">
        <h1 className="text-2xl font-semibold">Клиент не найден</h1>
        <Button
          className="mt-5"
          onClick={() => navigate({ to: ROUTES.adminClients })}
        >
          Вернуться к клиентам
        </Button>
      </section>
    );

  const visiblePhone = client.phone.startsWith("email:") ? "—" : client.phone;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-line bg-brand-foreground p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <h1 className="text-3xl font-semibold">
              {client.fullName || "Без имени"}
            </h1>
            <p className="mt-2 text-sm text-muted-ui-foreground">
              Контакт, бонусная программа, услуги и брони клиента.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setEditOpen(true)} variant="secondary">
              <Pencil className="size-4" /> Редактировать
            </Button>
            <Button onClick={() => setBonusOpen(true)} variant="secondary">
              Изменить бонусы
            </Button>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4" /> Удалить
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="rounded-3xl border border-line bg-brand-foreground p-6">
          <h2 className="text-xl font-semibold">Контакт</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-muted-ui-foreground">Телефон</dt>
              <dd className="mt-1 font-semibold">{visiblePhone}</dd>
            </div>
            <div>
              <dt className="text-muted-ui-foreground">Почта</dt>
              <dd className="mt-1 font-semibold">{client.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-ui-foreground">Источник</dt>
              <dd className="mt-1 font-semibold">{client.source}</dd>
            </div>
            <div>
              <dt className="text-muted-ui-foreground">Покупок услуг</dt>
              <dd className="mt-1 font-semibold">
                {client._count.serviceOrders}
              </dd>
            </div>
            <div>
              <dt className="text-muted-ui-foreground">Броней номеров</dt>
              <dd className="mt-1 font-semibold">{client.bookings.length}</dd>
            </div>
          </dl>
        </section>
        <section className="rounded-3xl border border-line bg-brand-foreground p-6">
          <h2 className="text-xl font-semibold">Бонусная программа</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-muted-ui-foreground">Статус</dt>
              <dd className="mt-1 font-semibold">
                {client.bonusProgram ? "Активна" : "Не подключена"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-ui-foreground">Уровень</dt>
              <dd className="mt-1 font-semibold">
                {levelLabel(client.bonusProgram?.level)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-ui-foreground">Баллы</dt>
              <dd className="mt-1 font-semibold">
                {client.bonusProgram?.balance ?? 0}
              </dd>
            </div>
          </dl>
        </section>
        <section className="rounded-3xl border border-line bg-brand-foreground p-6">
          <h2 className="text-xl font-semibold">Активность</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-muted-ui-foreground">Создан</dt>
              <dd className="mt-1 font-semibold">
                {formatDate(client.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-ui-foreground">Обновлён</dt>
              <dd className="mt-1 font-semibold">
                {formatDate(client.updatedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-ui-foreground">Покупок услуг</dt>
              <dd className="mt-1 font-semibold">
                {client._count.serviceOrders}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="rounded-3xl border border-line bg-brand-foreground p-6">
        <div
          aria-label="Разделы клиента"
          className="flex flex-wrap gap-2 border-b border-line pb-4"
          role="tablist"
        >
          {(
            [
              ["services", "Услуги"],
              ["bookings", "Брони"],
            ] as const
          ).map(([tab, label]) => (
            <button
              aria-selected={activeTab === tab}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === tab
                  ? "bg-brand text-brand-foreground"
                  : "text-muted-ui-foreground hover:bg-page"
              }`}
              key={tab}
              onClick={() => setActiveTab(tab)}
              role="tab"
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "services" ? (
          <div className="pt-5">
            <h2 className="text-xl font-semibold">Купленные услуги</h2>
            <p className="mt-1 text-sm text-muted-ui-foreground">
              Оплаченные покупки из личного кабинета клиента.
            </p>
            <div className="mt-5 space-y-3">
              {client.serviceOrders.map((order) => (
                <article
                  className="rounded-2xl border border-line bg-page p-4"
                  key={order.id}
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <strong>{formatDate(order.createdAt)}</strong>
                    <span className="font-semibold text-brand">
                      {formatMoney(order.total)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-ui-foreground">
                    {order.items
                      .map(
                        ({ service, variant, quantity }) =>
                          `${service.name} · ${variant.name} × ${quantity}`,
                      )
                      .join(", ")}
                  </p>
                </article>
              ))}
              {!client.serviceOrders.length && (
                <p className="rounded-2xl border border-line bg-page p-5 text-sm text-muted-ui-foreground">
                  Оплаченных услуг пока нет.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="pt-5">
            <h2 className="text-xl font-semibold">Брони номеров</h2>
            <p className="mt-1 text-sm text-muted-ui-foreground">
              История бронирований клиента и их текущие статусы.
            </p>
            <div className="mt-5 space-y-3">
              {client.bookings.map((booking) => (
                <article
                  className="rounded-2xl border border-line bg-page p-4"
                  key={booking.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-brand">
                        {booking.roomName}
                      </h3>
                      <p className="mt-1 text-sm text-muted-ui-foreground">
                        {formatDate(booking.checkInDate)} —{" "}
                        {formatDate(booking.checkOutDate)}
                      </p>
                    </div>
                    <span className="rounded-full border border-line px-3 py-1 text-xs font-semibold">
                      {bookingStatusLabel(booking.status)}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <span className="text-muted-ui-foreground">
                        Номер брони
                      </span>
                      <p className="mt-1 font-semibold">
                        {booking.voucherNumber ??
                          `ALS-${booking.id.slice(0, 8).toUpperCase()}`}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-ui-foreground">Гости</span>
                      <p className="mt-1 font-semibold">
                        {booking.guestsCount}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-ui-foreground">Оплата</span>
                      <p className="mt-1 font-semibold">
                        {paymentStatusLabel(booking.paymentStatus)}
                        {booking.totalAmount
                          ? ` · ${formatMoney(booking.totalAmount)}`
                          : ""}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
              {!client.bookings.length && (
                <p className="rounded-2xl border border-line bg-page p-5 text-sm text-muted-ui-foreground">
                  Броней номеров пока нет.
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {editOpen && (
        <AdminClientEditModal
          client={client}
          onClose={() => setEditOpen(false)}
          open
        />
      )}
      {bonusOpen && (
        <AdminClientBonusModal
          client={client}
          onClose={() => setBonusOpen(false)}
          open
        />
      )}
      <ConfirmModal
        confirmLabel="Удалить клиента"
        onClose={() => setDeleteOpen(false)}
        onConfirm={() =>
          remove.mutate(client.id, {
            onSuccess: () => navigate({ to: ROUTES.adminClients }),
          })
        }
        open={deleteOpen}
        title="Удалить клиента?"
      >
        Клиент, его бонусная программа и история купленных услуг будут удалены
        без возможности восстановления.
      </ConfirmModal>
    </div>
  );
};
