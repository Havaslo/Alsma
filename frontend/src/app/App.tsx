import { Navigate, Route, Routes } from "react-router-dom";

import { AMAZI_FALLBACK_ROUTE, AMAZI_ROUTES } from "@/AMAZI_ROUTES";
import { AccountPage } from "@/pages/AccountPage";
import { AdminDashboardPage } from "@/pages/AdminDashboardPage";
import { AdminLoginPage } from "@/pages/AdminLoginPage";
import { AllInclusivePage } from "@/pages/AllInclusivePage";
import { CelebrationsPage } from "@/pages/CelebrationsPage";
import { EntertainmentPage } from "@/pages/EntertainmentPage";
import { HardwareProceduresPage } from "@/pages/HardwareProceduresPage";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { OffersPage } from "@/pages/OffersPage";
import { PublicContentPage } from "@/pages/PublicContentPage";
import { RoomsPage } from "@/pages/RoomsPage";
import { SpaPage } from "@/pages/SpaPage";

export const App = () => {
  return (
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
      <Route element={<AllInclusivePage />} path={AMAZI_ROUTES.allInclusive} />
      <Route element={<OffersPage />} path={AMAZI_ROUTES.offers} />
      <Route
        element={<PublicContentPage pageKey="about" />}
        path={AMAZI_ROUTES.about}
      />
      <Route
        element={<HardwareProceduresPage />}
        path={AMAZI_ROUTES.hardwareProcedures}
      />
      <Route element={<CelebrationsPage />} path={AMAZI_ROUTES.celebrations} />
      <Route
        element={<PublicContentPage pageKey="news" />}
        path={AMAZI_ROUTES.news}
      />
      <Route
        element={<PublicContentPage pageKey="blog" />}
        path={AMAZI_ROUTES.blog}
      />
      <Route
        element={<PublicContentPage pageKey="privacy" />}
        path={AMAZI_ROUTES.privacy}
      />
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
  );
};
