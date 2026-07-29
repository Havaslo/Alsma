import type { ReactNode } from "react";

import { Link } from "@tanstack/react-router";
import {
  Bell,
  BookOpen,
  Cable,
  CalendarCheck,
  Gauge,
  LogOut,
  MessagesSquare,
  PanelTop,
  Settings,
  Sparkles,
  UsersRound,
} from "lucide-react";

import logoWhite from "@/assets/alsma/logo-white.svg";
import { AdminSiteNavigationMenu } from "@/components/admin/AdminSiteNavigationMenu";
import { getAdminSiteTitle } from "@/components/admin/admin-site-navigation";
import type { AdminUser } from "@/lib/admin/admin-api";
import { cn } from "@/lib/cn";
import { ROUTES } from "@/route-constants";

const navigation = [
  {
    active: (path: string) =>
      path === ROUTES.admin || path === ROUTES.adminDashboard,
    icon: Gauge,
    label: "Дашборд",
    to: ROUTES.adminDashboard,
  },
  {
    active: (path: string) => path.startsWith(ROUTES.adminSiteManagement),
    icon: PanelTop,
    label: "Управление сайтом",
    to: ROUTES.adminSiteManagement,
  },
  {
    active: (path: string) => path.startsWith("/admin/requests"),
    icon: MessagesSquare,
    label: "Обращения",
    to: ROUTES.adminRequests,
  },
  {
    active: (path: string) => path === ROUTES.adminBookingRequests,
    icon: CalendarCheck,
    label: "Заявки на бронирование",
    to: ROUTES.adminBookingRequests,
  },
  {
    active: (path: string) => path.startsWith(ROUTES.adminClients),
    icon: UsersRound,
    label: "Клиенты",
    to: ROUTES.adminClients,
  },
  {
    active: (path: string) => path === ROUTES.adminSiteLeads,
    icon: PanelTop,
    label: "Заявки сайта",
    to: ROUTES.adminSiteLeads,
  },
  {
    active: (path: string) => path === ROUTES.adminAgentScenarios,
    icon: Sparkles,
    label: "Сценарии агентов",
    to: ROUTES.adminAgentScenarios,
  },
  {
    active: (path: string) => path === ROUTES.adminKnowledgeBase,
    icon: BookOpen,
    label: "База знаний",
    to: ROUTES.adminKnowledgeBase,
  },
  {
    active: (path: string) => path === ROUTES.adminSettings,
    icon: Settings,
    label: "Настройки",
    to: ROUTES.adminSettings,
  },
  {
    active: (path: string) => path === ROUTES.adminIntegrations,
    icon: Cable,
    label: "Интеграции",
    to: ROUTES.adminIntegrations,
  },
] as const;

const adminPageTitle = (path: string): string => {
  if (path === ROUTES.admin || path === ROUTES.adminDashboard) return "Дашборд";
  if (path === ROUTES.adminSiteLeads) return "Заявки сайта";
  if (path === ROUTES.adminBookingRequests) return "Заявки на бронирование";
  if (path.startsWith(ROUTES.adminClients)) return "Клиенты";
  if (path === ROUTES.adminRequests) return "Обращения";
  if (path.startsWith(`${ROUTES.adminRequests}/`))
    return `Обращение #${path.split("/").at(-1)}`;
  if (path === ROUTES.adminKnowledgeBase) return "База знаний";
  if (path === ROUTES.adminAgentScenarios) return "Сценарии агентов";
  if (path === ROUTES.adminSettings) return "Настройки";
  if (path === ROUTES.adminIntegrations) return "Интеграции";
  return getAdminSiteTitle(path);
};

export const AdminShell = ({
  children,
  onLogout,
  path,
  user,
}: {
  readonly children: ReactNode;
  readonly onLogout: () => void;
  readonly path: string;
  readonly user: AdminUser;
}) => {
  const title = adminPageTitle(path);

  return (
    <main className="flex min-h-screen bg-page text-page-foreground">
      <aside className="sticky top-0 hidden h-screen w-68 shrink-0 flex-col overflow-hidden bg-brand px-5 py-6 text-brand-foreground lg:flex">
        <Link aria-label="АЛСМА" className="block h-10 w-36" to={ROUTES.home}>
          <img
            alt="АЛСМА"
            className="h-full w-full object-contain object-left"
            src={logoWhite}
          />
        </Link>
        <nav className="mt-8 scrollbar-none flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {navigation.map(({ active, icon: Icon, label, to }) => {
            const selected = active(path);
            if (to === ROUTES.adminSiteManagement)
              return (
                <AdminSiteNavigationMenu
                  key={label}
                  path={path}
                  selected={selected}
                />
              );
            return (
              <Link
                className={cn(
                  "flex min-h-14 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                  selected
                    ? "bg-brand-foreground/10 text-brand-foreground"
                    : "text-brand-foreground/75 hover:bg-brand-foreground/5 hover:text-brand-foreground",
                )}
                key={label}
                to={to}
              >
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-xl",
                    selected
                      ? "bg-brand-foreground/10"
                      : "bg-brand-foreground/5",
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <span className="leading-5">{label}</span>
              </Link>
            );
          })}
        </nav>
        <button
          className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-brand-foreground/15 px-4 py-3 text-sm font-semibold transition hover:bg-brand-foreground/5"
          onClick={onLogout}
          type="button"
        >
          <LogOut className="size-4" />
          Выйти
        </button>
      </aside>

      <section className="min-w-0 flex-1">
        <nav className="flex gap-2 overflow-x-auto border-b border-line px-5 py-3 lg:hidden">
          {navigation.map(({ active, label, to }) => (
            <Link
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-semibold",
                active(path)
                  ? "bg-brand text-brand-foreground"
                  : "border border-line bg-brand-foreground text-brand",
              )}
              key={to}
              to={to}
            >
              {label}
            </Link>
          ))}
        </nav>
        <header className="sticky top-0 z-30 flex min-h-21 items-center justify-between gap-6 border-b border-line bg-page px-5 py-4 sm:px-8">
          <nav
            aria-label="Хлебные крошки"
            className="flex items-center gap-3 text-sm"
          >
            <span className="text-muted-ui-foreground">Админ-панель</span>
            <span className="text-line">/</span>
            <span className="font-semibold">{title}</span>
          </nav>
          <div className="flex items-center gap-3">
            <button
              aria-label="Уведомления"
              className="relative grid size-11 place-items-center rounded-full border border-line bg-brand-foreground text-brand transition hover:bg-muted-ui/30"
              type="button"
            >
              <Bell className="size-5" />
              <span className="absolute top-2 right-2 size-2.5 rounded-full bg-destructive" />
            </button>
            <div className="flex items-center gap-3 rounded-full border border-line bg-brand-foreground px-3 py-2">
              <span className="grid size-9 place-items-center rounded-full bg-brand text-xs font-semibold text-brand-foreground">
                AI
              </span>
              <span className="hidden text-left sm:block">
                <strong className="block text-sm text-brand">
                  {user.displayName}
                </strong>
                <span className="block text-xs text-muted-ui-foreground">
                  {user.email}
                </span>
              </span>
            </div>
          </div>
        </header>
        <div className="px-5 py-6 sm:px-8">{children}</div>
      </section>
    </main>
  );
};
