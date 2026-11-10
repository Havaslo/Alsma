import { Images } from "lucide-react";

import { VkPhotoAccessButton } from "./VkPhotoAccessButton";
import { VkPlanPhotoPreparation } from "./VkPlanPhotoPreparation";

export const VkPhotoConnectionCard = () => (
  <section
    id="vk-photo-connection"
    className="flex flex-col gap-4 rounded-3xl border border-line bg-brand-foreground p-5 shadow-[0_8px_30px_rgba(25,45,34,0.045)] sm:flex-row sm:items-start sm:justify-between"
  >
    <div className="flex items-start gap-3.5">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-page text-brand">
        <Images aria-hidden="true" className="size-5" />
      </span>
      <div className="min-w-0">
        <h2 className="font-semibold text-page-foreground">
          Фотографии для публикаций VK
        </h2>
        <div className="mt-1">
          <VkPlanPhotoPreparation showAction={false} />
        </div>
      </div>
    </div>
    <VkPhotoAccessButton className="w-full sm:w-72" />
  </section>
);
