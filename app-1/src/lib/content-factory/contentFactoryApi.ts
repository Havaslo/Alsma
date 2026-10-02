import axios from "axios";

import { readAdminSession } from "@/lib/admin/admin-session";
import { apiClient } from "@/lib/api/api-client";
import type {
  ContentChannel,
  DraftVariant,
  FactoryMediaItem,
} from "@/lib/content-factory/contentFactoryData";
import type {
  ContentFactoryDraftSnapshot,
  ContentFactoryGuidelines,
  SavedContentFactoryDraft,
  UploadedContentFactoryMedia,
} from "@/lib/content-factory/contentFactoryTypes";
import { resolveMediaUrl } from "@/lib/site/media-url";

const headers = () => ({
  Authorization: `Bearer ${readAdminSession() ?? ""}`,
});

const prepareReferencePhoto = async (reference: FactoryMediaItem) => {
  let bitmap: ImageBitmap;
  try {
    const response = await fetch(resolveMediaUrl(reference.image));
    if (!response.ok) throw new Error("PHOTO_FETCH_FAILED");
    bitmap = await createImageBitmap(await response.blob());
  } catch {
    throw new Error(
      "Не удалось прочитать выбранное фото. Обновите медиатеку или выберите другое изображение.",
    );
  }

  try {
    const longestSide = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, 1_536 / longestSide);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("PHOTO_CANVAS_UNAVAILABLE");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const prepared = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("PHOTO_CONVERSION_FAILED")),
        "image/jpeg",
        0.88,
      );
    });
    if (prepared.size > 12 * 1_024 * 1_024) {
      throw new Error("Фото после подготовки превышает 12 МБ.");
    }
    return prepared;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Фото после")) {
      throw error;
    }
    throw new Error(
      "Не удалось подготовить фото для AI. Попробуйте изображение JPG, PNG или WebP.",
    );
  } finally {
    bitmap.close();
  }
};

export const loadContentFactoryGuidelines = async (signal?: AbortSignal) => {
  const response = await apiClient.get<ContentFactoryGuidelines>(
    "/admin/content-factory/guidelines",
    { headers: headers(), signal },
  );
  return response.data;
};

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

export const generateContentFactoryText = async (input: {
  prompt: string;
  selectedChannels: ContentChannel[];
  reference: FactoryMediaItem;
}) => {
  const referencePhoto = await prepareReferencePhoto(input.reference);
  const response = await apiClient.post<{
    model: string;
    variants: Array<
      Pick<DraftVariant, "title" | "concept" | "text" | "adaptations">
    >;
  }>("/admin/content-factory/generate/text", referencePhoto, {
    headers: { ...headers(), "Content-Type": "image/jpeg" },
    params: {
      prompt: input.prompt,
      selectedChannels: input.selectedChannels.join(","),
      sourceTitle: input.reference.title,
      sourceCategory: input.reference.category,
      sourceTags: input.reference.tags.join("|"),
    },
    timeout: 180_000,
  });
  return response.data;
};

export const generateContentFactoryImage = async (input: {
  prompt: string;
  channel: ContentChannel;
  reference: FactoryMediaItem;
}) => {
  const referencePhoto = await prepareReferencePhoto(input.reference);
  const response = await apiClient.post<{
    asset: UploadedContentFactoryMedia;
  }>("/admin/content-factory/generate/image", referencePhoto, {
    headers: { ...headers(), "Content-Type": "image/jpeg" },
    params: {
      prompt: input.prompt,
      channel: input.channel,
      sourceTitle: input.reference.title,
      sourceCategory: input.reference.category,
      sourceTags: input.reference.tags.join("|"),
    },
    timeout: 180_000,
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
