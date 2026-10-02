import { createFileRoute } from "@tanstack/react-router";

import { AdminContentFactoryPage } from "@/pages/AdminContentFactoryPage";

export const Route = createFileRoute("/admin/content-factory")({
  component: AdminContentFactoryPage,
});
