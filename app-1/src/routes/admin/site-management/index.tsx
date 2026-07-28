import { Navigate, createFileRoute } from "@tanstack/react-router";

import { AMAZI_ROUTES } from "@/AMAZI_ROUTES";

export const Route = createFileRoute("/admin/site-management/")({
  component: () => (
    <Navigate replace to={AMAZI_ROUTES.adminSiteManagementHome} />
  ),
});
