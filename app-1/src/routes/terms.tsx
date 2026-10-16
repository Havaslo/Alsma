import { createFileRoute } from "@tanstack/react-router";

import { LegalDocumentPage } from "@/components/site/LegalDocumentPage";
import content from "@/content/legal/terms.md?raw";

const TermsPage = () => (
  <LegalDocumentPage
    content={content}
    subtitle="Пользовательское соглашение сайта alsma.ru"
    title="Пользовательское соглашение"
  />
);

export const Route = createFileRoute("/terms")({ component: TermsPage });
