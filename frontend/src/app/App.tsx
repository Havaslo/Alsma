import { Navigate, Route, Routes } from "react-router-dom";

import { AMAZI_FALLBACK_ROUTE, AMAZI_ROUTES } from "@/AMAZI_ROUTES";
import { AccountPage } from "@/pages/AccountPage";
import { AdminDashboardPage } from "@/pages/AdminDashboardPage";
import { AdminLoginPage } from "@/pages/AdminLoginPage";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";

export const App = () => {
  return (
    <Routes>
      <Route element={<HomePage />} path={AMAZI_ROUTES.home} />
      <Route element={<LoginPage />} path={AMAZI_ROUTES.login} />
      <Route element={<AccountPage />} path={AMAZI_ROUTES.account} />
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
