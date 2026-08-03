import { createFileRoute } from "@tanstack/react-router";

import { BookingPage } from "@/pages/BookingPage";

export const Route = createFileRoute("/booking")({ component: BookingPage });
