import { useEffect, useMemo, useRef, useState } from "react";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { loadBookingCalendarPrices } from "@/lib/booking/booking-api";
import { cn } from "@/lib/cn";

const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const monthControls = [
  { Icon: ChevronLeft, offset: -1, label: "Предыдущий месяц" },
  { Icon: ChevronRight, offset: 1, label: "Следующий месяц" },
];
const monthFormatter = new Intl.DateTimeFormat("ru-RU", {
  month: "long",
  year: "numeric",
});
const displayFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
});
const priceFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
});
const parseDate = (value: string) => new Date(`${value}T12:00:00`);
const serializeDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const DateRangePicker = ({
  checkIn,
  checkOut,
  onChange,
  panelClassName,
  triggerClassName,
  adults,
  childAges,
  roomCount,
}: {
  readonly checkIn: string;
  readonly checkOut: string;
  readonly adults: number;
  readonly childAges: readonly number[];
  readonly roomCount: number;
  readonly onChange: (range: { checkIn: string; checkOut: string }) => void;
  readonly panelClassName?: string;
  readonly triggerClassName?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const date = parseDate(checkIn);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  const [prices, setPrices] = useState<
    Record<string, { discount: boolean; price: number }>
  >({});
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    void loadBookingCalendarPrices(
      {
        adults,
        childAges: [...childAges],
        currency: "RUB",
        language: "ru",
        month: monthKey,
        nationality: "RU",
        roomCount,
      },
      controller.signal,
    )
      .then(({ data }) =>
        setPrices(
          Object.fromEntries(
            data.items.map((item) => [
              item.date,
              { discount: item.discount, price: item.price },
            ]),
          ),
        ),
      )
      .catch(() => {
        if (!controller.signal.aborted) setPrices({});
      });
    return () => controller.abort();
  }, [adults, childAges, month, roomCount]);

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

  const selectDate = (value: string) => {
    if (!pendingStart) {
      setPendingStart(value);
      return;
    }
    if (value <= pendingStart) {
      setPendingStart(value);
      return;
    }
    onChange({ checkIn: pendingStart, checkOut: value });
    setPendingStart(null);
    setOpen(false);
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Даты проживания"
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-xl py-1 text-left text-base font-semibold text-page-foreground outline-none",
          triggerClassName,
        )}
        onClick={() => {
          setOpen((current) => !current);
          setPendingStart(null);
        }}
        type="button"
      >
        <span>
          {displayFormatter.format(parseDate(checkIn))} —{" "}
          {displayFormatter.format(parseDate(checkOut))}
        </span>
        <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
      </button>
      {open && (
        <div
          className={cn(
            "absolute top-[calc(100%+0.75rem)] left-1/2 z-50 w-[min(25rem,calc(100vw-2rem))] -translate-x-1/2 rounded-3xl border border-line bg-white p-4 text-panel-foreground shadow-2xl",
            panelClassName,
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <strong className="capitalize">
              {monthFormatter.format(month)}
            </strong>
            <div className="flex gap-1">
              {monthControls.map(({ Icon, offset, label }) => (
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
          <p className="mt-2 text-xs text-muted-ui-foreground">
            {pendingStart ? "Выберите дату выезда" : "Выберите дату заезда"}
          </p>
          <p className="mt-1 text-xs text-muted-ui-foreground">
            Минимальная цена за ночь по доступным тарифам Eptera
          </p>
          <div className="mt-3 grid grid-cols-7 text-center text-xs font-semibold text-muted-ui-foreground">
            {weekdays.map((day) => (
              <span className="py-2" key={day}>
                {day}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((date) => {
              const value = serializeDate(date);
              const selected =
                value === checkIn ||
                value === checkOut ||
                value === pendingStart;
              const inRange = value > checkIn && value < checkOut;
              const meta = prices[value];
              return (
                <button
                  aria-label={`Выбрать ${date.getDate()} число`}
                  className={cn(
                    "relative grid min-h-14 place-items-center rounded-xl pt-1 text-sm transition hover:bg-muted-ui/20",
                    date.getMonth() !== month.getMonth() &&
                      "text-muted-ui-foreground/45",
                    inRange && "rounded-none bg-brand/10",
                    selected && "bg-brand text-brand-foreground hover:bg-brand",
                  )}
                  key={value}
                  onClick={() => selectDate(value)}
                  type="button"
                >
                  <span>{date.getDate()}</span>
                  {meta && (
                    <small
                      className={cn(
                        "text-[0.58rem] leading-none text-muted-ui-foreground",
                        selected && "text-brand-foreground/80",
                      )}
                    >
                      {priceFormatter.format(meta.price)} ₽
                    </small>
                  )}
                  {meta?.discount && (
                    <span
                      aria-label="Есть скидка"
                      className="absolute top-1 right-1 size-1.5 rounded-full bg-red-500"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
