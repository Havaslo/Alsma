import { useQueryClient } from "@tanstack/react-query";

import { useApiMutation } from "@/lib/query/use-api-mutation";
import { useApiQuery } from "@/lib/query/use-api-query";
import {
  loadAdminSiteContent,
  loadPublishedSiteContent,
  saveAdminSiteContent,
} from "@/lib/site/site-content-api";

export const SITE_CONTENT_QUERY_KEY = ["site-content"] as const;

export const usePublishedSiteContent = (section: string) =>
  useApiQuery([...SITE_CONTENT_QUERY_KEY, "published", section], (signal) =>
    loadPublishedSiteContent(section, signal),
  );

export const useAdminSiteContent = (section: string) =>
  useApiQuery([...SITE_CONTENT_QUERY_KEY, "admin", section], (signal) =>
    loadAdminSiteContent(section, signal),
  );

export const useSaveAdminSiteContent = () => {
  const client = useQueryClient();
  return useApiMutation(saveAdminSiteContent, {
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: SITE_CONTENT_QUERY_KEY }),
    successMessage: "Содержимое страницы сохранено",
  });
};
