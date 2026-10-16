import { createFileRoute } from "@tanstack/react-router";

import { LegalDocumentPage } from "@/components/site/LegalDocumentPage";
import content from "@/content/legal/consent.md?raw";

const ConsentPage = () => (
  <LegalDocumentPage
    content={content}
    subtitle="Отдельное согласие на обработку данных для ответа на обращение, а также необязательное согласие на рекламные сообщения."
    title="Согласие на обработку персональных данных"
  />
);

export const Route = createFileRoute("/consent")({ component: ConsentPage });
