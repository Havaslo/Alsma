import { createFileRoute } from "@tanstack/react-router";

import { LegalDocumentPage } from "@/components/site/LegalDocumentPage";
import content from "@/content/legal/booking-cancellation.md?raw";

const BookingCancellationPage = () => (
  <LegalDocumentPage
    content={content}
    subtitle="Как проверить условия, подтвердить бронирование, отменить заказ и получить возврат."
    title="Бронирование и отмена"
  />
);

export const Route = createFileRoute("/booking-cancellation")({
  component: BookingCancellationPage,
});
