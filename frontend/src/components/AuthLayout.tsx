import type { ReactNode } from "react";

export type AuthLayoutProps = {
  readonly aside?: ReactNode;
  readonly children: ReactNode;
  readonly title?: ReactNode;
};

export const AuthLayout = ({ aside, children, title }: AuthLayoutProps) => {
  return (
    <main className="grid min-h-screen gap-4 bg-page p-4 text-page-foreground lg:grid-cols-2">
      <section className="flex items-center justify-center px-4 py-12 sm:px-10">
        <div className="w-full max-w-md">
          {title && (
            <h1 className="mb-8 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h1>
          )}
          {children}
        </div>
      </section>
      {aside && (
        <aside className="hidden items-center justify-center overflow-hidden rounded-3xl bg-brand p-12 text-brand-foreground shadow-xl shadow-brand/15 lg:flex">
          <div className="max-w-lg">{aside}</div>
        </aside>
      )}
    </main>
  );
};
