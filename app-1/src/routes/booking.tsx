import { createFileRoute } from "@tanstack/react-router";

import { BookingEntryPage } from "@/pages/BookingEntryPage";

export const Route = createFileRoute("/booking")({
  component: BookingEntryPage,
});
