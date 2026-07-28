import { createFileRoute } from "@tanstack/react-router";

import { EntertainmentPage } from "@/pages/EntertainmentPage";

export const Route = createFileRoute("/entertainment")({
  component: EntertainmentPage,
});
