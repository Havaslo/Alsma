import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";

const badgeVariants = {
  brand: "border-brand/15 bg-brand/10 text-brand",
  destructive: "border-destructive/15 bg-destructive/10 text-destructive",
  neutral: "border-transparent bg-muted-ui/70 text-muted-ui-foreground",
  outline: "border-line/70 bg-panel/50 text-panel-foreground",
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
