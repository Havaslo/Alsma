import { useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { useApiQuery } from "@/lib/query/use-api-query";
import { useServiceCart } from "@/lib/services/service-cart";
import {
  type Service,
  type ServiceVariant,
  loadServiceAvailability,
} from "@/lib/services/services-api";

const formatTime = (value: string) => value.slice(11, 16);

export const ServiceAvailabilityModal = ({
  service,
  variant,
  onClose,
  open,
}: {
  readonly service: Service;
  readonly variant: ServiceVariant;
  readonly onClose: () => void;
  readonly open: boolean;
}) => {
  const cart = useServiceCart();
  const [date, setDate] = useState("");
  const [selectedStart, setSelectedStart] = useState("");
  const availability = useApiQuery(
    ["catalog-availability", variant.id, date],
    (signal) => loadServiceAvailability(service.id, variant.id, date, signal),
    {
      enabled: open && Boolean(date),
      errorMessage: "Не удалось загрузить слоты.",
    },
  );
  const addToCart = () => {
    if (!selectedStart) return;
    cart.add({
      variantId: variant.id,
      quantity: 1,
      startsAt: selectedStart,
      serviceName: service.name,
      variantName: variant.name,
    });
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Выберите дату и время">
      <div className="space-y-5 py-5 sm:py-6">
        <div className="space-y-1 text-sm text-muted-ui-foreground">
          <p>
            <span className="font-semibold text-brand">Услуга:</span>{" "}
            {service.name}
          </p>
          <p>
            <span className="font-semibold text-brand">Тип услуги:</span>{" "}
            {variant.name}
          </p>
        </div>
        <label className="block text-sm font-semibold text-brand">
          Дата
          <input
            className="mt-2 w-full rounded-xl border border-line bg-white p-3"
            min={new Date().toISOString().slice(0, 10)}
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setSelectedStart("");
            }}
          />
        </label>
        {date && (
          <div>
            <p className="text-sm font-semibold text-brand">Доступное время</p>
            {availability.isLoading && (
              <p className="mt-3 text-sm">Загрузка…</p>
            )}
            {!availability.isLoading && !availability.data?.blocks.length && (
              <p className="mt-3 rounded-xl bg-page p-3 text-sm text-muted-ui-foreground">
                На эту дату свободного времени нет.
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {availability.data?.blocks.map((slot) => (
                <button
                  className={`rounded-xl border p-3 text-sm font-semibold transition ${selectedStart === slot.startsAt ? "border-brand bg-brand text-white" : "border-line bg-page text-brand hover:border-brand"}`}
                  key={slot.startsAt}
                  onClick={() => setSelectedStart(slot.startsAt)}
                  type="button"
                >
                  {formatTime(slot.startsAt)}–{formatTime(slot.endsAt)}
                </button>
              ))}
            </div>
          </div>
        )}
        <button
          className="w-full rounded-full bg-brand p-3 font-semibold text-brand-foreground disabled:opacity-50"
          disabled={!selectedStart}
          onClick={addToCart}
          type="button"
        >
          Добавить в корзину
        </button>
      </div>
    </Modal>
  );
};
