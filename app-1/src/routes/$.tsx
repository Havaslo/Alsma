import { createFileRoute } from "@tanstack/react-router";

import { LegacyApplication } from "@/app/LegacyApplication";

export const Route = createFileRoute("/$")({
  component: LegacyApplication,
});
