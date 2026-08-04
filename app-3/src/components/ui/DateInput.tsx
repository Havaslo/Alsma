import {
  type ComponentPropsWithRef,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { CalendarDays } from "lucide-react";
import {
  AnimatePresence,
  LazyMotion,
  domAnimation,
  m,
  useReducedMotion,
} from "motion/react";

import { Calendar } from "@/components/ui/Calendar";
import { cn } from "@/lib/cn";

type PopoverPosition = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
};

export type DateInputProps = Omit<
  ComponentPropsWithRef<"button">,
  "children" | "defaultValue" | "name" | "onChange" | "type" | "value"
> & {
  readonly calendarLabel?: string;
  readonly clearLabel?: string;
  readonly defaultValue?: string;
  /** Intl options used for the visible value. */
  readonly formatOptions?: Intl.DateTimeFormatOptions;
  readonly locale?: string;
  /** Adds an ISO yyyy-mm-dd hidden input for native form submission. */
  readonly name?: string;
  /** Called with an ISO yyyy-mm-dd value, or an empty string when cleared. */
  readonly onValueChange?: (value: string) => void;
  readonly placeholder?: string;
  readonly todayLabel?: string;
  /** Controlled ISO yyyy-mm-dd value. */
  readonly value?: string;
};

const parseDate = (value: string | undefined): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  return date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day
    ? date
    : null;
};

const toDateValue = (date: Date) => {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const DateInput = ({
  calendarLabel = "Choose date",
  className,
  clearLabel = "Clear",
  defaultValue = "",
  disabled,
  formatOptions = { dateStyle: "medium" },
  locale,
  name,
  onClick,
  onKeyDown,
  onValueChange,
  placeholder = "Select date",
  ref,
  todayLabel = "Today",
  value,
  ...props
}: DateInputProps) => {
  const reduceMotion = useReducedMotion();
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition>();
  const selectedValue = value ?? internalValue;
  const selectedDate = parseDate(selectedValue);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const viewportPadding = 16;
      const gap = 8;
      const expectedHeight = 410;
      const width = Math.min(352, window.innerWidth - viewportPadding * 2);
      const left = Math.min(
        Math.max(viewportPadding, rect.left),
        window.innerWidth - width - viewportPadding,
      );
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const openAbove = spaceBelow < expectedHeight && rect.top > spaceBelow;
      const top = openAbove
        ? Math.max(viewportPadding, rect.top - expectedHeight - gap)
        : rect.bottom + gap;

      setPosition({ left, top, width });
    };
    const closeOnPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const closeOnFocus = (event: FocusEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    updatePosition();
    const focusFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => popoverRef.current?.focus());
    });
    document.addEventListener("focusin", closeOnFocus);
    document.addEventListener("pointerdown", closeOnPointer);
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("focusin", closeOnFocus);
      document.removeEventListener("pointerdown", closeOnPointer);
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  const assignTriggerRef = (node: HTMLButtonElement | null) => {
    triggerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as { current: HTMLButtonElement | null }).current = node;
  };

  const selectValue = (nextValue: string) => {
    if (value === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
    setIsOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
    }
  };

  const displayValue = selectedDate
    ? new Intl.DateTimeFormat(locale, formatOptions).format(selectedDate)
    : placeholder;
  const calendarDate = selectedDate ?? new Date();
  const portal =
    typeof document === "undefined"
      ? null
      : createPortal(
          <LazyMotion features={domAnimation}>
            <AnimatePresence>
              {isOpen && position && (
                <m.div
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  aria-label={calendarLabel}
                  className="fixed z-50 overflow-hidden rounded-3xl border border-border/70 bg-surface/95 text-surface-foreground shadow-2xl shadow-foreground/15 backdrop-blur-xl focus:outline-none"
                  exit={{ opacity: 0, scale: 0.98, y: -4 }}
                  initial={{ opacity: 0, scale: 0.98, y: -4 }}
                  ref={popoverRef}
                  role="dialog"
                  style={position}
                  tabIndex={-1}
                  transition={{ duration: reduceMotion ? 0 : 0.16 }}
                >
                  <Calendar
                    className="border-0 bg-transparent shadow-none"
                    key={selectedValue || "empty"}
                    onValueChange={(date) => selectValue(toDateValue(date))}
                    value={calendarDate}
                  />
                  <footer className="grid grid-cols-2 gap-2 border-t border-border/60 bg-muted/20 p-3">
                    <button
                      className="min-h-10 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition hover:bg-muted/70 hover:text-surface-foreground focus-visible:ring-4 focus-visible:ring-ring/15 focus-visible:outline-none disabled:opacity-40"
                      disabled={!selectedValue}
                      onClick={() => selectValue("")}
                      type="button"
                    >
                      {clearLabel}
                    </button>
                    <button
                      className="min-h-10 rounded-xl bg-primary/10 px-3 text-sm font-semibold text-primary transition hover:bg-primary/15 focus-visible:ring-4 focus-visible:ring-ring/15 focus-visible:outline-none"
                      onClick={() => selectValue(toDateValue(new Date()))}
                      type="button"
                    >
                      {todayLabel}
                    </button>
                  </footer>
                </m.div>
              )}
            </AnimatePresence>
          </LazyMotion>,
          document.body,
        );

  return (
    <div className="relative">
      {name && (
        <input
          disabled={disabled}
          name={name}
          type="hidden"
          value={selectedValue}
        />
      )}
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={cn(
          "flex field-control items-center justify-between gap-3 text-left",
          className,
        )}
        disabled={disabled}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) setIsOpen((current) => !current);
        }}
        onKeyDown={handleKeyDown}
        ref={assignTriggerRef}
        {...props}
        type="button"
      >
        <span className={selectedDate ? undefined : "text-muted-foreground"}>
          {displayValue}
        </span>
        <CalendarDays
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
      </button>
      {portal}
    </div>
  );
};
