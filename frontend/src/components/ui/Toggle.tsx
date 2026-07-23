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
        className="absolute inset-0 rounded-full border border-line/60 bg-muted-ui-foreground/30 shadow-inner transition peer-checked:border-brand peer-checked:bg-brand peer-focus-visible:ring-4 peer-focus-visible:ring-focus/15 peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1 left-1 size-5 rounded-full bg-panel shadow-sm ring-1 ring-line/40 transition-all peer-checked:translate-x-5 peer-checked:bg-brand-foreground peer-checked:ring-transparent peer-disabled:opacity-50"
      />
    </label>
  );
};
