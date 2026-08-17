import { useState } from "react";

import { Link } from "@tanstack/react-router";
import { Activity, Check, MessageSquareText, WalletCards } from "lucide-react";

import { AdminDashboardCharts } from "@/components/admin/AdminDashboardCharts";
import { AdminDashboardDetails } from "@/components/admin/AdminDashboardDetails";
import { AdminDashboardPeriodFilter } from "@/components/admin/AdminDashboardPeriodFilter";
import { initialDashboardPeriod } from "@/components/admin/admin-dashboard-analytics";
import { useAdminAnalytics, useAdminRequests } from "@/lib/admin/useAdmin";
import { buildRoute } from "@/lib/navigation";
import { ROUTES } from "@/route-constants";

export const AdminDashboardOverview = () => {
  const [period, setPeriod] = useState(initialDashboardPeriod);
  const analyticsQuery = useAdminAnalytics(period.start, period.end);
  const analytics = analyticsQuery.data?.analytics;
  const requests = useAdminRequests();
  const activeRequests = (requests.data?.items ?? [])
    .filter((item) => item.status === "new" || item.status === "processing")
    .slice(0, 2);
  const kpis = [
    {
      change: "Требуют внимания команды",
      icon: MessageSquareText,
      label: "Активные обращения",
      tone: "bg-brand/10 text-brand",
      value: String(
        requests.data?.items.filter(
          (item) => item.status === "new" || item.status === "processing",
        ).length ?? 0,
      ),
    },
    {
      change: "Реальные обращения за период",
      icon: Activity,
      label: "Обращения за период",
      tone: "bg-supporting/20 text-brand",
      value: String(
        analytics?.contacts.reduce((sum, value) => sum + value, 0) ?? 0,
      ),
    },
    {
      change: "Из данных бронирований",
      icon: Check,
      label: "Созданные брони",
      tone: "bg-brand/10 text-brand",
      value: String(analytics?.funnelCounts[2] ?? 0),
    },
    {
      change: "Оплаченные бронирования",
      icon: WalletCards,
      label: "Сумма оплат",
      tone: "bg-accent-ui/15 text-accent-ui-foreground",
      value: `${(analytics?.revenue.reduce((sum, value) => sum + value, 0) ?? 0).toLocaleString("ru-RU")} ₽`,
    },
  ] as const;

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
          {activeRequests.map((request) => (
            <article
              className="rounded-3xl border border-l-5 border-line border-l-brand bg-brand-foreground p-5"
              key={request.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-brand">
                    {request.contact ?? request.requester ?? "Без контакта"}
                  </h2>
                  <p className="mt-1 text-sm text-muted-ui-foreground">
                    {request.category}
                  </p>
                </div>
                <span className="rounded-full px-3 py-1 text-xs font-semibold text-brand">
                  {request.status === "new" ? "Новое" : "В работе"}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6">
                {request.title}
                {request.description ? ` — ${request.description}` : ""}
              </p>
              <Link
                className="mt-4 inline-flex rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-brand-foreground"
                to={buildRoute(ROUTES.adminRequest, { requestId: request.id })}
              >
                Перейти к карточке обращения
              </Link>
            </article>
          ))}
          {requests.isLoading && (
            <p className="rounded-3xl border border-line bg-brand-foreground p-5 text-muted-ui-foreground">
              Загружаем активные обращения…
            </p>
          )}
          {!requests.isLoading && !activeRequests.length && (
            <p className="rounded-3xl border border-line bg-brand-foreground p-5 text-muted-ui-foreground">
              Активных обращений сейчас нет.
            </p>
          )}
        </div>
      </section>
      <section className="mt-14">
        <AdminDashboardPeriodFilter onChange={setPeriod} selection={period} />
        {analytics ? (
          <>
            <AdminDashboardCharts snapshot={analytics} />
            <AdminDashboardDetails snapshot={analytics} />
          </>
        ) : (
          <p className="mt-6 rounded-3xl border border-line bg-brand-foreground p-5 text-muted-ui-foreground">
            Загружаем реальные данные за выбранный период…
          </p>
        )}
      </section>
    </>
  );
};
