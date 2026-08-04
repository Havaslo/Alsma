import { Outlet, createFileRoute } from "@tanstack/react-router";

import { PageLayout } from "@/components/layout/PageLayout";

export const Route = createFileRoute("/(page-layout)")({
  component: () => (
    <PageLayout contentClassName="flex items-center justify-center">
      <Outlet />
    </PageLayout>
  ),
});
