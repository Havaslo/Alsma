import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/api-client";

export const canEmbedTravelLine = () => window.location.hostname === "alsma.ru";

export const useTravelLineConfig = () =>
  useQuery({
    queryKey: ["booking-provider"],
    queryFn: async () =>
      (
        await apiClient.get<{ enabled: boolean; checkoutReady: boolean }>(
          "/travelline/config",
        )
      ).data,
    staleTime: 60_000,
    retry: 1,
  });
