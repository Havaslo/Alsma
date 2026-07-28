import { readAdminSession } from "@/lib/admin/admin-session";
import { apiClient } from "@/lib/api/api-client";

export type SiteContentItem = {
  readonly content: Record<string, unknown>;
  readonly id: string;
  readonly itemKey: string;
  readonly position: number;
  readonly section: string;
  readonly status: "archived" | "draft" | "published";
  readonly title: string | null;
};

const adminHeaders = () => ({
  Authorization: `Bearer ${readAdminSession() ?? ""}`,
});

export const loadPublishedSiteContent = (
  section: string,
  signal?: AbortSignal,
) =>
  apiClient.get<{ items: SiteContentItem[] }>(`/site-content/${section}`, {
    signal,
  });

export const loadAdminSiteContent = (section: string, signal?: AbortSignal) =>
  apiClient.get<{ items: SiteContentItem[] }>(
    `/site-content/admin/${section}`,
    {
      headers: adminHeaders(),
      signal,
    },
  );

export const saveAdminSiteContent = (input: {
  content: Record<string, unknown>;
  itemKey: string;
  position: number;
  section: string;
  status: SiteContentItem["status"];
  title: string;
}) =>
  apiClient.put<{ item: SiteContentItem }>(
    `/site-content/admin/${input.section}/${input.itemKey}`,
    {
      content: input.content,
      position: input.position,
      status: input.status,
      title: input.title,
    },
    { headers: adminHeaders() },
  );
export const uploadSiteMedia = (file: File) =>
  apiClient
    .post<{
      asset: {
        readonly contentType: string;
        readonly fileName: string;
        readonly objectId: string;
        readonly sizeBytes: number;
        readonly url: string;
      };
      upload: {
        readonly uploadFields: Readonly<Record<string, string>>;
        readonly uploadUrl: string;
      };
    }>(
      "/media/admin/uploads",
      {
        contentType: file.type,
        fileName: file.name,
        sizeBytes: file.size,
      },
      { headers: adminHeaders() },
    )
    .then(async (response) => {
      const formData = new FormData();
      Object.entries(response.data.upload.uploadFields).forEach(
        ([name, value]) => formData.append(name, value),
      );
      formData.append("file", file);
      const uploadResponse = await fetch(response.data.upload.uploadUrl, {
        body: formData,
        method: "POST",
      });
      if (!uploadResponse.ok)
        throw new Error("Не удалось загрузить файл в хранилище.");
      return response.data.asset;
    });
