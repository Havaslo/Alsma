import { useEffect, useState } from "react";

import { useNavigate } from "@tanstack/react-router";

import { Modal } from "@/components/ui/Modal";
import {
  type ServiceOrderStatus,
  loadServiceOrderStatus,
} from "@/lib/services/services-api";
import { ROUTES } from "@/route-constants";

const isTerminal = (status: ServiceOrderStatus) =>
  ["paid", "refunded", "expired", "payment_failed"].includes(status.status);

export const ServicePaymentReturnNotice = () => {
  const navigate = useNavigate();
  const [orderId, setOrderId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("payment") === "return"
      ? params.get("serviceOrderId")
      : null;
  });
  const [order, setOrder] = useState<ServiceOrderStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    let attempts = 0;
    const controller = new AbortController();
    const check = async () => {
      try {
        const result = await loadServiceOrderStatus(orderId, controller.signal);
        if (cancelled) return;
        setOrder(result.data);
        setError("");
        attempts += 1;
        if (!isTerminal(result.data) && attempts < 12)
          window.setTimeout(() => void check(), 3000);
      } catch (requestError) {
        if (cancelled) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Не удалось проверить статус оплаты.",
        );
      }
    };
    void check();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [orderId]);

  const close = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("payment");
    url.searchParams.delete("serviceOrderId");
    window.history.replaceState({}, "", url.toString());
    setOrderId(null);
    setOrder(null);
    setError("");
  };

  if (!orderId) return null;
  const paid = order?.status === "paid";
  const refunding =
    order?.status === "refund_pending" || order?.status === "refunded";

  return (
    <Modal onClose={close} open title="Статус оплаты">
      <div className="py-8 text-center">
        {error ? (
          <>
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-destructive/10 text-2xl text-destructive">
              !
            </div>
            <h2 className="mt-5 font-heading text-3xl font-semibold text-brand">
              Не удалось проверить оплату
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted-ui-foreground">
              {error}
            </p>
          </>
        ) : paid ? (
          <>
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-brand text-3xl text-brand-foreground">
              ✓
            </div>
            <h2 className="mt-5 font-heading text-3xl font-semibold text-brand">
              Оплата подтверждена
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted-ui-foreground">
              Бронь оформлена. Сумма заказа — {order?.total} {order?.currency}.
            </p>
            <button
              className="mt-7 rounded-full bg-brand px-6 py-3 font-semibold text-brand-foreground"
              onClick={() => {
                close();
                navigate({ to: ROUTES.account });
              }}
              type="button"
            >
              Перейти в личный кабинет
            </button>
          </>
        ) : refunding ? (
          <>
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-accent-ui/20 text-2xl text-accent-ui-foreground">
              ₽
            </div>
            <h2 className="mt-5 font-heading text-3xl font-semibold text-brand">
              Оплата получена, выполняем возврат
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted-ui-foreground">
              Выбранное время уже занято или срок удержания истёк. Не повторяйте
              оплату — возврат будет обработан автоматически.
            </p>
          </>
        ) : order?.status === "expired" ||
          order?.status === "payment_failed" ? (
          <>
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-destructive/10 text-2xl text-destructive">
              !
            </div>
            <h2 className="mt-5 font-heading text-3xl font-semibold text-brand">
              Бронь не подтверждена
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted-ui-foreground">
              Слот освобождён. Деньги не списаны либо возврат уже запущен.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-brand/10 text-2xl text-brand">
              …
            </div>
            <h2 className="mt-5 font-heading text-3xl font-semibold text-brand">
              Проверяем оплату
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted-ui-foreground">
              Подтверждаем оплату и закрепляем выбранное время. Не закрывайте
              страницу и не оплачивайте заказ повторно.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
};
