import { Suspense, useEffect } from "react";

import {
  Navigate,
  Outlet,
  createRootRoute,
  useRouterState,
} from "@tanstack/react-router";

import { AppProviders } from "@/app/AppProviders";
import { SiteOfferPopup } from "@/components/site/HomeOfferPopup";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ROUTES } from "@/route-constants";

const publicRoutes = new Set<string>([
  ROUTES.home,
  ROUTES.rooms,
  ROUTES.spa,
  ROUTES.entertainment,
  ROUTES.allInclusive,
  ROUTES.offers,
  ROUTES.about,
  ROUTES.hardwareProcedures,
  ROUTES.celebrations,
  ROUTES.news,
  ROUTES.blog,
  ROUTES.booking,
  ROUTES.privacy,
]);

const documentTitles: Record<string, string> = {
  [ROUTES.about]: "О нас — АЛСМА",
  [ROUTES.allInclusive]: "Все включено — АЛСМА",
  [ROUTES.adminAgentScenarios]: "Сценарии агентов",
  [ROUTES.adminBookingRequests]: "Заявки на бронирование — админ-панель АЛСМА",
  [ROUTES.adminClients]: "Клиенты — админ-панель АЛСМА",
  [ROUTES.adminDashboard]: "Админ-панель АЛСМА",
  [ROUTES.adminIntegrations]: "Интеграции — админ-панель АЛСМА",
  [ROUTES.adminKnowledgeBase]: "База знаний",
  [ROUTES.adminLogin]: "Вход в админ-панель — АЛСМА",
  [ROUTES.adminRequests]: "Обращения — админ-панель АЛСМА",
  [ROUTES.adminSettings]: "Настройки",
  [ROUTES.adminSiteLeads]: "Заявки сайта — админ-панель АЛСМА",
  [ROUTES.adminSiteManagement]: "Управление сайтом — админ-панель АЛСМА",
  [ROUTES.blog]: "Блог — АЛСМА",
  [ROUTES.booking]: "Бронирование — АЛСМА",
  [ROUTES.celebrations]: "Торжества и корпоративный отдых — АЛСМА",
  [ROUTES.entertainment]: "Развлечения и анимация — АЛСМА",
  [ROUTES.hardwareProcedures]: "Аппаратные процедуры — АЛСМА",
  [ROUTES.home]: "Отель АЛСМА",
  [ROUTES.login]: "Вход в личный кабинет",
  [ROUTES.news]: "Новости и события — АЛСМА",
  [ROUTES.offers]: "Акции — АЛСМА",
  [ROUTES.privacy]: "Политика конфиденциальности — АЛСМА",
  [ROUTES.rooms]: "Номера и отдельные дома — АЛСМА",
  [ROUTES.spa]: "SPA-центр — АЛСМА",
};

const RootLayout = () => {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  useEffect(() => {
    document.title =
      documentTitles[pathname] ??
      (pathname.startsWith("/admin") ? "Админ-панель АЛСМА" : "АЛСМА");
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
  notFoundComponent: () => <Navigate replace to={ROUTES.home} />,
});
