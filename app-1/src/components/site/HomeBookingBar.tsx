import { Link } from "@tanstack/react-router";

import { ROUTES } from "@/route-constants";

export const HomeBookingBar = () => (
  <div
    className="mx-auto flex w-full max-w-5xl items-center justify-center p-4 text-page-foreground sm:p-5"
    id="booking"
  >
    <Link
      className="inline-flex min-h-15 items-center justify-center rounded-full bg-brand px-8 py-5 text-sm font-semibold text-brand-foreground transition hover:bg-brand/90 sm:px-10 sm:text-base"
      to={ROUTES.booking}
    >
      Забронировать номер
    </Link>
  </div>
);
