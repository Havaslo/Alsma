import { useEffect, useRef, useState } from "react";

import { X } from "lucide-react";

import { AdminDashboardCalendar } from "@/components/admin/AdminDashboardCalendar";
import {
  type DashboardPeriod,
  type DashboardPeriodSelection,
  getDashboardPeriodLabel,
  parseDashboardDate,
  selectionFromDate,
  serializeDashboardDate,
} from "@/components/admin/admin-dashboard-analytics";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const periods: readonly {
  readonly label: string;
  readonly value: DashboardPeriod;
}[] = [
  { label: "День", value: "day" },
  { label: "Неделя", value: "week" },
  { label: "Месяц", value: "month" },
  { label: "Свой период", value: "custom" },
];

const addDays = (value: string, days: number) => {
  const date = parseDashboardDate(value);
  date.setDate(date.getDate() + days);
  return serializeDashboardDate(date);
};

export const AdminDashboardPeriodFilter = ({
  onChange,
  selection,
}: {
  readonly onChange: (selection: DashboardPeriodSelection) => void;
  readonly selection: DashboardPeriodSelection;
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<DashboardPeriod | null>(null);
  const [draft, setDraft] = useState(selection);
  const [previous, setPrevious] = useState(selection);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const activatePeriod = (period: DashboardPeriod) => {
    if (open === period) {
      setOpen(null);
      return;
    }
    if (period === "custom") {
      setPrevious(selection);
      const custom = {
        end: selection.end,
        focus: selection.end,
        period,
        start:
          selection.period === "custom"
            ? selection.start
            : addDays(selection.end, -7),
      } as const;
      setDraft(custom);
      onChange(custom);
    } else {
      const next = selectionFromDate(period, selection.end);
      setDraft(next);
      onChange(next);
    }
    setOpen(period);
  };

  const selectSingleDate = (
    period: Exclude<DashboardPeriod, "custom">,
    value: string,
  ) => {
    const next = selectionFromDate(period, value);
    setDraft(next);
    onChange(next);
    setOpen(null);
  };

  const updateCustomStart = (start: string) => {
    const next = {
      end: start > draft.end ? start : draft.end,
      focus: start,
      period: "custom" as const,
      start,
    };
    setDraft(next);
    onChange(next);
  };

  const updateCustomEnd = (end: string) => {
    const next = {
      end,
      focus: end,
      period: "custom" as const,
      start: end < draft.start ? end : draft.start,
    };
    setDraft(next);
    onChange(next);
  };

  return (
    <div className="relative" ref={rootRef}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-line bg-brand-foreground p-2">
          {periods.map((period) => {
            const active = selection.period === period.value;
            return (
              <button
                aria-expanded={open === period.value}
                aria-haspopup="dialog"
                className={cn(
                  "min-h-11 rounded-xl px-5 py-2 text-sm font-semibold transition",
                  active
                    ? "bg-brand text-brand-foreground"
                    : "text-muted-ui-foreground hover:bg-page",
                )}
                key={period.value}
                onClick={() => activatePeriod(period.value)}
                type="button"
              >
                {period.label}
              </button>
            );
          })}
        </div>
        <output className="rounded-xl border border-line bg-brand-foreground px-5 py-3 text-sm">
          {getDashboardPeriodLabel(selection)}
        </output>
      </div>

      {open && (
        <div
          aria-label={`Выбор периода: ${periods.find((period) => period.value === open)?.label}`}
          className={cn(
            "absolute top-full left-0 z-40 mt-4 w-full rounded-3xl border border-line bg-brand-foreground p-5 shadow-2xl",
            open === "custom" ? "max-w-5xl" : "max-w-md",
          )}
          role="dialog"
        >
          <div className="mb-5 flex items-center justify-between gap-4">
            <strong>
              Выбор периода:{" "}
              {periods.find((period) => period.value === open)?.label}
            </strong>
            <button
              aria-label="Закрыть выбор периода"
              className="grid size-11 place-items-center rounded-full border border-line transition hover:bg-page"
              onClick={() => setOpen(null)}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>

          {open === "custom" ? (
            <>
              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <p className="mb-3 text-sm text-muted-ui-foreground">
                    Дата начала
                  </p>
                  <AdminDashboardCalendar
                    ariaLabel="Дата начала"
                    onSelect={updateCustomStart}
                    rangeEnd={draft.end}
                    rangeStart={draft.start}
                    selected={draft.start}
                  />
                </div>
                <div>
                  <p className="mb-3 text-sm text-muted-ui-foreground">
                    Дата конца
                  </p>
                  <AdminDashboardCalendar
                    ariaLabel="Дата конца"
                    onSelect={updateCustomEnd}
                    rangeEnd={draft.end}
                    rangeStart={draft.start}
                    selected={draft.end}
                  />
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-3">
                <Button
                  onClick={() => {
                    onChange(previous);
                    setOpen(null);
                  }}
                  variant="secondary"
                >
                  Отмена
                </Button>
                <Button
                  onClick={() => {
                    onChange(draft);
                    setOpen(null);
                  }}
                >
                  Применить
                </Button>
              </div>
            </>
          ) : (
            <AdminDashboardCalendar
              ariaLabel={`Выберите ${open === "month" ? "месяц" : open === "week" ? "неделю" : "день"}`}
              onSelect={(value) => selectSingleDate(open, value)}
              selected={selection.focus}
            />
          )}
        </div>
      )}
    </div>
  );
};
