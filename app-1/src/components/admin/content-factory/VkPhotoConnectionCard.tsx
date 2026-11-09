import { VkPlanPhotoPreparation } from "./VkPlanPhotoPreparation";

export const VkPhotoConnectionCard = () => (
  <section
    id="vk-photo-connection"
    className="space-y-3 rounded-3xl border border-line bg-brand-foreground p-5"
  >
    <h2 className="font-semibold text-page-foreground">
      Фотографии для публикаций VK
    </h2>
    <VkPlanPhotoPreparation />
  </section>
);
