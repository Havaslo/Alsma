import { createFileRoute } from "@tanstack/react-router";

import { AdminLoginPage } from "@/pages/AdminLoginPage";

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginPage,
});
