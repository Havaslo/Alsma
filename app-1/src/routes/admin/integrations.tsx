import { createFileRoute } from "@tanstack/react-router";

import { AdminDashboardPage } from "@/pages/AdminDashboardPage";

export const Route = createFileRoute("/admin/integrations")({
  component: AdminDashboardPage,
});
