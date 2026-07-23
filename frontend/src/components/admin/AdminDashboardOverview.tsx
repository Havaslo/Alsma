import { Link } from "react-router-dom";

import {
  Activity,
  Check,
  Lightbulb,
  MessageSquareText,
  WalletCards,
} from "lucide-react";

import { AMAZI_ROUTES } from "@/AMAZI_ROUTES";
import { AdminDashboardDetails } from "@/components/admin/AdminDashboardDetails";
import { useAdminBookings } from "@/lib/admin/useAdmin";

const kpis = [
  {
    change: "+2 за 30 минут",
    icon: MessageSquareText,
    label: "Активные обращения",
    tone: "bg-brand/10 text-brand",
    value: "12",
  },
  {
    change: "+14% к вчера",
    icon: Activity,
    label: "Обращения за смену",
    tone: "bg-supporting/20 text-brand",
    value: "84",
  },
  {
    change: "+6% к плану",
    icon: Check,
    label: "Подтверждённые брони",
    tone: "bg-brand/10 text-brand",
    value: "19",
  },
  {
    change: "+11% к смене",
    icon: WalletCards,
    label: "Сумма броней",
    tone: "bg-accent-ui/15 text-accent-ui-foreground",
    value: "1,84 млн ₽",
  },
] as const;

const insights = [
  {
    description:
      "За последние обращения чаще других повторяются вопросы про семейные номера, размещение с детьми и наличие дополнительных спальных мест.",
    tone: "bg-supporting/20 text-brand",
    title: "Частый повтор — семейные номера",
  },
  {
    description:
      "Агенту пока не хватает коротких ответов по составу SPA-пакетов, ограничениям по времени посещения и включённым услугам.",
    tone: "bg-accent-ui/15 text-accent-ui-foreground",
    title: "Не хватает данных по SPA-пакетам",
  },
  {
    description:
      "Часть диалогов замедляется, когда гость уточняет стоимость трансфера, доступные интервалы и варианты подачи автомобиля.",
    tone: "bg-destructive/10 text-destructive",
    title: "Нужен быстрый ответ про трансфер",
  },
] as const;

const chartBars = [34, 42, 38, 54, 49, 68, 62, 82, 74, 91, 86, 100];

const AnalyticsCard = ({
  description,
  title,
}: {
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
    <div className="mt-6 flex h-56 items-end gap-2 rounded-2xl border border-line px-5 pt-8 pb-5">
      {chartBars.map((height, index) => (
        <span
          className="min-w-2 flex-1 rounded-t-lg bg-brand/75"
          key={`${title}-${index}`}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  </article>
);

export const AdminDashboardOverview = () => {
  const bookings = useAdminBookings();
  const calls = [
    {
      contact: "+7 921 442-18-06",
      id: "CALL-240617-018",
      status: "Текущий",
      title: "Коттедж на 4 ночи + SPA-доступ и поздний выезд",
    },
    {
      contact: "+7 999 106-77-24",
      id: "CALL-240617-021",
      status: "На линии",
      title: "Семейное размещение, детская анимация и трансфер",
    },
  ];

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ change, icon: Icon, label, tone, value }) => (
          <article
            className="rounded-3xl border border-line bg-brand-foreground px-5 py-4"
            key={label}
          >
            <div className="flex items-start justify-between gap-4">
              <span className="text-sm font-medium text-muted-ui-foreground">
                {label}
              </span>
              <span
                className={`grid size-11 place-items-center rounded-2xl ${tone}`}
              >
                <Icon className="size-5" />
              </span>
            </div>
            <p className="mt-3 text-3xl leading-none font-semibold text-brand">
              {value}
            </p>
            <p className="mt-3 text-sm text-muted-ui-foreground">{change}</p>
          </article>
        ))}
      </section>

      <section className="mt-14">
        <h1 className="text-4xl font-semibold">Активные обращения</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-ui-foreground">
          Текущие диалоги, которые идут прямо сейчас и требуют внимания команды
          или быстрого перехода в разговор.
        </p>
        <div className="mt-7 grid gap-4 xl:grid-cols-2">
          {calls.map((call) => (
            <article
              className="rounded-3xl border border-l-5 border-line border-l-brand bg-brand-foreground p-5"
              key={call.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-brand">
                    {call.contact}
                  </h2>
                  <p className="mt-1 text-sm text-muted-ui-foreground">
                    {call.id}
                  </p>
                </div>
                <span className="rounded-full px-3 py-1 text-xs font-semibold text-brand">
                  {call.status}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6">{call.title}</p>
              <Link
                className="mt-4 inline-flex rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-brand-foreground"
                to={AMAZI_ROUTES.adminRequests}
              >
                Перейти к карточке обращения
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-4xl font-semibold">Короткие выводы от AI</h2>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-ui-foreground">
          Здесь будут появляться мини-отчёты по повторяющимся темам, недостающей
          информации и точкам для улучшения ответов.
        </p>
        <div className="mt-7 grid gap-4 xl:grid-cols-3">
          {insights.map(({ description, title, tone }) => (
            <article
              className="rounded-3xl border border-line bg-brand-foreground p-5"
              key={title}
            >
              <div className="flex items-start gap-4">
                <span
                  className={`grid size-12 shrink-0 place-items-center rounded-2xl ${tone}`}
                >
                  <Lightbulb className="size-5" />
                </span>
                <div>
                  <h3 className="text-xl font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-ui-foreground">
                    {description}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-brand-foreground p-2">
          {["День", "Неделя", "Месяц", "Свой период"].map((period, index) => (
            <button
              className={
                index === 0
                  ? "rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground"
                  : "rounded-xl px-5 py-3 text-sm font-semibold text-muted-ui-foreground"
              }
              key={period}
              type="button"
            >
              {period}
            </button>
          ))}
          <span className="ml-auto rounded-xl border border-line px-5 py-3 text-sm text-muted-ui-foreground">
            17 июня 2026
          </span>
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <AnalyticsCard
            description="Динамика подтверждённых броней по времени."
            title="Создано броней"
          />
          <AnalyticsCard
            description="Рост суммы подтверждённых броней по времени."
            title="Сумма броней"
          />
          <AnalyticsCard
            description="График загрузки звонками по ключевым интервалам смены."
            title="Динамика входящих звонков"
          />
          <article className="rounded-3xl border border-line bg-brand-foreground p-5">
            <h3 className="text-2xl font-semibold">Воронка бронирования</h3>
            <p className="mt-2 text-sm leading-6 text-muted-ui-foreground">
              Показывает, на каком этапе теряются потенциальные бронирования.
            </p>
            <div className="mt-7 space-y-6">
              {[
                ["Новое обращение", "84", "100%"],
                ["Подбор варианта", "52", "72%"],
                ["Подтверждение", "31", "48%"],
                [
                  "Бронь",
                  String(bookings.data?.pagination.totalItems ?? 19),
                  "31%",
                ],
              ].map(([label, value, width], index) => (
                <div key={label}>
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      {index + 1}. {label}
                    </span>
                    <strong>{value}</strong>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted-ui/50">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
      <AdminDashboardDetails />
    </>
  );
};
