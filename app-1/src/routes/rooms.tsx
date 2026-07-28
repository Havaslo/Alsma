import { createFileRoute } from "@tanstack/react-router";

import { RoomsPage } from "@/pages/RoomsPage";

export const Route = createFileRoute("/rooms")({ component: RoomsPage });
