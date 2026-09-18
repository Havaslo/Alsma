import { useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import type { AdminClient } from "@/lib/admin/admin-api";
import { buildRoute } from "@/lib/navigation";
import { ROUTES } from "@/route-constants";

const getClientRoute = (clientId: string) =>
  buildRoute(ROUTES.adminClient, { clientId });
const formatBookingDate = (value: string) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));

export const AdminClientRow = ({ item }: { readonly item: AdminClient }) => {
  const navigate = useNavigate();
  const openClient = () => navigate({ to: getClientRoute(item.id) });

  return (
    <tr
      className="cursor-pointer border-t border-line transition focus-within:bg-muted-ui/20 hover:bg-muted-ui/20"
      onClick={openClient}
    >
      <td className="px-5 py-4">
        <button
          className="font-semibold text-brand outline-none"
          onClick={openClient}
          type="button"
        >
          {item.fullName || "Без имени"}
        </button>
      </td>
      <td className="px-5 py-4">
        {item.phone.startsWith("email:") ? "—" : item.phone}
      </td>
      <td className="px-5 py-4">{item.email || "—"}</td>
      <td className="px-5 py-4">
        <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
          {item.source}
        </span>
      </td>
      <td className="px-5 py-4">{item._count.serviceOrders}</td>
      <td className="px-5 py-4">
        {item.bookings.length ? (
          <div className="space-y-1.5">
            {item.bookings.map((booking, index) => (
              <div className="min-w-48" key={`${booking.roomName}-${index}`}>
                <p className="font-semibold text-brand">{booking.roomName}</p>
                <p className="text-xs text-muted-ui-foreground">
                  {formatBookingDate(booking.checkInDate)} —{" "}
                  {formatBookingDate(booking.checkOutDate)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-muted-ui-foreground">—</span>
        )}
      </td>
      <td className="px-5 py-4 text-right">
        <ChevronRight className="ml-auto size-4 text-muted-ui-foreground" />
      </td>
    </tr>
  );
};
