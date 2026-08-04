import { Outlet, createRootRoute } from "@tanstack/react-router";

import { ErrorPage } from "@/pages/error/ErrorPage";
import { NotFoundPage } from "@/pages/not-found/NotFoundPage";

export const Route = createRootRoute({
  component: () => <Outlet />,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
});
