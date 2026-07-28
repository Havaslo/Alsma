import { createFileRoute } from "@tanstack/react-router";

import { SpaPage } from "@/pages/SpaPage";

export const Route = createFileRoute("/spa")({ component: SpaPage });
