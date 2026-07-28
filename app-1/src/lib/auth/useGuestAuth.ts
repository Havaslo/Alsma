import { loadGuestProfile } from "@/lib/auth/guest-auth-api";
import { useApiQuery } from "@/lib/query/use-api-query";

export const GUEST_PROFILE_QUERY_KEY = ["guest-profile"] as const;

export const useGuestAuth = () =>
  useApiQuery(GUEST_PROFILE_QUERY_KEY, (signal) => loadGuestProfile(signal));
