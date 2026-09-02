import { createFileRoute } from "@tanstack/react-router";

import { UHotelsBookingPage } from "@/pages/UHotelsBookingPage";

export const Route = createFileRoute("/booking")({
  component: UHotelsBookingPage,
});
