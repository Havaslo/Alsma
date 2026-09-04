import { useState } from "react";

import { ServiceAvailabilityModal } from "@/components/site/ServiceAvailabilityModal";
import { useServiceCart } from "@/lib/services/service-cart";
import { type Service, type ServiceVariant } from "@/lib/services/services-api";

export const ServiceVariantCard = ({
  service,
  variant,
}: {
  readonly service: Service;
  readonly variant: ServiceVariant;
}) => {
  const cart = useServiceCart();
  const [modalOpen, setModalOpen] = useState(false);
  const isProduct = variant.name.trim().toLocaleLowerCase("ru-RU") === "товар";
  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-page p-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <strong className="block truncate text-brand">{variant.name}</strong>
          {!isProduct && (
            <span className="mt-1 block text-xs text-muted-ui-foreground">
              {variant.durationMin ?? 60} минут
            </span>
          )}
          <span className="font-semibold text-brand md:hidden">
            {Number(variant.price).toLocaleString("ru-RU")} ₽
          </span>
        </div>
        <span className="hidden shrink-0 font-semibold text-brand md:block">
          {Number(variant.price).toLocaleString("ru-RU")} ₽
        </span>
        <div className="flex shrink-0 items-center gap-3">
          <button
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground"
            onClick={() => {
              if (isProduct) {
                cart.add({
                  variantId: variant.id,
                  quantity: 1,
                  serviceName: service.name,
                  variantName: variant.name,
                });
              } else setModalOpen(true);
            }}
            type="button"
          >
            Добавить
          </button>
        </div>
      </div>
      {!isProduct && (
        <ServiceAvailabilityModal
          onClose={() => setModalOpen(false)}
          open={modalOpen}
          service={service}
          variant={variant}
        />
      )}
    </>
  );
};
