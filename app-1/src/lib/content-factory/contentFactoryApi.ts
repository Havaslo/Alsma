import axios from "axios";

import { readAdminSession } from "@/lib/admin/admin-session";
import { apiClient } from "@/lib/api/api-client";
import type {
  ContentFactoryDraftSnapshot,
  SavedContentFactoryDraft,
  UploadedContentFactoryMedia,
} from "@/lib/content-factory/contentFactoryTypes";

const headers = () => ({
  Authorization: `Bearer ${readAdminSession() ?? ""}`,
});

export const loadContentFactoryDrafts = async (signal?: AbortSignal) => {
  const response = await apiClient.get<{ items: SavedContentFactoryDraft[] }>(
    "/admin/content-factory/drafts",
    { headers: headers(), signal },
  );
  return response.data.items;
};

export const saveContentFactoryDraft = async (
  draftId: string | null,
  input: { snapshot: ContentFactoryDraftSnapshot; title: string },
) => {
  const response = draftId
    ? await apiClient.put<{ draft: SavedContentFactoryDraft }>(
        `/admin/content-factory/drafts/${draftId}`,
        input,
        { headers: headers() },
      )
    : await apiClient.post<{ draft: SavedContentFactoryDraft }>(
        "/admin/content-factory/drafts",
        input,
        { headers: headers() },
      );
  return response.data.draft;
};

export const loadContentFactoryMedia = async (signal?: AbortSignal) => {
  const response = await apiClient.get<{
    items: UploadedContentFactoryMedia[];
  }>("/admin/content-factory/media", { headers: headers(), signal });
  return response.data.items;
};

export const uploadContentFactoryMedia = async (file: File) => {
  const response = await apiClient.post<{
    asset: UploadedContentFactoryMedia;
  }>("/admin/content-factory/media", file, {
    headers: { ...headers(), "Content-Type": file.type },
    params: { fileName: file.name },
    timeout: 120_000,
  });
  return response.data.asset;
};

export const contentFactoryErrorMessage = (
  error: unknown,
  fallback = "Не удалось выполнить действие. Попробуйте ещё раз.",
) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      { error?: { message?: unknown } } | undefined;
    if (typeof data?.error?.message === "string") return data.error.message;
  }
  return error instanceof Error && error.message ? error.message : fallback;
};
