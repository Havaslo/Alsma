import { useQueryClient } from "@tanstack/react-query";

import {
  type ServiceSection,
  reorderServices,
} from "@/lib/services/admin-services-api";

type SectionsResponse = { data: { sections: ServiceSection[] } };

export const useReorderServices = (
  section: ServiceSection | undefined,
  onError: (message: string) => void,
) => {
  const client = useQueryClient();
  return async (serviceIds: string[]) => {
    if (!section) return;
    const previous = client.getQueryData<SectionsResponse>([
      "service-sections",
    ]);
    client.setQueryData<SectionsResponse>(["service-sections"], (current) =>
      current
        ? {
            ...current,
            data: {
              ...current.data,
              sections: current.data.sections.map((entry) =>
                entry.id === section.id
                  ? {
                      ...entry,
                      services: serviceIds
                        .map((id) =>
                          entry.services.find((service) => service.id === id),
                        )
                        .filter(
                          (
                            service,
                          ): service is ServiceSection["services"][number] =>
                            Boolean(service),
                        ),
                    }
                  : entry,
              ),
            },
          }
        : current,
    );
    try {
      await reorderServices(section.id, serviceIds);
    } catch {
      client.setQueryData(["service-sections"], previous);
      onError("Не удалось сохранить порядок карточек. Попробуйте ещё раз.");
    }
  };
};
