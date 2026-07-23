import { useMemo, useState } from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/cn";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type CalendarProps = {
  readonly className?: string;
  readonly defaultValue?: Date;
  readonly onValueChange?: (date: Date) => void;
  readonly value?: Date;
};

const isSameDay = (left: Date, right: Date) => {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
};

const createMonthDays = (visibleMonth: Date) => {
  const firstDay = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
    1,
  );
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
};

export const Calendar = ({
  className,
  defaultValue,
  onValueChange,
  value,
}: CalendarProps) => {
  const initialDate = value ?? defaultValue ?? new Date();
  const [internalValue, setInternalValue] = useState(initialDate);
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1),
  );
  const selectedDate = value ?? internalValue;
  const days = useMemo(() => createMonthDays(visibleMonth), [visibleMonth]);
  const monthLabel = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);

  const moveMonth = (offset: number) => {
    setVisibleMonth(
      (month) => new Date(month.getFullYear(), month.getMonth() + offset, 1),
    );
  };

  const selectDate = (date: Date) => {
    if (value === undefined) setInternalValue(date);
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    onValueChange?.(date);
  };

  return (
    <section
      aria-label="Calendar"
      className={cn(
        "w-full rounded-3xl border border-line/70 bg-panel/80 p-4 text-panel-foreground shadow-sm shadow-page-foreground/5",
        className,
      )}
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <button
          aria-label="Previous month"
          className="grid size-9 place-items-center rounded-xl border border-line/70 bg-panel/70 shadow-sm transition hover:bg-muted-ui/70 focus-visible:ring-4 focus-visible:ring-focus/15 focus-visible:outline-none"
          onClick={() => moveMonth(-1)}
          type="button"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </button>
        <h2 aria-live="polite" className="font-heading text-sm font-semibold">
          {monthLabel}
        </h2>
        <button
          aria-label="Next month"
          className="grid size-9 place-items-center rounded-xl border border-line/70 bg-panel/70 shadow-sm transition hover:bg-muted-ui/70 focus-visible:ring-4 focus-visible:ring-focus/15 focus-visible:outline-none"
          onClick={() => moveMonth(1)}
          type="button"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      </header>

      <div className="grid grid-cols-7 gap-1">
        {weekdayLabels.map((label) => (
          <span
            className="py-1 text-center text-xs font-semibold text-muted-ui-foreground"
            key={label}
          >
            {label}
          </span>
        ))}
        {days.map((date) => {
          const isSelected = isSameDay(date, selectedDate);
          const isOutsideMonth = date.getMonth() !== visibleMonth.getMonth();

          return (
            <button
              aria-label={new Intl.DateTimeFormat(undefined, {
                dateStyle: "full",
              }).format(date)}
              aria-pressed={isSelected}
              className={cn(
                "aspect-square rounded-xl text-sm transition-colors focus-visible:ring-4 focus-visible:ring-focus/15 focus-visible:outline-none",
                isSelected
                  ? "bg-brand font-semibold text-brand-foreground shadow-sm shadow-brand/20"
                  : "hover:bg-brand/10",
                isOutsideMonth && !isSelected && "text-muted-ui-foreground/50",
              )}
              key={date.toISOString()}
              onClick={() => selectDate(date)}
              type="button"
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </section>
  );
};
