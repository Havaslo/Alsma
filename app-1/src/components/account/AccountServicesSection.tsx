import { ShoppingBag } from "lucide-react";

import type { GuestProfile } from "@/lib/auth/guest-auth-api";
import { formatServiceDateTime } from "@/lib/services/service-time";

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
  })[status] ?? status;

const formatAmount = (total: string, currency: string) =>
  `${Number(total).toLocaleString("ru-RU")} ${currency}`;

type ServiceOrder = GuestProfile["serviceOrders"][number];

const AccountServiceOrderCard = ({ order }: { order: ServiceOrder }) => (
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
  </article>
);

export const AccountServicesSection = ({
  serviceOrders,
}: {
  serviceOrders: GuestProfile["serviceOrders"];
}) => {
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
          <AccountServiceOrderCard key={order.id} order={order} />
        ))}
        {!sortedServiceOrders.length && (
          <div className="rounded-3xl border border-line bg-panel p-8 text-muted-ui-foreground">
            Заказов услуг пока нет.
          </div>
        )}
      </div>
    </section>
  );
};
