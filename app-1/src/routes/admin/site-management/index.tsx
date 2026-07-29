import { Navigate, createFileRoute } from "@tanstack/react-router";

import { ROUTES } from "@/route-constants";

export const Route = createFileRoute("/admin/site-management/")({
  component: () => <Navigate replace to={ROUTES.adminSiteManagementHome} />,
});
