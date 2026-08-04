import { type ReactNode, useEffect, useState } from "react";

import { Menu, X } from "lucide-react";

import { cn } from "@/lib/cn";

export type ShellProps = {
  readonly children: ReactNode;
  /** Optional sticky top bar. */
  readonly header?: ReactNode;
  /** Optional responsive navigation; omit it for user-facing app layouts. */
  readonly sidebar?: ReactNode;
};

export const Shell = ({ children, header, sidebar }: ShellProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isSidebarOpen) return;

    const previousOverflow = document.documentElement.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsSidebarOpen(false);
    };

    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.documentElement.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isSidebarOpen]);

  return (
    <div className="isolate min-h-screen overflow-x-clip bg-background text-foreground">
      {isSidebarOpen && sidebar && (
        <button
          aria-label="Close navigation"
          className="bg-scrim/80 fixed inset-0 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          type="button"
        />
      )}
      {sidebar && (
        <aside
          className={cn(
            "fixed inset-y-3 left-0 z-50 flex w-[min(20rem,calc(100vw-1.5rem))] flex-col overflow-y-auto overscroll-contain rounded-3xl border border-border/60 bg-surface/90 p-4 text-surface-foreground shadow-2xl shadow-foreground/10 backdrop-blur-xl transition-all lg:inset-y-4 lg:left-4 lg:w-60 lg:translate-x-0 lg:opacity-100 lg:shadow-lg lg:shadow-foreground/5",
            isSidebarOpen
              ? "translate-x-3 opacity-100"
              : "-translate-x-full opacity-0",
          )}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a[href]")) {
              setIsSidebarOpen(false);
            }
          }}
        >
          <button
            aria-label="Close navigation"
            className="absolute top-4 right-4 grid size-10 place-items-center rounded-xl transition hover:bg-muted/70 focus-visible:ring-4 focus-visible:ring-ring/15 focus-visible:outline-none lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
          {sidebar}
        </aside>
      )}
      <div
        className={cn(
          "relative z-0 min-w-0 overflow-x-clip",
          sidebar && "lg:ml-64",
        )}
      >
        {(header || sidebar) && (
          <header className="sticky top-3 z-20 mx-3 flex min-h-16 items-center gap-3 rounded-2xl border border-border/60 bg-surface/80 px-3 text-surface-foreground shadow-lg shadow-foreground/5 backdrop-blur-xl sm:mx-6 sm:px-4 lg:top-4 lg:mx-8 lg:px-5">
            {sidebar && (
              <button
                aria-label="Open navigation"
                className="grid size-10 place-items-center rounded-xl transition hover:bg-muted/70 focus-visible:ring-4 focus-visible:ring-ring/15 focus-visible:outline-none lg:hidden"
                onClick={() => setIsSidebarOpen(true)}
                type="button"
              >
                <Menu aria-hidden="true" className="size-5" />
              </button>
            )}
            {header}
          </header>
        )}
        <main className="px-3 pt-6 pb-4 sm:px-6 sm:pt-8 sm:pb-6 lg:px-8 lg:pt-10 lg:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
};
