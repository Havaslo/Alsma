import { Link } from "@tanstack/react-router";
import { ArrowLeft, SearchX } from "lucide-react";

export const NotFoundPage = () => {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 py-12 text-foreground">
      <section className="grid max-w-lg justify-items-center gap-5 text-center">
        <span className="grid size-14 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
          <SearchX aria-hidden="true" className="size-6" />
        </span>
        <div className="grid gap-2">
          <p className="font-mono text-sm font-semibold text-primary">404</p>
          <h1 className="font-primary text-3xl font-semibold">
            Page not found
          </h1>
          <p className="leading-7 text-muted-foreground">
            The address does not match a route in this project.
          </p>
        </div>
        <Link
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          to="/"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back home
        </Link>
      </section>
    </main>
  );
};
