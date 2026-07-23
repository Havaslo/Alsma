import { useMemo, useState } from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  parseDashboardDate,
  serializeDashboardDate,
} from "@/components/admin/admin-dashboard-analytics";
import { cn } from "@/lib/cn";

const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const monthFormatter = new Intl.DateTimeFormat("ru-RU", {
  month: "long",
  year: "numeric",
});

export const AdminDashboardCalendar = ({
  ariaLabel,
  onSelect,
  rangeEnd,
  rangeStart,
  selected,
}: {
  readonly ariaLabel: string;
  readonly onSelect: (value: string) => void;
  readonly rangeEnd?: string;
  readonly rangeStart?: string;
  readonly selected: string;
}) => {
  const selectedDate = parseDashboardDate(selected);
  const [month, setMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );

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
    <section
      aria-label={ariaLabel}
      className="rounded-3xl border border-line bg-brand-foreground p-5"
    >
      <div className="flex items-center justify-between gap-4">
        <button
          aria-label="Предыдущий месяц"
          className="grid size-11 place-items-center rounded-full border border-line transition hover:bg-page"
          onClick={() =>
            setMonth(
              (current) =>
                new Date(current.getFullYear(), current.getMonth() - 1, 1),
            )
          }
          type="button"
        >
          <ChevronLeft className="size-4" />
        </button>
        <strong className="capitalize">
          {monthFormatter.format(month).replace(" г.", "")}
        </strong>
        <button
          aria-label="Следующий месяц"
          className="grid size-11 place-items-center rounded-full border border-line transition hover:bg-page"
          onClick={() =>
            setMonth(
              (current) =>
                new Date(current.getFullYear(), current.getMonth() + 1, 1),
            )
          }
          type="button"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="mt-4 grid grid-cols-7 text-center text-xs text-muted-ui-foreground">
        {weekdays.map((weekday) => (
          <span className="py-2" key={weekday}>
            {weekday}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((date) => {
          const value = serializeDashboardDate(date);
          const active = value === selected;
          const inRange =
            rangeStart && rangeEnd && value >= rangeStart && value <= rangeEnd;
          const outside = date.getMonth() !== month.getMonth();
          return (
            <button
              aria-pressed={active}
              className={cn(
                "grid aspect-square place-items-center rounded-xl text-sm transition hover:bg-muted-ui/35",
                outside && "text-muted-ui-foreground/40",
                inRange && "bg-muted-ui/45",
                active && "bg-brand/15 font-semibold text-brand",
              )}
              key={value}
              onClick={() => onSelect(value)}
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
