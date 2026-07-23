import { Link } from "react-router-dom";

import { ArrowLeft, SearchX } from "lucide-react";

import { AMAZI_ROUTES } from "@/AMAZI_ROUTES";

export const NotFoundPage = () => {
  return (
    <main className="grid min-h-screen place-items-center bg-page px-6 py-12 text-page-foreground">
      <section className="grid max-w-lg justify-items-center gap-5 text-center">
        <span className="grid size-14 place-items-center rounded-2xl border border-brand/20 bg-brand/10 text-brand">
          <SearchX aria-hidden="true" className="size-6" />
        </span>
        <div className="grid gap-2">
          <p className="font-code text-sm font-semibold text-brand">404</p>
          <h1 className="font-heading text-3xl font-semibold">
            Page not found
          </h1>
          <p className="leading-7 text-muted-ui-foreground">
            The address does not match a route in this project.
          </p>
        </div>
        <Link
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground transition hover:bg-brand/90 focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
          to={AMAZI_ROUTES.home}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back home
        </Link>
      </section>
    </main>
  );
};
