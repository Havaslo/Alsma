import { createFileRoute } from "@tanstack/react-router";

import { LegalDocumentPage } from "@/components/site/LegalDocumentPage";
import content from "@/content/legal/cookies.md?raw";

const CookiesPage = () => (
  <LegalDocumentPage
    content={content}
    subtitle="Информация о необходимых и необязательных cookie на сайте."
    title="Уведомление об использовании cookie"
  />
);

export const Route = createFileRoute("/cookies")({ component: CookiesPage });
