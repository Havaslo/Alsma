import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/cn";

export type ToggleProps = Omit<ComponentPropsWithRef<"input">, "role" | "type">;

export const Toggle = ({ className, ...props }: ToggleProps) => {
  return (
    <label className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer">
      <input
        className={cn(
          "peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0 disabled:cursor-not-allowed",
          className,
        )}
        role="switch"
        type="checkbox"
        {...props}
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full border border-border/60 bg-muted-foreground/30 shadow-inner transition peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-4 peer-focus-visible:ring-ring/15 peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1 left-1 size-5 rounded-full bg-surface shadow-sm ring-1 ring-border/40 transition-all peer-checked:translate-x-5 peer-checked:bg-primary-foreground peer-checked:ring-transparent peer-disabled:opacity-50"
      />
    </label>
  );
};
