import { createFileRoute } from "@tanstack/react-router";

import { LegalDocumentPage } from "@/components/site/LegalDocumentPage";
import content from "@/content/legal/offer.md?raw";

const OfferPage = () => (
  <LegalDocumentPage
    content={content}
    subtitle="Публичная оферта на заключение договора оказания услуг средства размещения"
    title="Публичная оферта"
  />
);

export const Route = createFileRoute("/offer")({ component: OfferPage });
