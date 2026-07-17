import { useEffect, useRef, useState } from "react";

import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/cn";

export type DropdownOption<T extends string | number> = {
  readonly label: string;
  readonly value: T;
};

export const DropdownSelect = <T extends string | number>({
  ariaLabel,
  className,
  onChange,
  options,
  value,
}: {
  readonly ariaLabel: string;
  readonly className?: string;
  readonly onChange: (value: T) => void;
  readonly options: readonly DropdownOption<T>[];
  readonly value: T;
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div className={cn("relative", className)} ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className="flex w-full items-center justify-between gap-3 rounded-xl py-1 text-left text-base font-semibold text-page-foreground outline-none"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {selected?.label}
        <ChevronDown
          className={cn("size-4 transition", open && "rotate-180")}
        />
      </button>
      {open && (
        <div
          className="absolute top-[calc(100%+0.75rem)] right-0 left-0 z-50 overflow-hidden rounded-2xl border border-line bg-panel p-2 text-panel-foreground shadow-2xl"
          role="listbox"
        >
          {options.map((option) => (
            <button
              aria-selected={option.value === value}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition hover:bg-muted-ui/20",
                option.value === value && "bg-brand text-brand-foreground",
              )}
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              role="option"
              type="button"
            >
              {option.label}
              {option.value === value && <Check className="size-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
