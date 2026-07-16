import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

const buttonVariants = {
  primary:
    "bg-brand text-brand-foreground hover:bg-brand/90 focus-visible:ring-focus disabled:bg-muted-ui disabled:text-muted-ui-foreground",
  secondary:
    "border border-line bg-panel text-panel-foreground hover:bg-muted-ui focus-visible:ring-focus disabled:text-muted-ui-foreground",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
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
        "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-page focus-visible:outline-none disabled:cursor-not-allowed",
        buttonVariants[variant],
        className,
      )}
      type={type}
      {...props}
    />
  );
};
