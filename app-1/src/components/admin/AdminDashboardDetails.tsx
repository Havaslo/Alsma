import { CheckCircle2, Lightbulb, RefreshCw, XCircle } from "lucide-react";

import type { DashboardAnalyticsSnapshot } from "@/components/admin/admin-dashboard-analytics";
import { Button } from "@/components/ui/Button";

const recentCalls = [
  {
    id: "CALL-240426-101 · 14:12",
    intent: "Бронирование коттеджа",
    outcome: "Создана заявка и отправлен расчёт",
    phone: "+7 (921) 555-01-11",
    status: "Завершён",
    tone: "bg-brand/10 text-brand",
    type: "complete",
  },
  {
    id: "CALL-240426-098 · 13:47",
    intent: "SPA и доп. услуги",
    outcome: "Автоответ по прайсу без перевода",
    phone: "+7 (911) 320-44-19",
    status: "Завершён",
    tone: "bg-brand/10 text-brand",
    type: "complete",
  },
  {
    id: "CALL-240426-093 · 13:05",
    intent: "Перевод на менеджера",
    outcome: "Переведён на смену бронирований",
    phone: "+7 (812) 600-10-08",
    status: "Переведён",
    tone: "bg-accent-ui/20 text-accent-ui-foreground",
    type: "transfer",
  },
  {
    id: "CALL-240426-087 · 12:18",
    intent: "Уточнение по семейному номеру",
    outcome: "Не дозвонились, создан callback",
    phone: "+7 (911) 770-90-20",
    status: "Пропущен",
    tone: "bg-destructive/10 text-destructive",
    type: "missed",
  },
] as const;

const ChannelSummary = ({ values }: { readonly values: readonly number[] }) => {
  const channels = [
    {
      label: "Телефон",
      tone: "bg-dashboard-teal",
      value: values[0],
      width: "36%",
    },
    {
      label: "Сайт",
      tone: "bg-dashboard-blue",
      value: values[1],
      width: "28%",
    },
    {
      label: "Telegram",
      tone: "bg-dashboard-orange",
      value: values[2],
      width: "16%",
    },
    {
      label: "WhatsApp",
      tone: "bg-dashboard-pink",
      value: values[3],
      width: "12%",
    },
    {
      label: "Email",
      tone: "bg-dashboard-purple",
      value: values[4],
      width: "8%",
    },
  ];

  return (
    <article className="rounded-3xl border border-line bg-brand-foreground p-5">
      <h3 className="text-2xl font-semibold">Обращения по каналам</h3>
      <p className="mt-2 text-sm leading-6 text-muted-ui-foreground">
        Распределение входящего потока между сайтом, мессенджерами и телефонией.
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
        Телефон и сайт остаются главными точками входа, Telegram быстро растёт.
      </p>
    </article>
  );
};

const BookingFunnel = ({ values }: { readonly values: readonly number[] }) => {
  const funnel = [
    { label: "Интерес к брони", value: values[0], width: "100%" },
    { label: "Созданы заявки", value: values[1], width: "56%" },
    { label: "Подтверждены", value: values[2], width: "33%" },
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

const StatusIcon = ({ type }: { readonly type: string }) => {
  if (type === "transfer") return <RefreshCw className="size-4" />;
  if (type === "missed") return <XCircle className="size-4" />;
  return <CheckCircle2 className="size-4" />;
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

    <section className="mt-14 rounded-3xl border border-line bg-brand-foreground p-5">
      <h2 className="text-3xl font-semibold">
        Последние обращения по телефону
      </h2>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
        <div className="min-w-[58rem]">
          <div className="grid grid-cols-[1.05fr_1.45fr_2fr_0.7fr] gap-4 border-b border-line px-5 py-4 text-sm font-semibold">
            <span>Обращение</span>
            <span>Намерение</span>
            <span>Итог</span>
            <span className="text-right">Статус</span>
          </div>
          {recentCalls.map((call) => (
            <div
              className="grid grid-cols-[1.05fr_1.45fr_2fr_0.7fr] items-center gap-4 border-b border-line px-5 py-5 text-sm last:border-0"
              key={call.id}
            >
              <div>
                <strong>{call.phone}</strong>
                <p className="mt-1 text-muted-ui-foreground">{call.id}</p>
              </div>
              <span>{call.intent}</span>
              <span>{call.outcome}</span>
              <span
                className={`ml-auto inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${call.tone}`}
              >
                <StatusIcon type={call.type} />
                {call.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="mt-14 rounded-3xl border border-line bg-brand-foreground p-6">
      <h2 className="text-3xl font-semibold">
        Что улучшить в сценарии сегодня
      </h2>
      <p className="mt-3 max-w-3xl text-muted-ui-foreground">
        Короткая рекомендация для команды на основе текущих обращений и
        повторяющихся вопросов гостей.
      </p>
      <div className="mt-7 flex flex-col gap-5 lg:flex-row lg:items-center">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand">
          <Lightbulb className="size-5" />
        </span>
        <p className="leading-7">
          Уточните наличие SPA-пакета и трансфера до обсуждения категории
          коттеджа: это сокращает длину диалога и повышает вероятность
          подтверждения брони в первом контакте.
        </p>
        <div className="flex shrink-0 gap-3 lg:ml-auto">
          <Button>Применить</Button>
          <Button variant="secondary">Отложить</Button>
        </div>
      </div>
    </section>
  </>
);
