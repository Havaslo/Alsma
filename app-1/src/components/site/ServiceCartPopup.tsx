import { type FormEvent, useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";

import { Modal } from "@/components/ui/Modal";
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
  const [step, setStep] = useState<"details" | "success">("details");
  const [orderTotal, setOrderTotal] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = await createServiceOrder({ ...form, items: cart.items });
    setOrderTotal(result.data.total);
    cart.clear();
    setStep("success");
  };
  return (
    <Modal open={open} onClose={onClose} title="Корзина услуг">
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
      ) : (
        <>
          <form className="space-y-5" onSubmit={submit}>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-page-foreground">
                Имя
                <input
                  className="mt-2 w-full rounded-2xl border border-line bg-page px-5 py-4 outline-none focus:border-focus"
                  placeholder="Ваше имя"
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                />
              </label>
              <label className="block text-sm font-medium text-page-foreground">
                Электронная почта
                <input
                  className="mt-2 w-full rounded-2xl border border-line bg-page px-5 py-4 outline-none focus:border-focus"
                  placeholder="you@example.com"
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                />
              </label>
              <label className="block text-sm font-medium text-page-foreground">
                Телефон
                <input
                  className="mt-2 w-full rounded-2xl border border-line bg-page px-5 py-4 outline-none focus:border-focus"
                  placeholder="+7 (___) ___-__-__"
                  required
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                />
              </label>
            </div>
            <div className="space-y-3 border-t border-line/70 pt-5">
              <h3 className="font-heading text-2xl font-semibold text-brand">
                Выбранные услуги
              </h3>
              {cart.items.map((item) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-2xl bg-page p-4"
                  key={`${item.variantId}-${item.startsAt}`}
                >
                  <div className="min-w-0">
                    <strong className="block text-brand">
                      {item.serviceName ?? "Услуга"}
                    </strong>
                    <span className="mt-1 block text-sm text-muted-ui-foreground">
                      {item.variantName ?? item.variantId}
                      {item.startsAt &&
                        ` · ${item.startsAt.slice(0, 10)} ${item.startsAt.slice(11, 16)}`}
                    </span>
                  </div>
                  <button
                    aria-label={`Удалить ${item.variantName ?? "услугу"} из корзины`}
                    className="grid size-10 shrink-0 place-items-center rounded-full border border-line text-brand transition hover:border-destructive hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    onClick={() =>
                      cart.remove(item.variantId, item.startsAt ?? "")
                    }
                    title="Удалить из корзины"
                    type="button"
                  >
                    <ShoppingCart aria-hidden="true" className="size-4" />
                  </button>
                </div>
              ))}
              {!cart.items.length && (
                <p className="rounded-2xl bg-page p-4 text-sm text-muted-ui-foreground">
                  Добавьте услуги в корзину, чтобы продолжить.
                </p>
              )}
              <button
                className="w-full rounded-full bg-brand p-3 font-semibold text-brand-foreground"
                disabled={!cart.items.length}
                type="submit"
              >
                Перейти к оплате
              </button>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
};
