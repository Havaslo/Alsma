import { Navigate, useNavigate } from "react-router-dom";

import {
  ClipboardList,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Settings,
  UsersRound,
} from "lucide-react";

import { AMAZI_ROUTES } from "@/AMAZI_ROUTES";
import logoWhite from "@/assets/alsma/logo-white.svg";
import { AdminAgentScenariosPanel } from "@/components/admin/AdminAgentScenariosPanel";
import { AdminIntegrationsPanel } from "@/components/admin/AdminIntegrationsPanel";
import { AdminKnowledgeBasePanel } from "@/components/admin/AdminKnowledgeBasePanel";
import { AdminOperationsPanel } from "@/components/admin/AdminOperationsPanel";
import { AdminSettingsPanel } from "@/components/admin/AdminSettingsPanel";
import { AdminSiteContentEditor } from "@/components/admin/AdminSiteContentEditor";
import type { SiteLead } from "@/lib/admin/admin-api";
import { logoutAdmin } from "@/lib/admin/admin-api";
import { writeAdminSession } from "@/lib/admin/admin-session";
import {
  useAdmin,
  useAdminLeads,
  useUpdateAdminLead,
} from "@/lib/admin/useAdmin";
import { queryClient } from "@/lib/query/query-client";

const labels: Record<SiteLead["status"], string> = {
  cancelled: "Отменена",
  completed: "Завершена",
  new: "Новая",
  processing: "В работе",
};
const menu = [
  { icon: LayoutDashboard, label: "Обзор" },
  { icon: ClipboardList, label: "Заявки" },
  { icon: UsersRound, label: "Клиенты" },
  { icon: Settings, label: "Управление сайтом" },
];

export const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const admin = useAdmin();
  const permissions = admin.data?.user.permissions ?? [];
  const can = (permission: string) =>
    permissions.includes("*") || permissions.includes(permission);
  const leads = useAdminLeads(can("leads.access"));
  const update = useUpdateAdminLead();
  if (admin.isLoading)
    return (
      <main className="grid min-h-screen place-items-center bg-page">
        <LoaderCircle className="size-8 animate-spin text-brand" />
      </main>
    );
  if (!admin.data?.user)
    return <Navigate replace to={AMAZI_ROUTES.adminLogin} />;
  const logout = async () => {
    await logoutAdmin().catch(() => undefined);
    writeAdminSession(null);
    queryClient.clear();
    navigate(AMAZI_ROUTES.adminLogin);
  };
  return (
    <main className="flex min-h-screen bg-page text-page-foreground">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col bg-brand p-6 text-brand-foreground lg:flex">
        <img alt="АЛСМА" className="h-11 w-40 object-contain" src={logoWhite} />
        <nav className="mt-9 flex flex-1 flex-col gap-2">
          {menu.map(({ icon: Icon, label }, index) => (
            <button
              className={
                index === 1
                  ? "flex items-center gap-3 rounded-2xl bg-brand-foreground/10 px-4 py-3 text-left font-medium"
                  : "flex items-center gap-3 rounded-2xl px-4 py-3 text-left font-medium opacity-70 transition hover:bg-brand-foreground/5 hover:opacity-100"
              }
              key={label}
              type="button"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-brand-foreground/10">
                <Icon className="size-5" />
              </span>
              {label}
            </button>
          ))}
        </nav>
        <button
          className="flex items-center gap-3 rounded-2xl border border-brand-foreground/15 px-4 py-3 font-semibold"
          onClick={logout}
          type="button"
        >
          <LogOut className="size-5" />
          Выйти
        </button>
      </aside>
      <section className="min-w-0 flex-1 p-5 sm:p-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-brand">
              Панель управления
            </p>
            <h1 className="mt-1 font-heading text-4xl font-semibold">
              Заявки с сайта
            </h1>
          </div>
          <div className="rounded-2xl border border-line bg-panel px-5 py-3 text-sm">
            <strong>{admin.data.user.displayName}</strong>
            <span className="ml-2 text-muted-ui-foreground">
              {admin.data.user.role}
            </span>
          </div>
        </header>
        {can("leads.access") && (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <article className="rounded-3xl border border-line bg-panel p-5">
                <p className="text-sm text-muted-ui-foreground">Всего заявок</p>
                <p className="mt-2 text-3xl font-semibold text-brand">
                  {leads.data?.pagination.totalItems ?? 0}
                </p>
              </article>
              <article className="rounded-3xl border border-line bg-panel p-5">
                <p className="text-sm text-muted-ui-foreground">Новые</p>
                <p className="mt-2 text-3xl font-semibold text-brand">
                  {leads.data?.items.filter((item) => item.status === "new")
                    .length ?? 0}
                </p>
              </article>
              <article className="rounded-3xl border border-line bg-panel p-5">
                <p className="text-sm text-muted-ui-foreground">В работе</p>
                <p className="mt-2 text-3xl font-semibold text-brand">
                  {leads.data?.items.filter(
                    (item) => item.status === "processing",
                  ).length ?? 0}
                </p>
              </article>
            </div>
            <div className="mt-6 overflow-hidden rounded-3xl border border-line bg-panel">
              <div className="overflow-x-auto">
                <table className="w-full min-w-4xl border-collapse text-left text-sm">
                  <thead className="bg-muted-ui text-muted-ui-foreground">
                    <tr>
                      <th className="px-5 py-4">Дата</th>
                      <th className="px-5 py-4">Форма</th>
                      <th className="px-5 py-4">Контакт</th>
                      <th className="px-5 py-4">Детали</th>
                      <th className="px-5 py-4">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.data?.items.map((lead) => (
                      <tr className="border-t border-line" key={lead.id}>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {new Date(lead.createdAt).toLocaleDateString("ru-RU")}
                        </td>
                        <td className="px-5 py-4 font-medium">
                          {lead.formTitle}
                        </td>
                        <td className="px-5 py-4">
                          {lead.name || lead.phone || lead.email || "Не указан"}
                        </td>
                        <td className="px-5 py-4 text-muted-ui-foreground">
                          {lead.details.checkInDate
                            ? `${lead.details.checkInDate} — ${lead.details.checkOutDate}, ${lead.details.guestsCount} гост.`
                            : "—"}
                        </td>
                        <td className="px-5 py-4">
                          <select
                            className="rounded-xl border border-line bg-page px-3 py-2"
                            disabled={update.isPending}
                            onChange={(event) =>
                              update.mutate({
                                leadId: lead.id,
                                status: event.target
                                  .value as SiteLead["status"],
                              })
                            }
                            value={lead.status}
                          >
                            {Object.entries(labels).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {leads.isLoading && (
                <div className="grid place-items-center p-12">
                  <LoaderCircle className="size-7 animate-spin text-brand" />
                </div>
              )}
              {!leads.isLoading && !leads.data?.items.length && (
                <p className="p-12 text-center text-muted-ui-foreground">
                  Заявок пока нет.
                </p>
              )}
            </div>
          </>
        )}
        {(can("dashboard.access") || can("requests.access")) && (
          <AdminOperationsPanel />
        )}
        {can("knowledge.manage") && <AdminKnowledgeBasePanel />}
        {can("scenarios.access") && <AdminAgentScenariosPanel />}
        {can("settings.access") && (
          <AdminSettingsPanel currentUserId={admin.data.user.id} />
        )}
        {can("site.manage") && <AdminSiteContentEditor />}
        {can("integrations.access") && <AdminIntegrationsPanel />}
      </section>
    </main>
  );
};
