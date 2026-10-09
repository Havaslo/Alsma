import { readAdminSession } from "@/lib/admin/admin-session";
import { apiClient } from "@/lib/api/api-client";
import type {
  ContentPlanPostInput,
  ContentPlanPostRecord,
  ContentPlanPreview,
} from "@/lib/content-factory/contentFactoryTypes";

const headers = () => ({
  Authorization: `Bearer ${readAdminSession() ?? ""}`,
});

export const previewContentPlanFile = async (
  file: File,
): Promise<ContentPlanPreview> => {
  const response = await apiClient.post<ContentPlanPreview>(
    "/admin/content-factory/plan/preview",
    file,
    {
      headers: { ...headers(), "Content-Type": "application/octet-stream" },
      params: { fileName: file.name },
      timeout: 30_000,
    },
  );
  return response.data;
};

export const generateContentPlanPosts = async (input: {
  fileName: string;
  posts: ContentPlanPostInput[];
}) => {
  const response = await apiClient.post<{
    importId: string;
    postCount: number;
    status: "queued";
  }>("/admin/content-factory/plan/generate", input, {
    headers: headers(),
    timeout: 15_000,
  });
  return response.data;
};

export const createManualContentPlanPosts = async (input: {
  date: string;
  time: string;
  title: string;
  posts: Array<{
    channel: ContentPlanPostInput["channel"];
    text: string;
    imageIds: string[];
  }>;
}) => {
  const response = await apiClient.post<{
    importId: string;
    postCount: number;
  }>("/admin/content-factory/plan/posts/manual", input, { headers: headers() });
  return response.data;
};

export const loadContentPlanPosts = async (signal?: AbortSignal) => {
  const response = await apiClient.get<{ items: ContentPlanPostRecord[] }>(
    "/admin/content-factory/plan/posts",
    { headers: headers(), signal, timeout: 15_000 },
  );
  return response.data.items;
};

export const updateContentPlanPost = async (
  postId: string,
  input: Partial<Pick<ContentPlanPostInput, "date" | "time">> & {
    title?: string;
    text?: string;
  },
) => {
  const response = await apiClient.patch<{ post: ContentPlanPostRecord }>(
    `/admin/content-factory/plan/posts/${postId}`,
    input,
    { headers: headers() },
  );
  return response.data.post;
};

export const approveContentPlanPost = async (postId: string) => {
  const response = await apiClient.post<{ post: ContentPlanPostRecord }>(
    `/admin/content-factory/plan/posts/${postId}/approve`,
    {},
    { headers: headers() },
  );
  return response.data.post;
};

export const cancelContentPlanPost = async (postId: string) => {
  const response = await apiClient.post<{ post: ContentPlanPostRecord }>(
    `/admin/content-factory/plan/posts/${postId}/cancel`,
    {},
    { headers: headers() },
  );
  return response.data.post;
};

export const retryContentPlanPost = async (postId: string) => {
  await apiClient.post(
    `/admin/content-factory/plan/posts/${postId}/retry`,
    {},
    { headers: headers() },
  );
};
