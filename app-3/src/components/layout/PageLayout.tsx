import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/cn";

export type PageLayoutProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> & {
  readonly children: ReactNode;
  /** Classes applied to the main content container. */
  readonly contentClassName?: string;
  readonly footer?: ReactNode;
  /** Optional sticky header content. */
  readonly header?: ReactNode;
};

export const PageLayout = ({
  children,
  className,
  contentClassName,
  footer,
  header,
  ...props
}: PageLayoutProps) => {
  return (
    <div
      className={cn(
        "flex min-h-screen flex-col bg-background text-foreground",
        className,
      )}
      {...props}
    >
      {header && (
        <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 text-foreground shadow-sm shadow-foreground/5 backdrop-blur-xl">
          {header}
        </header>
      )}
      <main
        className={cn(
          "mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10",
          contentClassName,
        )}
      >
        {children}
      </main>
      {footer && (
        <footer className="border-t border-border/60 bg-surface/70 text-surface-foreground">
          {footer}
        </footer>
      )}
    </div>
  );
};
