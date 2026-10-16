import { createFileRoute } from "@tanstack/react-router";

import { LegalDocumentPage } from "@/components/site/LegalDocumentPage";
import content from "@/content/legal/house-rules.md?raw";

const HouseRulesPage = () => (
  <LegalDocumentPage
    content={content}
    subtitle="Правила проживания в загородном SPA-Отеле «Алсма»."
    title="Правила проживания"
  />
);

export const Route = createFileRoute("/house-rules")({
  component: HouseRulesPage,
});
