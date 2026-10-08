import axios from "axios";

import { readAdminSession } from "@/lib/admin/admin-session";
import { apiClient } from "@/lib/api/api-client";
import type {
  ContentChannel,
  DraftVariant,
  FactoryMediaItem,
} from "@/lib/content-factory/contentFactoryData";
import type {
  ContentFactoryBrief,
  ContentFactoryDraftSnapshot,
  ContentFactoryGuidelines,
  ImageGenerationMode,
  SavedContentFactoryDraft,
  TextRefinementAction,
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

const photoBlobToBase64 = async (photo: Blob) => {
  const bytes = new Uint8Array(await photo.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
  }
  return btoa(binary);
};

const prepareReferencePhotos = async (references: FactoryMediaItem[]) => {
  const photos = await Promise.all(
    references.map(async (reference) => ({
      reference,
      photo: await prepareReferencePhoto(reference),
    })),
  );
  const totalSize = photos.reduce((sum, item) => sum + item.photo.size, 0);
  if (totalSize > 7.5 * 1_024 * 1_024) {
    throw new Error(
      "Исходные фото вместе занимают слишком много места. Оставьте не более четырёх небольших изображений.",
    );
  }
  return Promise.all(
    photos.map(async ({ photo, reference }) => ({
      imageBase64: await photoBlobToBase64(photo),
      sourceTitle: reference.title,
      sourceCategory: reference.category,
      sourceTags: reference.tags,
    })),
  );
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
  brief: ContentFactoryBrief;
}) => {
  const response = await apiClient.post<{
    model: string;
    variants: Array<
      Pick<DraftVariant, "title" | "concept" | "text" | "adaptations">
    >;
  }>(
    "/admin/content-factory/generate/task",
    {
      prompt: input.prompt,
      selectedChannels: input.selectedChannels,
      brief: input.brief,
    },
    {
      headers: headers(),
      timeout: 180_000,
    },
  );
  return response.data;
};

export const refineContentFactoryText = async (input: {
  action: TextRefinementAction;
  currentText: string;
  customInstruction?: string;
  prompt: string;
  selectedChannels: ContentChannel[];
  reference?: FactoryMediaItem;
  brief: ContentFactoryBrief;
}) => {
  const referencePhoto = input.reference
    ? await prepareReferencePhoto(input.reference)
    : null;
  if (referencePhoto && referencePhoto.size > 7 * 1_024 * 1_024) {
    throw new Error("Фото слишком большое для текстовой переработки.");
  }
  const response = await apiClient.post<{
    model: string;
    text: string;
    adaptations: DraftVariant["adaptations"];
  }>(
    "/admin/content-factory/generate/refine",
    {
      action: input.action,
      currentText: input.currentText,
      customInstruction: input.customInstruction,
      prompt: input.prompt,
      brief: input.brief,
      ...(referencePhoto
        ? {
            referencePhotoBase64: await photoBlobToBase64(referencePhoto),
            sourceTitle: input.reference!.title,
            sourceCategory: input.reference!.category,
            sourceTags: input.reference!.tags,
          }
        : {}),
      selectedChannels: input.selectedChannels,
    },
    { headers: headers(), timeout: 180_000 },
  );
  return response.data;
};

export const generateContentFactoryImage = async (input: {
  imageCount: number;
  mode: ImageGenerationMode;
  prompt: string;
  postText: string;
  selectedChannels: ContentChannel[];
  references: FactoryMediaItem[];
}) => {
  if (input.mode === "edit" && !input.references.length) {
    throw new Error("Для редактирования выберите хотя бы одно исходное фото.");
  }
  const referencePhotos =
    input.mode === "edit"
      ? await prepareReferencePhotos(input.references.slice(0, 4))
      : [];
  const response = await apiClient.post<{
    jobId: string;
    status: "pending";
  }>(
    "/admin/content-factory/generate/image",
    {
      prompt: input.prompt,
      mode: input.mode,
      postText: input.postText,
      selectedChannels: input.selectedChannels,
      imageCount: input.imageCount,
      referencePhotos,
    },
    {
      headers: headers(),
      timeout: 15_000,
    },
  );
  const deadline = Date.now() + 4 * 60_000;
  let latestPollingError: unknown;
  while (Date.now() < deadline) {
    await new Promise((resolve) => window.setTimeout(resolve, 1_200));
    try {
      const statusResponse = await apiClient.get<
        | { status: "pending" | "processing" }
        | {
            status: "failed";
            message: string;
          }
        | {
            status: "completed";
            assets: Array<{
              channels: ContentChannel[];
              asset: UploadedContentFactoryMedia;
              setIndex: number;
            }>;
          }
      >(`/admin/content-factory/generate/image/${response.data.jobId}`, {
        headers: headers(),
        timeout: 15_000,
      });
      latestPollingError = undefined;
      switch (statusResponse.data.status) {
        case "pending":
        case "processing":
          continue;
        case "failed":
          throw new Error(statusResponse.data.message);
        case "completed": {
          const assetsByChannel: Partial<
            Record<ContentChannel, UploadedContentFactoryMedia[]>
          > = {};
          const orderedAssets = [...statusResponse.data.assets].sort(
            (left, right) => left.setIndex - right.setIndex,
          );
          for (const { asset, channels } of orderedAssets) {
            for (const channel of channels) {
              assetsByChannel[channel] ??= [];
              assetsByChannel[channel].push(asset);
            }
          }
          return assetsByChannel;
        }
      }
    } catch (error) {
      if (error instanceof Error && !axios.isAxiosError(error)) throw error;
      if (
        axios.isAxiosError(error) &&
        error.response &&
        error.response.status < 500
      ) {
        throw error;
      }
      latestPollingError = error;
    }
  }
  if (latestPollingError) {
    throw new Error(
      "Генерация ещё выполняется на сервере. Не запускайте её повторно; обновите страницу через минуту.",
    );
  }
  throw new Error(
    "Генерация ещё выполняется на сервере. Не запускайте её повторно; обновите страницу через минуту.",
  );
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
