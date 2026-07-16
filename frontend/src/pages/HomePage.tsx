import { ArrowDown, Blocks, Route, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/lib/theme/ThemeToggle";

const foundations = [
  {
    description:
      "Build multi-page experiences on top of the included client-side router.",
    icon: Route,
    title: "Routing ready",
  },
  {
    description:
      "Use the shared query provider for requests, caching, and loading states.",
    icon: Blocks,
    title: "Data foundation",
  },
  {
    description:
      "Change the managed theme variables and every component follows the preset.",
    icon: Sparkles,
    title: "Theme driven",
  },
] as const;

export const HomePage = () => {
  const scrollToFoundation = () => {
    document
      .getElementById("foundation")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-page text-page-foreground">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-between px-6 py-8 sm:px-10 lg:px-12">
        <header className="flex items-center justify-between border-b border-line pb-6">
          <span className="font-heading text-lg font-semibold tracking-tight">
            Amazi Project
          </span>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-muted-ui px-3 py-1 font-code text-xs text-muted-ui-foreground">
              Vite + React
            </span>
            <ThemeToggle />
          </div>
        </header>

        <div className="max-w-4xl py-20 sm:py-28">
          <p className="mb-5 font-code text-sm font-semibold tracking-widest text-brand uppercase">
            Ready to build
          </p>
          <h1 className="font-heading text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
            A focused foundation for your next idea.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-ui-foreground sm:text-xl">
            The essential frontend tools are installed and configured. Start
            with the page, keep the structure, and turn it into the product you
            described.
          </p>
          <Button className="mt-10" onClick={scrollToFoundation}>
            Explore the foundation
            <ArrowDown aria-hidden="true" className="size-4" />
          </Button>
        </div>

        <div className="grid gap-4 pb-8 md:grid-cols-3" id="foundation">
          {foundations.map(({ description, icon: Icon, title }) => (
            <article
              className="rounded-2xl border border-line bg-panel p-6 text-panel-foreground"
              key={title}
            >
              <Icon aria-hidden="true" className="mb-8 size-5 text-accent-ui" />
              <h2 className="font-heading text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-ui-foreground">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};
