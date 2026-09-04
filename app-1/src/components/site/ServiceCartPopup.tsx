import { type FormEvent, useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";

import { useServiceCart } from "@/lib/services/service-cart";
import { createServiceOrder } from "@/lib/services/services-api";
import { ROUTES } from "@/route-constants";

export const ServiceCartPopup = ({
  open,
  onClose,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
}) => {
  const cart = useServiceCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [step, setStep] = useState<"details" | "payment" | "success">(
    "details",
  );
  const [orderTotal, setOrderTotal] = useState<string | null>(null);
  if (!open) return null;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setStep("payment");
  };
  const pay = async () => {
    const result = await createServiceOrder({ ...form, items: cart.items });
    setOrderTotal(result.data.total);
    cart.clear();
    setStep("success");
  };
  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-brand/40 p-4"
      role="dialog"
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-3xl bg-page p-6">
        <div className="flex justify-between">
          <h2 className="font-heading text-3xl font-semibold text-brand">
            Корзина услуг
          </h2>
          <button aria-label="Закрыть" onClick={onClose} type="button">
            <X />
          </button>
        </div>
        {step === "success" ? (
          <div className="py-10 text-center text-brand">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-brand text-3xl text-brand-foreground">
              ✓
            </div>
            <h3 className="mt-5 font-heading text-3xl font-semibold">
              Покупка подтверждена
            </h3>
            <p className="mx-auto mt-3 max-w-md text-muted-ui-foreground">
              Услуги уже сохранены в вашем личном кабинете. Сумма заказа —{" "}
              {orderTotal} ₽.
            </p>
            <button
              className="mt-7 rounded-full bg-brand px-6 py-3 font-semibold text-brand-foreground"
              onClick={() => {
                onClose();
                navigate({ to: ROUTES.account });
              }}
              type="button"
            >
              Перейти в личный кабинет
            </button>
          </div>
        ) : step === "payment" ? (
          <div className="py-8">
            <div className="rounded-2xl border border-line bg-panel p-5">
              <p className="text-sm font-semibold tracking-[0.16em] text-brand uppercase">
                Демонстрационная оплата
              </p>
              <h3 className="mt-3 font-heading text-2xl font-semibold text-brand">
                Почти готово
              </h3>
              <p className="mt-3 text-muted-ui-foreground">
                Нажмите кнопку ниже, чтобы завершить тестовую оплату. Реальный
                платёжный сервис подключим следующим этапом.
              </p>
            </div>
            <button
              className="mt-6 w-full rounded-full bg-brand p-3 font-semibold text-brand-foreground"
              onClick={() => void pay()}
              type="button"
            >
              Оплатить в демо-режиме
            </button>
            <button
              className="mt-3 w-full rounded-full border border-line p-3 font-semibold text-brand"
              onClick={() => setStep("details")}
              type="button"
            >
              Вернуться к данным
            </button>
          </div>
        ) : (
          <>
            <div className="my-5 space-y-2">
              {cart.items.map((item) => (
                <div
                  className="flex justify-between rounded-xl bg-panel p-3"
                  key={`${item.variantId}-${item.startsAt}`}
                >
                  <span>
                    {item.serviceName ?? "Услуга"} ·{" "}
                    {item.variantName ?? item.variantId}
                    {item.startsAt &&
                      ` · ${item.startsAt.slice(0, 10)} ${item.startsAt.slice(11, 16)}`}
                  </span>
                  <button
                    onClick={() =>
                      cart.remove(item.variantId, item.startsAt ?? "")
                    }
                    type="button"
                  >
                    Убрать
                  </button>
                </div>
              ))}
            </div>
            <form className="space-y-3" onSubmit={submit}>
              {(["name", "email", "phone"] as const).map((field) => (
                <input
                  className="w-full rounded-xl border border-line p-3"
                  key={field}
                  placeholder={field}
                  required
                  value={form[field]}
                  onChange={(event) =>
                    setForm({ ...form, [field]: event.target.value })
                  }
                />
              ))}
              <button
                className="w-full rounded-full bg-brand p-3 font-semibold text-brand-foreground"
                disabled={!cart.items.length}
                type="submit"
              >
                Перейти к оплате
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
