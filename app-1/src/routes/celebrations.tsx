import { createFileRoute } from "@tanstack/react-router";

import { CelebrationsPage } from "@/pages/CelebrationsPage";

export const Route = createFileRoute("/celebrations")({
  component: CelebrationsPage,
});
