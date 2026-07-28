import { createFileRoute } from "@tanstack/react-router";

import { AllInclusivePage } from "@/pages/AllInclusivePage";

export const Route = createFileRoute("/all-inclusive")({
  component: AllInclusivePage,
});
