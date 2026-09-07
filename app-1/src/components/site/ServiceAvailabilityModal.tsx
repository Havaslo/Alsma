import { useState } from "react";

import { DatePicker } from "@/components/ui/DatePicker";
import { Modal } from "@/components/ui/Modal";
import { useApiQuery } from "@/lib/query/use-api-query";
import { useServiceCart } from "@/lib/services/service-cart";
import { formatServiceTime } from "@/lib/services/service-time";
import {
  type Service,
  type ServiceVariant,
  loadServiceAvailability,
} from "@/lib/services/services-api";

const today = () => {
  const value = new Date();
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
};

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
  const [date, setDate] = useState(today);
  const [selectedStart, setSelectedStart] = useState("");
  const availability = useApiQuery(
    ["catalog-availability", variant.id, date],
    (signal) => loadServiceAvailability(service.id, variant.id, date, signal),
    {
      enabled: open && Boolean(date),
      errorMessage: "Не удалось загрузить слоты.",
    },
  );
  const availabilitySlots = [
    ...(availability.data?.blocks ?? []).map((slot) => ({
      ...slot,
      occupied: false,
    })),
    ...(availability.data?.occupiedBlocks ?? []).map((slot) => ({
      ...slot,
      occupied: true,
    })),
  ].sort(
    (left, right) =>
      new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
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
      <div className="space-y-5 pt-3 pb-5 sm:pt-4 sm:pb-6">
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
        <div className="text-sm font-semibold text-brand">
          <p>Дата</p>
          <DatePicker
            ariaLabel="Выберите дату"
            min={today()}
            triggerClassName="mt-2 rounded-xl border border-line bg-white px-3 py-3"
            value={date || today()}
            onChange={(value) => {
              setDate(value);
              setSelectedStart("");
            }}
          />
        </div>
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
              {availabilitySlots.map((slot) =>
                slot.occupied ? (
                  <button
                    aria-label={`Занято: ${formatServiceTime(slot.startsAt)}–${formatServiceTime(slot.endsAt)}`}
                    className="cursor-not-allowed rounded-xl border border-line bg-page p-3 text-sm font-semibold text-muted-ui-foreground opacity-60"
                    disabled
                    key={slot.startsAt}
                    type="button"
                  >
                    <span className="block">
                      {formatServiceTime(slot.startsAt)}–
                      {formatServiceTime(slot.endsAt)}
                    </span>
                    <span className="mt-1 block text-xs font-medium">
                      Занято
                    </span>
                  </button>
                ) : (
                  <button
                    className={`rounded-xl border p-3 text-sm font-semibold transition ${selectedStart === slot.startsAt ? "border-brand bg-brand text-white" : "border-line bg-white text-brand hover:border-brand"}`}
                    key={slot.startsAt}
                    onClick={() => setSelectedStart(slot.startsAt)}
                    type="button"
                  >
                    {formatServiceTime(slot.startsAt)}–
                    {formatServiceTime(slot.endsAt)}
                  </button>
                ),
              )}
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
