import { useState } from "react";

import { CircleX, Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { getApiErrorMessage } from "@/lib/api/api-error";
import {
  type GuestProfile,
  requestServiceOrderCancellation,
} from "@/lib/auth/guest-auth-api";
import { formatServiceDateTime } from "@/lib/services/service-time";
import { resumeServiceOrderPayment } from "@/lib/services/services-api";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const formatStatus = (status: string) =>
  ({
    paid: "Оплачено",
    succeeded: "Оплачено",
    awaiting_payment: "Ожидает оплаты",
    pending: "Ожидает оплаты",
    payment_failed: "Ошибка оплаты",
    canceled: "Отменено",
    confirmed: "Подтверждено",
    completed: "Завершено",
    cancelled: "Отменено",
    held: "Временно удерживается",
    expired: "Время оплаты истекло",
    refund_pending: "Ожидает возврата",
    refunded: "Возвращено",
    cancellation_pending: "Отмена выполняется",
    cancellation_requested: "Запрос на отмену принят",
    cancellation_failed: "Ошибка отмены",
  })[status] ?? status;

const formatAmount = (total: string, currency: string) =>
  `${Number(total).toLocaleString("ru-RU")} ${currency}`;

type ServiceOrder = GuestProfile["serviceOrders"][number];

const canCancelServiceOrder = (order: ServiceOrder) => {
  if (
    !["awaiting_payment", "paid"].includes(order.status) ||
    ["requested", "processing", "succeeded"].includes(order.cancellationStatus)
  )
    return false;
  return order.items.every(
    (item) => !item.booking || new Date(item.booking.startsAt) > new Date(),
  );
};

const AccountServiceOrderCard = ({
  order,
  onCancel,
  onResumePayment,
  resuming,
}: {
  order: ServiceOrder;
  onCancel: (order: ServiceOrder) => void;
  onResumePayment: (order: ServiceOrder) => void;
  resuming: boolean;
}) => (
  <article className="rounded-4xl border border-line bg-panel p-6 sm:p-8">
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
      <div>
        <h3 className="text-xl font-semibold text-brand">Заказ услуг</h3>
        <p className="mt-2 text-sm text-muted-ui-foreground">
          Покупка/бронирование {formatDate(order.createdAt)}
        </p>
      </div>
      <span className="w-fit rounded-full border border-line bg-page px-4 py-2 text-sm font-semibold text-brand">
        {formatStatus(order.status)}
      </span>
    </div>

    <dl className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <dt className="text-xs tracking-wider text-muted-ui-foreground uppercase">
          Дата покупки/бронирования
        </dt>
        <dd className="mt-2 font-semibold">{formatDate(order.createdAt)}</dd>
      </div>
      <div>
        <dt className="text-xs tracking-wider text-muted-ui-foreground uppercase">
          Статус оплаты
        </dt>
        <dd className="mt-2 font-semibold text-brand">
          {formatStatus(order.paymentStatus ?? order.status)}
        </dd>
      </div>
      <div>
        <dt className="text-xs tracking-wider text-muted-ui-foreground uppercase">
          Сумма
        </dt>
        <dd className="mt-2 font-semibold text-brand">
          {formatAmount(order.total, order.currency)}
        </dd>
      </div>
    </dl>

    <div className="mt-7 space-y-3">
      <p className="text-xs tracking-wider text-muted-ui-foreground uppercase">
        Состав покупки
      </p>
      {order.items.map((item, index) => (
        <div
          className="rounded-2xl bg-page p-4"
          key={`${order.id}-${item.serviceName}-${item.variantName}-${index}`}
        >
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold text-brand">{item.serviceName}</p>
              <p className="mt-1 text-sm text-muted-ui-foreground">
                {item.variantName} · {item.quantity} шт.
              </p>
            </div>
            {item.booking && (
              <div className="text-sm sm:text-right">
                <p className="font-semibold text-brand">
                  {formatServiceDateTime(item.booking.startsAt)}
                </p>
                <p className="mt-1 text-muted-ui-foreground">
                  {formatStatus(item.booking.status)}
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>

    {canCancelServiceOrder(order) && (
      <button
        className="mt-7 inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 py-3 font-semibold text-red-800 transition hover:bg-red-100"
        onClick={() => onCancel(order)}
        type="button"
      >
        <CircleX className="size-4" /> Отменить заказ
      </button>
    )}
    {order.status === "awaiting_payment" && order.paymentUrl && (
      <button
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 font-semibold text-brand-foreground disabled:cursor-not-allowed disabled:opacity-60"
        disabled={resuming}
        onClick={() => onResumePayment(order)}
        type="button"
      >
        {resuming && <Loader2 className="size-4 animate-spin" />}
        Вернуться к оплате
      </button>
    )}
  </article>
);

export const AccountServicesSection = ({
  serviceOrders,
  onOrderChanged,
}: {
  serviceOrders: GuestProfile["serviceOrders"];
  onOrderChanged?: () => Promise<void>;
}) => {
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resumingOrderId, setResumingOrderId] = useState<string | null>(null);
  const sortedServiceOrders = [...serviceOrders].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );

  return (
    <section className="mt-10">
      <div className="flex items-center gap-3">
        <ShoppingBag className="size-7 text-brand" />
        <h2 className="font-heading text-3xl font-semibold text-brand">
          Мои услуги
        </h2>
      </div>
      <div className="mt-6 space-y-5">
        {sortedServiceOrders.map((order) => (
          <AccountServiceOrderCard
            key={order.id}
            onCancel={setSelectedOrder}
            onResumePayment={(selected) => {
              setResumingOrderId(selected.id);
              const returnUrl = new URL(window.location.href);
              returnUrl.searchParams.delete("payment");
              returnUrl.searchParams.delete("serviceOrderId");
              void resumeServiceOrderPayment({
                orderId: selected.id,
                returnUrl: returnUrl.toString(),
              })
                .then(({ data }) => {
                  if (data.paymentUrl) window.location.assign(data.paymentUrl);
                  else toast.info("Заказ уже обработан.");
                })
                .catch((error: unknown) => {
                  toast.error(
                    getApiErrorMessage(
                      error,
                      "Не удалось вернуть заказ к оплате.",
                    ),
                  );
                })
                .finally(() => setResumingOrderId(null));
            }}
            order={order}
            resuming={resumingOrderId === order.id}
          />
        ))}
        {!sortedServiceOrders.length && (
          <div className="rounded-3xl border border-line bg-panel p-8 text-muted-ui-foreground">
            Заказов услуг пока нет.
          </div>
        )}
      </div>
      <Modal
        onClose={() => {
          if (!isSubmitting) setSelectedOrder(null);
        }}
        open={Boolean(selectedOrder)}
        title="Отмена заказа услуг"
      >
        <div className="space-y-5 py-3">
          <p className="leading-7 text-muted-ui-foreground">
            Заказ и выбранное время будут отменены. Если заказ уже оплачен,
            запустим полный возврат денег через ЮKassa.
          </p>
          <label className="block text-sm font-semibold text-brand">
            Причина отмены{" "}
            <span className="font-normal text-muted-ui-foreground">
              (необязательно)
            </span>
            <textarea
              className="mt-2 min-h-28 w-full resize-y rounded-2xl border border-line bg-page px-4 py-3 font-normal outline-none focus:border-brand"
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Например: изменились планы"
              value={reason}
            />
          </label>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              className="rounded-full border border-line px-5 py-3 font-semibold text-brand"
              disabled={isSubmitting}
              onClick={() => setSelectedOrder(null)}
              type="button"
            >
              Не отменять
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 font-semibold text-brand-foreground disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting || !selectedOrder}
              onClick={() => {
                if (!selectedOrder) return;
                setIsSubmitting(true);
                void requestServiceOrderCancellation({
                  orderId: selectedOrder.id,
                  reason: reason.trim() || undefined,
                })
                  .then(({ data }) => {
                    setSelectedOrder(null);
                    setReason("");
                    toast.success(
                      data.order.status === "refunded"
                        ? "Заказ отменён, деньги возвращены."
                        : data.order.status === "refund_pending"
                          ? "Заказ отменён, возврат выполняется."
                          : "Заказ отменён, слот освобождён.",
                    );
                    return onOrderChanged?.();
                  })
                  .catch((error: unknown) => {
                    toast.error(
                      getApiErrorMessage(
                        error,
                        "Не удалось отменить заказ услуг.",
                      ),
                    );
                  })
                  .finally(() => setIsSubmitting(false));
              }}
              type="button"
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Подтвердить отмену
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
};
