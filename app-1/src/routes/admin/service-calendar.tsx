import { createFileRoute } from "@tanstack/react-router";

import { AdminServiceCalendarPage } from "@/pages/AdminServiceCalendarPage";

export const Route = createFileRoute("/admin/service-calendar")({
  component: AdminServiceCalendarPage,
});
