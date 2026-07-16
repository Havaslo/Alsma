import { Navigate, Route, Routes } from "react-router-dom";

import { AMAZI_FALLBACK_ROUTE, AMAZI_ROUTES } from "@/AMAZI_ROUTES";
import { HomePage } from "@/pages/HomePage";

export const App = () => {
  return (
    <Routes>
      <Route element={<HomePage />} path={AMAZI_ROUTES.home} />
      <Route
        element={<Navigate replace to={AMAZI_ROUTES.home} />}
        path={AMAZI_FALLBACK_ROUTE}
      />
    </Routes>
  );
};
