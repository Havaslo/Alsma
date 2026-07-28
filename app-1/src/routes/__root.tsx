import { Suspense, useEffect } from "react";

import {
  Navigate,
  Outlet,
  createRootRoute,
  useRouterState,
} from "@tanstack/react-router";

import { AMAZI_ROUTES } from "@/AMAZI_ROUTES";
import { AppProviders } from "@/app/AppProviders";
import { SiteOfferPopup } from "@/components/site/HomeOfferPopup";
import { SiteFooter } from "@/components/site/SiteFooter";

const publicRoutes = new Set<string>([
  AMAZI_ROUTES.home,
  AMAZI_ROUTES.rooms,
  AMAZI_ROUTES.spa,
  AMAZI_ROUTES.entertainment,
  AMAZI_ROUTES.allInclusive,
  AMAZI_ROUTES.offers,
  AMAZI_ROUTES.about,
  AMAZI_ROUTES.hardwareProcedures,
  AMAZI_ROUTES.celebrations,
  AMAZI_ROUTES.news,
  AMAZI_ROUTES.blog,
  AMAZI_ROUTES.privacy,
]);

const documentTitles: Record<string, string> = {
  [AMAZI_ROUTES.about]: "О нас — АЛСМА",
  [AMAZI_ROUTES.allInclusive]: "Все включено — АЛСМА",
  [AMAZI_ROUTES.adminAgentScenarios]: "Сценарии агентов",
  [AMAZI_ROUTES.adminBookingRequests]:
    "Заявки на бронирование — админ-панель ALSMA",
  [AMAZI_ROUTES.adminClients]: "Клиенты — админ-панель ALSMA",
  [AMAZI_ROUTES.adminDashboard]: "Админ-панель ALSMA",
  [AMAZI_ROUTES.adminIntegrations]: "Интеграции — админ-панель ALSMA",
  [AMAZI_ROUTES.adminKnowledgeBase]: "База знаний",
  [AMAZI_ROUTES.adminLogin]: "Вход в админ-панель — АЛСМА",
  [AMAZI_ROUTES.adminRequests]: "Обращения — админ-панель ALSMA",
  [AMAZI_ROUTES.adminSettings]: "Настройки",
  [AMAZI_ROUTES.adminSiteLeads]: "Заявки сайта — админ-панель ALSMA",
  [AMAZI_ROUTES.adminSiteManagement]: "Управление сайтом — админ-панель ALSMA",
  [AMAZI_ROUTES.blog]: "Блог — АЛСМА",
  [AMAZI_ROUTES.celebrations]: "Торжества и корпоративный отдых — АЛСМА",
  [AMAZI_ROUTES.entertainment]: "Развлечения и анимация — АЛСМА",
  [AMAZI_ROUTES.hardwareProcedures]: "Аппаратные процедуры — АЛСМА",
  [AMAZI_ROUTES.home]: "Отель АЛСМА",
  [AMAZI_ROUTES.login]: "Вход в личный кабинет",
  [AMAZI_ROUTES.news]: "Новости и события — АЛСМА",
  [AMAZI_ROUTES.offers]: "Акции — АЛСМА",
  [AMAZI_ROUTES.privacy]: "Политика конфиденциальности — АЛСМА",
  [AMAZI_ROUTES.rooms]: "Номера и отдельные дома — АЛСМА",
  [AMAZI_ROUTES.spa]: "SPA-центр — АЛСМА",
};

const RootLayout = () => {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  useEffect(() => {
    document.title =
      documentTitles[pathname] ??
      (pathname.startsWith("/admin") ? "Админ-панель ALSMA" : "АЛСМА");
  }, [pathname]);

  return (
    <AppProviders>
      <Suspense
        fallback={
          <div className="grid min-h-screen place-items-center bg-page text-brand">
            Загружаем АЛСМА…
          </div>
        }
      >
        <Outlet />
      </Suspense>
      {publicRoutes.has(pathname) && <SiteFooter />}
      <SiteOfferPopup />
    </AppProviders>
  );
};

const RootError = ({ error }: { error: Error }) => (
  <main className="grid min-h-screen place-items-center bg-page px-6 text-center text-brand">
    <div>
      <h1 className="font-heading text-4xl font-semibold">
        Что-то пошло не так
      </h1>
      <p className="mt-3 text-muted-ui-foreground">{error.message}</p>
    </div>
  </main>
);

export const Route = createRootRoute({
  component: RootLayout,
  errorComponent: RootError,
  notFoundComponent: () => <Navigate replace to={AMAZI_ROUTES.home} />,
});
