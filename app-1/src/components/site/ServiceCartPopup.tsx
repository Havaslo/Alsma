import { type FormEvent, useState } from "react";

import { X } from "lucide-react";

import { useServiceCart } from "@/lib/services/service-cart";
import { createServiceOrder } from "@/lib/services/services-api";

export const ServiceCartPopup = ({
  open,
  onClose,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
}) => {
  const cart = useServiceCart();
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [sent, setSent] = useState(false);
  if (!open) return null;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await createServiceOrder({ ...form, items: cart.items });
    cart.clear();
    setSent(true);
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
        {sent ? (
          <p className="py-12 text-brand">
            Заявка принята, менеджер подтвердит записи.
          </p>
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
                    {item.variantName ?? item.variantId} ·{" "}
                    {new Date(item.startsAt!).toLocaleString("ru-RU")}
                  </span>
                  <button
                    onClick={() => cart.remove(item.variantId, item.startsAt!)}
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
                Оформить без оплаты
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
