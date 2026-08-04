import type { ComponentPropsWithRef } from "react";

import { Check } from "lucide-react";

import { cn } from "@/lib/cn";

export type CheckboxProps = Omit<ComponentPropsWithRef<"input">, "type">;

export const Checkbox = ({ className, ...props }: CheckboxProps) => {
  return (
    <span
      className={cn(
        "relative inline-flex size-5 shrink-0 rounded-md",
        className,
      )}
    >
      <input
        className="peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        type="checkbox"
        {...props}
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-md border border-border/70 bg-surface shadow-sm transition peer-checked:border-primary peer-checked:bg-primary peer-hover:border-primary peer-focus-visible:ring-4 peer-focus-visible:ring-ring/15 peer-disabled:opacity-50"
      />
      <Check
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 m-auto size-3.5 text-primary-foreground opacity-0 transition-opacity peer-checked:opacity-100 peer-disabled:opacity-50"
        strokeWidth={3}
      />
    </span>
  );
};
