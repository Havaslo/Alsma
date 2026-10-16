import { LegalDocumentPage } from "@/components/site/LegalDocumentPage";
import content from "@/content/legal/privacy.md?raw";

export const PrivacyPage = () => (
  <LegalDocumentPage
    content={content}
    subtitle="Порядок обработки персональных данных на сайте alsma.ru."
    title="Политика обработки персональных данных"
  />
);
