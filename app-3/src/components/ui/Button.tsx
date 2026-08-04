import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/cn";

const buttonVariants = {
  primary:
    "bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90 focus-visible:ring-ring disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none",
  secondary:
    "border border-border/70 bg-surface/80 text-surface-foreground shadow-sm shadow-foreground/5 hover:border-border hover:bg-muted/70 focus-visible:ring-ring disabled:text-muted-foreground disabled:shadow-none",
} as const;

type ButtonProps = ComponentPropsWithRef<"button"> & {
  readonly variant?: keyof typeof buttonVariants;
};

export const Button = ({
  className,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) => {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-200 focus-visible:ring-4 focus-visible:ring-ring/20 focus-visible:outline-none active:translate-y-px disabled:transform-none disabled:cursor-not-allowed",
        buttonVariants[variant],
        className,
      )}
      type={type}
      {...props}
    />
  );
};
