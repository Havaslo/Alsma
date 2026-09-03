import {
  type ReactNode,
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

import type { ServiceCartItem } from "@/lib/services/services-api";

type CartContextValue = {
  items: ServiceCartItem[];
  add: (item: ServiceCartItem) => void;
  remove: (variantId: string, startsAt: string) => void;
  clear: () => void;
  count: number;
};
const CartContext = createContext<CartContextValue | null>(null);
export const ServiceCartProvider = ({
  children,
}: {
  readonly children: ReactNode;
}) => {
  const [items, setItems] = useState<ServiceCartItem[]>([]);
  const value = useMemo(
    () => ({
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      add: (item: ServiceCartItem) => setItems((current) => [...current, item]),
      remove: (variantId: string, startsAt: string) =>
        setItems((current) =>
          current.filter(
            (item) =>
              !(item.variantId === variantId && item.startsAt === startsAt),
          ),
        ),
      clear: () => setItems([]),
    }),
    [items],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
export const useServiceCart = () => {
  const value = useContext(CartContext);
  if (!value) throw new Error("ServiceCartProvider is missing");
  return value;
};
