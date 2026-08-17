import type { DashboardAnalyticsSnapshot } from "@/components/admin/admin-dashboard-analytics";

const ChannelSummary = ({ values }: { readonly values: readonly number[] }) => {
  const total = Math.max(
    1,
    values.reduce((sum, value) => sum + value, 0),
  );
  const channels = [
    {
      label: "Звонки",
      tone: "bg-dashboard-teal",
      value: values[0],
      width: `${((values[0] ?? 0) / total) * 100}%`,
    },
    {
      label: "MAX",
      tone: "bg-dashboard-orange",
      value: values[1],
      width: `${((values[1] ?? 0) / total) * 100}%`,
    },
    {
      label: "VK",
      tone: "bg-dashboard-purple",
      value: values[2],
      width: `${((values[2] ?? 0) / total) * 100}%`,
    },
    {
      label: "Чат на сайте",
      tone: "bg-dashboard-blue",
      value: values[3],
      width: `${((values[3] ?? 0) / total) * 100}%`,
    },
  ];

  return (
    <article className="rounded-3xl border border-line bg-brand-foreground p-5">
      <h3 className="text-2xl font-semibold">Обращения по каналам</h3>
      <p className="mt-2 text-sm leading-6 text-muted-ui-foreground">
        Распределение входящего потока между звонками и двумя каналами
        сообщений.
      </p>
      <div className="mt-7 flex h-4 overflow-hidden rounded-full bg-page">
        {channels.map((channel) => (
          <span
            className={channel.tone}
            key={channel.label}
            style={{ width: channel.width }}
          />
        ))}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {channels.map((channel) => (
          <div
            className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3"
            key={channel.label}
          >
            <span className={`size-3 rounded-full ${channel.tone}`} />
            <span className="text-sm text-muted-ui-foreground">
              {channel.label}
            </span>
            <strong className="ml-auto text-brand">{channel.value}</strong>
          </div>
        ))}
      </div>
      <p className="mt-5 text-sm leading-6 text-brand">
        Сводка учитывает только фактические каналы проекта: звонки, MAX, VK и
        чат на сайте.
      </p>
    </article>
  );
};

const BookingFunnel = ({ values }: { readonly values: readonly number[] }) => {
  const first = Math.max(1, values[0] ?? 0);
  const funnel = [
    { label: "Интерес к брони", value: values[0], width: "100%" },
    {
      label: "Созданы заявки",
      value: values[1],
      width: `${((values[1] ?? 0) / first) * 100}%`,
    },
    {
      label: "Подтверждены",
      value: values[2],
      width: `${((values[2] ?? 0) / first) * 100}%`,
    },
  ];

  return (
    <article className="rounded-3xl border border-line bg-brand-foreground p-5">
      <h3 className="text-2xl font-semibold">Воронка бронирования</h3>
      <p className="mt-2 text-sm leading-6 text-muted-ui-foreground">
        Показывает, на каком этапе теряются потенциальные бронирования.
      </p>
      <div className="mt-7 space-y-6">
        {funnel.map((stage, index) => (
          <div key={stage.label}>
            <div className="flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-full bg-page text-sm font-semibold text-dashboard-blue">
                {index + 1}
              </span>
              <span>{stage.label}</span>
              <strong className="ml-auto">{stage.value}</strong>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-page">
              <div
                className="h-full rounded-full bg-dashboard-blue"
                style={{ width: stage.width }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-7 text-sm leading-6">
        Больше всего внимания менеджеров требуют звонки после создания заявки.
      </p>
    </article>
  );
};

export const AdminDashboardDetails = ({
  snapshot,
}: {
  readonly snapshot: DashboardAnalyticsSnapshot;
}) => (
  <>
    <section className="mt-6 grid gap-4 xl:grid-cols-2">
      <ChannelSummary values={snapshot.channelCounts} />
      <BookingFunnel values={snapshot.funnelCounts} />
    </section>
  </>
);
