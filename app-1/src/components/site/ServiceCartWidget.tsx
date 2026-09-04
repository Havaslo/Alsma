import { useState } from "react";

import { ShoppingCart } from "lucide-react";

import { ServiceCartPopup } from "@/components/site/ServiceCartPopup";
import { useServiceCart } from "@/lib/services/service-cart";

export const ServiceCartWidget = () => {
  const [open, setOpen] = useState(false);
  const cart = useServiceCart();

  return (
    <>
      <div className="fixed right-4 bottom-24 z-40 sm:right-6 sm:bottom-28">
        <button
          aria-label={`Открыть корзину (${cart.count})`}
          className="relative grid size-14 place-items-center rounded-full bg-red-600 text-white shadow-xl transition hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
          onClick={() => setOpen(true)}
          type="button"
        >
          <ShoppingCart className="size-6" />
          {cart.count > 0 && (
            <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-white text-xs font-bold text-red-600 shadow">
              {cart.count}
            </span>
          )}
        </button>
      </div>
      <ServiceCartPopup onClose={() => setOpen(false)} open={open} />
    </>
  );
};
