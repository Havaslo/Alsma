import type { ReactNode } from "react";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

export type EmptyStateProps = {
  readonly action?: ReactNode;
  readonly className?: string;
  readonly description: ReactNode;
  readonly icon: LucideIcon;
  readonly title: ReactNode;
};

export const EmptyState = ({
  action,
  className,
  description,
  icon: Icon,
  title,
}: EmptyStateProps) => {
  return (
    <div
      className={cn(
        "grid h-fit justify-items-center gap-4 self-start px-6 py-12 text-center",
        className,
      )}
    >
      <span className="grid size-14 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm shadow-primary/10">
        <Icon aria-hidden="true" className="size-6" />
      </span>
      <div className="grid gap-1">
        <h2 className="font-primary text-lg font-semibold tracking-tight">
          {title}
        </h2>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
};
