import { createFileRoute } from "@tanstack/react-router";

import { HardwareProceduresPage } from "@/pages/HardwareProceduresPage";

export const Route = createFileRoute("/hardware-procedures")({
  component: HardwareProceduresPage,
});
