import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AMAZI_FALLBACK_ROUTE, AMAZI_ROUTES } from "@/AMAZI_ROUTES";
import { HomePage } from "@/pages/HomePage";

const AboutPage = lazy(() =>
  import("@/pages/AboutPage").then(({ AboutPage }) => ({ default: AboutPage })),
);
const AccountPage = lazy(() =>
  import("@/pages/AccountPage").then(({ AccountPage }) => ({
    default: AccountPage,
  })),
);
const AdminDashboardPage = lazy(() =>
  import("@/pages/AdminDashboardPage").then(({ AdminDashboardPage }) => ({
    default: AdminDashboardPage,
  })),
);
const AdminLoginPage = lazy(() =>
  import("@/pages/AdminLoginPage").then(({ AdminLoginPage }) => ({
    default: AdminLoginPage,
  })),
);
const AllInclusivePage = lazy(() =>
  import("@/pages/AllInclusivePage").then(({ AllInclusivePage }) => ({
    default: AllInclusivePage,
  })),
);
const BlogPage = lazy(() =>
  import("@/pages/BlogPage").then(({ BlogPage }) => ({ default: BlogPage })),
);
const CelebrationsPage = lazy(() =>
  import("@/pages/CelebrationsPage").then(({ CelebrationsPage }) => ({
    default: CelebrationsPage,
  })),
);
const EntertainmentPage = lazy(() =>
  import("@/pages/EntertainmentPage").then(({ EntertainmentPage }) => ({
    default: EntertainmentPage,
  })),
);
const HardwareProceduresPage = lazy(() =>
  import("@/pages/HardwareProceduresPage").then(
    ({ HardwareProceduresPage }) => ({
      default: HardwareProceduresPage,
    }),
  ),
);
const LoginPage = lazy(() =>
  import("@/pages/LoginPage").then(({ LoginPage }) => ({ default: LoginPage })),
);
const NewsPage = lazy(() =>
  import("@/pages/NewsPage").then(({ NewsPage }) => ({ default: NewsPage })),
);
const OffersPage = lazy(() =>
  import("@/pages/OffersPage").then(({ OffersPage }) => ({
    default: OffersPage,
  })),
);
const PrivacyPage = lazy(() =>
  import("@/pages/PrivacyPage").then(({ PrivacyPage }) => ({
    default: PrivacyPage,
  })),
);
const RoomsPage = lazy(() =>
  import("@/pages/RoomsPage").then(({ RoomsPage }) => ({ default: RoomsPage })),
);
const SpaPage = lazy(() =>
  import("@/pages/SpaPage").then(({ SpaPage }) => ({ default: SpaPage })),
);

export const App = () => {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-page text-brand">
          Загружаем АЛСМА…
        </div>
      }
    >
      <Routes>
        <Route element={<HomePage />} path={AMAZI_ROUTES.home} />
        <Route element={<LoginPage />} path={AMAZI_ROUTES.login} />
        <Route element={<AccountPage />} path={AMAZI_ROUTES.account} />
        <Route element={<RoomsPage />} path={AMAZI_ROUTES.rooms} />
        <Route element={<SpaPage />} path={AMAZI_ROUTES.spa} />
        <Route
          element={<EntertainmentPage />}
          path={AMAZI_ROUTES.entertainment}
        />
        <Route
          element={<AllInclusivePage />}
          path={AMAZI_ROUTES.allInclusive}
        />
        <Route element={<OffersPage />} path={AMAZI_ROUTES.offers} />
        <Route element={<AboutPage />} path={AMAZI_ROUTES.about} />
        <Route
          element={<HardwareProceduresPage />}
          path={AMAZI_ROUTES.hardwareProcedures}
        />
        <Route
          element={<CelebrationsPage />}
          path={AMAZI_ROUTES.celebrations}
        />
        <Route element={<NewsPage />} path={AMAZI_ROUTES.news} />
        <Route element={<BlogPage />} path={AMAZI_ROUTES.blog} />
        <Route element={<PrivacyPage />} path={AMAZI_ROUTES.privacy} />
        <Route element={<AdminLoginPage />} path={AMAZI_ROUTES.adminLogin} />
        <Route
          element={<AdminDashboardPage />}
          path={AMAZI_ROUTES.adminDashboard}
        />
        <Route
          element={<Navigate replace to={AMAZI_ROUTES.home} />}
          path={AMAZI_FALLBACK_ROUTE}
        />
      </Routes>
    </Suspense>
  );
};
