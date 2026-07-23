import type { ReactNode } from "react";

type ChartTone = "accent" | "brand" | "destructive" | "supporting";

const toneClasses: Record<
  ChartTone,
  { readonly fill: string; readonly text: string }
> = {
  accent: { fill: "bg-accent-ui", text: "text-accent-ui" },
  brand: { fill: "bg-brand", text: "text-brand" },
  destructive: { fill: "bg-destructive", text: "text-destructive" },
  supporting: {
    fill: "bg-supporting",
    text: "text-supporting-foreground",
  },
};

const buildChartPoints = (values: readonly number[], maximum: number) => {
  const left = 52;
  const right = 700;
  const top = 18;
  const bottom = 220;
  return values.map((value, index) => ({
    x: left + (index * (right - left)) / (values.length - 1),
    y: bottom - (value / maximum) * (bottom - top),
  }));
};

const buildSmoothPath = (
  points: readonly { readonly x: number; readonly y: number }[],
) => {
  if (!points.length) return "";
  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const midpoint = (previous.x + point.x) / 2;
    return `${path} C ${midpoint} ${previous.y}, ${midpoint} ${point.y}, ${point.x} ${point.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
};

const AreaChart = ({
  labels,
  maximum,
  tone,
  values,
}: {
  readonly labels: readonly string[];
  readonly maximum: number;
  readonly tone: ChartTone;
  readonly values: readonly number[];
}) => {
  const points = buildChartPoints(values, maximum);
  const linePath = buildSmoothPath(points);
  const areaPath = `${linePath} L 700 220 L 52 220 Z`;

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-line p-3">
      <svg
        aria-label="График динамики"
        className={`h-64 w-full ${toneClasses[tone].text}`}
        role="img"
        viewBox="0 0 720 260"
      >
        {[0, 1, 2, 3, 4].map((line) => {
          const y = 18 + line * 50.5;
          const label = Math.round(maximum - (maximum / 4) * line);
          return (
            <g className="text-line" key={line}>
              <line
                stroke="currentColor"
                strokeWidth="1"
                x1="52"
                x2="700"
                y1={y}
                y2={y}
              />
              <text
                className="fill-muted-ui-foreground text-[10px]"
                textAnchor="end"
                x="43"
                y={y + 4}
              >
                {label.toLocaleString("ru-RU")}
              </text>
            </g>
          );
        })}
        {labels.map((label, index) => {
          const x = 52 + (index * 648) / (labels.length - 1);
          return (
            <g className="text-line" key={label}>
              <line
                stroke="currentColor"
                strokeWidth="1"
                x1={x}
                x2={x}
                y1="18"
                y2="220"
              />
              <text
                className="fill-muted-ui-foreground text-[10px]"
                textAnchor={
                  index === 0
                    ? "start"
                    : index === labels.length - 1
                      ? "end"
                      : "middle"
                }
                x={x}
                y="245"
              >
                {label}
              </text>
            </g>
          );
        })}
        <path d={areaPath} fill="currentColor" fillOpacity="0.12" />
        <path
          d={linePath}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
};

const ChartCard = ({
  children,
  description,
  title,
}: {
  readonly children: ReactNode;
  readonly description: string;
  readonly title: string;
}) => (
  <article className="rounded-3xl border border-line bg-brand-foreground p-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="text-2xl font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-ui-foreground">
          {description}
        </p>
      </div>
      <button className="text-xs font-semibold text-brand" type="button">
        Детализация
      </button>
    </div>
    {children}
  </article>
);

const DonutChart = () => {
  const segments = [
    { label: "Телефон", offset: 0, tone: "brand" as const, value: "52%" },
    {
      label: "Сайт",
      offset: -52,
      tone: "accent" as const,
      value: "23%",
    },
    {
      label: "Мессенджеры",
      offset: -75,
      tone: "supporting" as const,
      value: "16%",
    },
    {
      label: "Соцсети",
      offset: -91,
      tone: "destructive" as const,
      value: "9%",
    },
  ];

  return (
    <div className="mt-6 grid items-center gap-6 lg:grid-cols-[14rem_1fr]">
      <svg
        aria-label="Распределение переданных обращений по каналам"
        className="-rotate-90"
        role="img"
        viewBox="0 0 160 160"
      >
        {segments.map((segment) => (
          <circle
            className={toneClasses[segment.tone].text}
            cx="80"
            cy="80"
            fill="none"
            key={segment.label}
            pathLength="100"
            r="56"
            stroke="currentColor"
            strokeDasharray={`${Number.parseInt(segment.value)} ${100 - Number.parseInt(segment.value)}`}
            strokeDashoffset={segment.offset}
            strokeWidth="28"
          />
        ))}
      </svg>
      <div className="space-y-3">
        {segments.map((segment) => (
          <div
            className="flex items-center gap-3 rounded-2xl bg-page px-4 py-3"
            key={segment.label}
          >
            <span
              className={`size-3 rounded-full ${toneClasses[segment.tone].fill}`}
            />
            <span className="text-sm text-muted-ui-foreground">
              {segment.label}
            </span>
            <strong
              className={`ml-auto text-sm ${toneClasses[segment.tone].text}`}
            >
              {segment.value}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
};

const ColumnChart = () => {
  const columns = [
    { label: "Утро", tone: "brand" as const, value: 4 },
    { label: "День", tone: "accent" as const, value: 7 },
    { label: "После 14", tone: "supporting" as const, value: 10 },
    { label: "Вечер", tone: "destructive" as const, value: 14 },
    { label: "Поздно", tone: "brand" as const, value: 16 },
  ];

  return (
    <div className="mt-6 grid h-64 grid-cols-5 items-end gap-4 rounded-2xl border border-line px-6 pt-8 pb-4">
      {columns.map((column) => (
        <div
          className="flex h-full flex-col items-center justify-end gap-3"
          key={column.label}
        >
          <div
            className={`w-10 rounded-t-xl ${toneClasses[column.tone].fill}`}
            style={{ height: `${(column.value / 20) * 100}%` }}
          />
          <span className="text-center text-xs text-muted-ui-foreground">
            {column.label}
          </span>
        </div>
      ))}
    </div>
  );
};

const StatusBars = () => {
  const rows = [
    { change: "+14%", label: "Всего обращений", value: 84, width: "100%" },
    { change: "+5%", label: "Текущие уточнения", value: 31, width: "74%" },
    { change: "+2%", label: "В работе", value: 18, width: "52%" },
    { change: "-1%", label: "Передано менеджеру", value: 6, width: "31%" },
  ];

  return (
    <div className="mt-7 space-y-4">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="flex items-center text-sm">
            <span>{row.label}</span>
            <strong className="ml-auto text-brand">{row.value}</strong>
            <span className="ml-3 text-xs text-muted-ui-foreground">
              {row.change}
            </span>
          </div>
          <div className="mt-2 h-8 overflow-hidden rounded-xl bg-page p-1">
            <div
              className="flex h-full items-center rounded-lg bg-brand/75 px-3 text-xs font-semibold text-brand-foreground"
              style={{ width: row.width }}
            >
              {row.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const AdminDashboardCharts = () => (
  <div className="mt-6 grid gap-4 xl:grid-cols-2">
    <ChartCard
      description="Звонки и сообщения по всем каналам за смену с разбивкой по времени."
      title="Кол-во обращений"
    >
      <AreaChart
        labels={["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00"]}
        maximum={60}
        tone="brand"
        values={[12, 18, 24, 48, 54, 38, 30]}
      />
    </ChartCard>
    <ChartCard
      description="Обращения, которые были отработаны без участия менеджера."
      title="Обработано AI-агентом"
    >
      <AreaChart
        labels={["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00"]}
        maximum={40}
        tone="supporting"
        values={[8, 12, 18, 31, 36, 28, 22]}
      />
    </ChartCard>
    <ChartCard
      description="Переводы звонков и диалогов на менеджера по статусам обработки."
      title="Передано менеджеру"
    >
      <div className="mt-6 flex items-end justify-between rounded-2xl border border-line bg-page p-5">
        <div>
          <p className="text-sm text-muted-ui-foreground">
            Всего передано менеджеру
          </p>
          <strong className="mt-2 block text-4xl">24</strong>
        </div>
        <span className="text-sm">за выбранный период</span>
      </div>
      <DonutChart />
    </ChartCard>
    <ChartCard
      description="Заявки и бронирования, которые были созданы в течение выбранного периода."
      title="Создано заявок"
    >
      <StatusBars />
    </ChartCard>
    <ChartCard
      description="Динамика подтверждённых броней по времени."
      title="Создано броней"
    >
      <ColumnChart />
    </ChartCard>
    <ChartCard
      description="Рост суммы подтверждённых броней по времени."
      title="Сумма броней"
    >
      <AreaChart
        labels={["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00"]}
        maximum={2_000_000}
        tone="accent"
        values={[
          180_000, 300_000, 520_000, 820_000, 1_180_000, 1_450_000, 1_850_000,
        ]}
      />
    </ChartCard>
    <div className="xl:col-span-2">
      <ChartCard
        description="График загрузки звонками по ключевым интервалам смены."
        title="Динамика входящих звонков"
      >
        <AreaChart
          labels={[
            "07:00",
            "08:30",
            "10:00",
            "11:30",
            "12:30",
            "14:00",
            "15:30",
            "17:00",
            "18:30",
          ]}
          maximum={18}
          tone="brand"
          values={[6, 8, 9, 10, 13, 16, 12, 10, 8]}
        />
        <div className="mt-5 rounded-2xl bg-page p-5">
          <p className="text-xs font-semibold tracking-[0.18em] text-accent-ui-foreground uppercase">
            Советы от агента
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-ui-foreground">
            <li>• Пик нагрузки приходится на интервал 12:30–14:00.</li>
            <li>• После 15:00 поток снижается без резких всплесков.</li>
            <li>
              • Усиление смены до обеда поможет быстрее закрывать SPA-запросы.
            </li>
          </ul>
        </div>
      </ChartCard>
    </div>
  </div>
);
