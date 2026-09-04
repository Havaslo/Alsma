import { useEffect, useMemo, useRef, useState } from "react";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/cn";

const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const monthFormatter = new Intl.DateTimeFormat("ru-RU", {
  month: "long",
  year: "numeric",
});
const displayFormatter = new Intl.DateTimeFormat("ru-RU");
const parseDate = (value: string) => new Date(`${value}T12:00:00`);
const serializeDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const monthControls = [
  { Icon: ChevronLeft, label: "Предыдущий месяц", offset: -1 },
  { Icon: ChevronRight, label: "Следующий месяц", offset: 1 },
];

export const DatePicker = ({
  ariaLabel,
  min,
  onChange,
  panelClassName,
  triggerClassName,
  value,
}: {
  readonly ariaLabel: string;
  readonly min?: string;
  readonly onChange: (value: string) => void;
  readonly panelClassName?: string;
  readonly triggerClassName?: string;
  readonly value: string;
}) => {
  const selectedDate = parseDate(value);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const days = useMemo(() => {
    const firstWeekday = (month.getDay() + 6) % 7;
    const first = new Date(
      month.getFullYear(),
      month.getMonth(),
      1 - firstWeekday,
    );
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(first);
      date.setDate(first.getDate() + index);
      return date;
    });
  }, [month]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-xl py-1 text-left text-base font-semibold text-page-foreground outline-none",
          triggerClassName,
        )}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{displayFormatter.format(selectedDate)}</span>
        <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
      </button>
      {open && (
        <div
          className={cn(
            "absolute top-[calc(100%+0.5rem)] left-1/2 z-[80] w-80 -translate-x-1/2 rounded-3xl border border-line bg-white p-4 text-page-foreground shadow-2xl",
            panelClassName,
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <strong className="capitalize">
              {monthFormatter.format(month)}
            </strong>
            <div className="flex gap-1">
              {monthControls.map(({ Icon, label, offset }) => (
                <button
                  aria-label={label}
                  className="grid size-9 place-items-center rounded-full transition hover:bg-muted-ui/20"
                  key={offset}
                  onClick={() =>
                    setMonth(
                      (current) =>
                        new Date(
                          current.getFullYear(),
                          current.getMonth() + offset,
                          1,
                        ),
                    )
                  }
                  type="button"
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-7 text-center text-xs font-semibold text-muted-ui-foreground">
            {weekdays.map((day) => (
              <span className="py-2" key={day}>
                {day}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((date) => {
              const serialized = serializeDate(date);
              const active = serialized === value;
              const disabled = min ? serialized < min : false;
              return (
                <button
                  className={cn(
                    "grid aspect-square place-items-center rounded-full text-sm transition hover:bg-muted-ui/20",
                    date.getMonth() !== month.getMonth() &&
                      "text-muted-ui-foreground/45",
                    active && "bg-brand text-brand-foreground hover:bg-brand",
                  )}
                  disabled={disabled}
                  key={serialized}
                  onClick={() => {
                    onChange(serialized);
                    setOpen(false);
                  }}
                  type="button"
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
