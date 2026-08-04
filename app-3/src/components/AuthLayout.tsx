import type { ReactNode } from "react";

export type AuthLayoutProps = {
  readonly aside?: ReactNode;
  readonly children: ReactNode;
  readonly title?: ReactNode;
};

export const AuthLayout = ({ aside, children, title }: AuthLayoutProps) => {
  return (
    <main className="grid min-h-screen gap-4 bg-background p-4 text-foreground lg:grid-cols-2">
      <section className="flex items-center justify-center px-4 py-12 sm:px-10">
        <div className="w-full max-w-md">
          {title && (
            <h1 className="mb-8 font-primary text-3xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h1>
          )}
          {children}
        </div>
      </section>
      {aside && (
        <aside className="hidden items-center justify-center overflow-hidden rounded-3xl bg-primary p-12 text-primary-foreground shadow-xl shadow-primary/15 lg:flex">
          <div className="max-w-lg">{aside}</div>
        </aside>
      )}
    </main>
  );
};
