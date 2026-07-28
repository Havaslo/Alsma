import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/cn";

const buttonVariants = {
  primary:
    "bg-brand text-brand-foreground shadow-sm shadow-brand/20 hover:bg-brand/90 focus-visible:ring-focus disabled:bg-muted-ui disabled:text-muted-ui-foreground disabled:shadow-none",
  secondary:
    "border border-line/70 bg-panel/80 text-panel-foreground shadow-sm shadow-page-foreground/5 hover:border-line hover:bg-muted-ui/70 focus-visible:ring-focus disabled:text-muted-ui-foreground disabled:shadow-none",
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
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-200 focus-visible:ring-4 focus-visible:ring-focus/20 focus-visible:outline-none active:translate-y-px disabled:transform-none disabled:cursor-not-allowed",
        buttonVariants[variant],
        className,
      )}
      type={type}
      {...props}
    />
  );
};
