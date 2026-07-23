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
        "flex min-h-screen flex-col bg-page text-page-foreground",
        className,
      )}
      {...props}
    >
      {header && (
        <header className="sticky top-0 z-20 border-b border-line/60 bg-page/80 text-page-foreground shadow-sm shadow-page-foreground/5 backdrop-blur-xl">
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
        <footer className="border-t border-line/60 bg-panel/70 text-panel-foreground">
          {footer}
        </footer>
      )}
    </div>
  );
};
