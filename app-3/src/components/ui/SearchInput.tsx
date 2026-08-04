import type { ComponentPropsWithRef } from "react";

import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

export type SearchInputProps = Omit<ComponentPropsWithRef<"input">, "type"> & {
  readonly clearLabel?: string;
  readonly containerClassName?: string;
  readonly onClear?: () => void;
};

export const SearchInput = ({
  className,
  clearLabel = "Clear search",
  containerClassName,
  onClear,
  value,
  ...props
}: SearchInputProps) => {
  const showClear = Boolean(onClear && String(value ?? ""));

  return (
    <div className={cn("relative", containerClassName)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        className={cn("pr-11 pl-10", className)}
        type="search"
        value={value}
        {...props}
      />
      {showClear && (
        <button
          aria-label={clearLabel}
          className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted/70 hover:text-surface-foreground focus-visible:ring-4 focus-visible:ring-ring/15 focus-visible:outline-none"
          onClick={onClear}
          type="button"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      )}
    </div>
  );
};
