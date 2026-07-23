import { useEffect, useRef, useState } from "react";

import { Check, ChevronDown } from "lucide-react";
import {
  AnimatePresence,
  LazyMotion,
  domAnimation,
  m,
  useReducedMotion,
} from "motion/react";

import { cn } from "@/lib/cn";

export type DropdownOption<T extends string | number> = {
  readonly label: string;
  readonly value: T;
};

export const DropdownSelect = <T extends string | number>({
  ariaLabel,
  className,
  menuClassName,
  menuPlacement = "bottom",
  onChange,
  options,
  triggerClassName,
  value,
}: {
  readonly ariaLabel: string;
  readonly className?: string;
  readonly menuClassName?: string;
  readonly menuPlacement?: "bottom" | "top";
  readonly onChange: (value: T) => void;
  readonly options: readonly DropdownOption<T>[];
  readonly triggerClassName?: string;
  readonly value: T;
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
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
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-xl py-1 text-left text-base font-semibold text-page-foreground outline-none",
          triggerClassName,
        )}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {selected?.label}
        <ChevronDown
          className={cn("size-4 transition", open && "rotate-180")}
        />
      </button>
      <LazyMotion features={domAnimation}>
        <AnimatePresence>
          {open && (
            <m.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={cn(
                "absolute right-0 left-0 z-50 overflow-hidden rounded-2xl border border-line bg-panel p-2 text-panel-foreground shadow-2xl",
                menuPlacement === "top"
                  ? "bottom-[calc(100%+0.75rem)] origin-bottom"
                  : "top-[calc(100%+0.75rem)] origin-top",
                menuClassName,
              )}
              exit={{
                opacity: 0,
                scale: 0.98,
                y: menuPlacement === "top" ? 4 : -4,
              }}
              initial={{
                opacity: 0,
                scale: 0.98,
                y: menuPlacement === "top" ? 4 : -4,
              }}
              role="listbox"
              transition={{
                duration: reduceMotion ? 0 : 0.16,
                ease: [0.16, 1, 0.3, 1],
              }}
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
            </m.div>
          )}
        </AnimatePresence>
      </LazyMotion>
    </div>
  );
};
