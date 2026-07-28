import { createFileRoute } from "@tanstack/react-router";

import { OffersPage } from "@/pages/OffersPage";

export const Route = createFileRoute("/offers")({ component: OffersPage });
