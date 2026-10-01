import { useQueryClient } from "@tanstack/react-query";

import {
  completeGuestProfile,
  loadGuestProfile,
} from "@/lib/auth/guest-auth-api";
import { useApiMutation } from "@/lib/query/use-api-mutation";
import { useApiQuery } from "@/lib/query/use-api-query";

export const GUEST_PROFILE_QUERY_KEY = ["guest-profile"] as const;

export const useGuestAuth = () =>
  useApiQuery(GUEST_PROFILE_QUERY_KEY, (signal) => loadGuestProfile(signal), {
    refetchInterval: 30_000,
  });

export const useCompleteGuestProfile = () => {
  const queryClient = useQueryClient();
  return useApiMutation(completeGuestProfile, {
    onSuccess: (profile) =>
      queryClient.setQueryData(GUEST_PROFILE_QUERY_KEY, profile),
    successMessage: "Имя сохранено",
  });
};
