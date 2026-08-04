import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";

const badgeVariants = {
  brand: "border-primary/15 bg-primary/10 text-primary",
  destructive: "border-danger/15 bg-danger/10 text-danger",
  neutral: "border-transparent bg-muted/70 text-muted-foreground",
  outline: "border-border/70 bg-surface/50 text-surface-foreground",
} as const;

export type BadgeProps = ComponentPropsWithoutRef<"span"> & {
  readonly variant?: keyof typeof badgeVariants;
};

export const Badge = ({
  className,
  variant = "neutral",
  ...props
}: BadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold tracking-tight",
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
};
