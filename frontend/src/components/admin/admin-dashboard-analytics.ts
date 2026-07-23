export type DashboardPeriod = "custom" | "day" | "month" | "week";

export type DashboardPeriodSelection = {
  readonly end: string;
  readonly focus: string;
  readonly period: DashboardPeriod;
  readonly start: string;
};

export type DashboardAnalyticsSnapshot = {
  readonly aiHandled: readonly number[];
  readonly aiMaximum: number;
  readonly bookingColumns: readonly number[];
  readonly channelCounts: readonly number[];
  readonly contacts: readonly number[];
  readonly contactsMaximum: number;
  readonly funnelCounts: readonly number[];
  readonly incomingCalls: readonly number[];
  readonly incomingMaximum: number;
  readonly managerTotal: number;
  readonly requestCounts: readonly number[];
  readonly revenue: readonly number[];
  readonly revenueMaximum: number;
};

export const initialDashboardPeriod: DashboardPeriodSelection = {
  end: "2026-06-17",
  focus: "2026-06-17",
  period: "day",
  start: "2026-06-17",
};

export const parseDashboardDate = (value: string) =>
  new Date(`${value}T12:00:00`);

const withoutYearSuffix = (value: string) => value.replace(" г.", "");

export const serializeDashboardDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const selectionFromDate = (
  period: Exclude<DashboardPeriod, "custom">,
  selected: string,
): DashboardPeriodSelection => {
  const date = parseDashboardDate(selected);
  if (period === "day")
    return { end: selected, focus: selected, period, start: selected };
  if (period === "week") {
    const weekday = (date.getDay() + 6) % 7;
    return {
      end: serializeDashboardDate(addDays(date, 6 - weekday)),
      focus: selected,
      period,
      start: serializeDashboardDate(addDays(date, -weekday)),
    };
  }
  return {
    end: serializeDashboardDate(
      new Date(date.getFullYear(), date.getMonth() + 1, 0),
    ),
    focus: selected,
    period,
    start: serializeDashboardDate(
      new Date(date.getFullYear(), date.getMonth(), 1),
    ),
  };
};

export const getDashboardPeriodLabel = (
  selection: DashboardPeriodSelection,
) => {
  const start = parseDashboardDate(selection.start);
  const end = parseDashboardDate(selection.end);
  const full = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  if (selection.period === "day") return withoutYearSuffix(full.format(start));
  if (selection.period === "month") {
    const month = new Intl.DateTimeFormat("ru-RU", {
      month: "long",
      year: "numeric",
    }).format(start);
    const normalized = withoutYearSuffix(month);
    return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
  }
  const sameMonth =
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    const startDay = new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
    }).format(start);
    const endDay = new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(end);
    return `${startDay} — ${withoutYearSuffix(endDay)}`;
  }
  return `${withoutYearSuffix(full.format(start))} — ${withoutYearSuffix(full.format(end))}`;
};

const scaleValues = (values: readonly number[], scale: number) =>
  values.map((value) => Math.max(1, Math.round(value * scale)));

const roundedMaximum = (value: number) => {
  const magnitude = 10 ** Math.max(1, Math.floor(Math.log10(value)) - 1);
  return Math.ceil(value / magnitude) * magnitude;
};

export const buildDashboardAnalytics = (
  selection: DashboardPeriodSelection,
): DashboardAnalyticsSnapshot => {
  const start = parseDashboardDate(selection.start);
  const end = parseDashboardDate(selection.end);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const periodScale =
    selection.period === "day"
      ? 1
      : selection.period === "week"
        ? 2.2
        : selection.period === "month"
          ? 5.4
          : Math.max(1.25, Math.min(5, days / 3.2));
  const dateScale = 0.94 + ((end.getDate() + end.getMonth()) % 7) * 0.02;
  const scale = periodScale * dateScale;
  const contacts = scaleValues([12, 18, 24, 48, 54, 38, 30], scale);
  const aiHandled = scaleValues([8, 12, 18, 31, 36, 28, 22], scale);
  const incomingCalls = scaleValues([6, 8, 9, 10, 13, 16, 12, 10, 8], scale);
  const revenue = scaleValues(
    [180_000, 300_000, 520_000, 820_000, 1_180_000, 1_450_000, 1_850_000],
    scale,
  );

  return {
    aiHandled,
    aiMaximum: roundedMaximum(Math.max(...aiHandled) * 1.1),
    bookingColumns: scaleValues([4, 7, 10, 14, 16], scale),
    channelCounts: scaleValues([36, 28, 16, 12, 8], scale),
    contacts,
    contactsMaximum: roundedMaximum(Math.max(...contacts) * 1.1),
    funnelCounts: scaleValues([18, 10, 6], scale),
    incomingCalls,
    incomingMaximum: roundedMaximum(Math.max(...incomingCalls) * 1.1),
    managerTotal: Math.round(24 * scale),
    requestCounts: scaleValues([84, 31, 18, 6], scale),
    revenue,
    revenueMaximum: roundedMaximum(Math.max(...revenue) * 1.05),
  };
};
