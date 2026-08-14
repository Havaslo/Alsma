import { readAdminSession } from "@/lib/admin/admin-session";
import { apiClient } from "@/lib/api/api-client";
import { canonicalMediaUrl } from "@/lib/site/media-url";

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

const canonicalizeContentValue = (value: unknown): unknown => {
  if (typeof value === "string") return canonicalMediaUrl(value);
  if (Array.isArray(value)) return value.map(canonicalizeContentValue);
  if (typeof value === "object" && value) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        canonicalizeContentValue(entry),
      ]),
    );
  }
  return value;
};

const canonicalizeContent = (
  content: Record<string, unknown>,
): Record<string, unknown> =>
  canonicalizeContentValue(content) as Record<string, unknown>;

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
      content: canonicalizeContent(input.content),
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
        readonly previewUrl?: string;
        readonly sizeBytes: number;
        readonly url: string;
      };
    }>("/media/admin/uploads", file, {
      headers: {
        ...adminHeaders(),
        "Content-Type": file.type,
      },
      params: { fileName: file.name },
    })
    .then((response) => response.data.asset);

export const regenerateSitePdfPreview = (objectToken: string) =>
  apiClient
    .post<{ previewUrl: string }>(
      "/media/admin/pdf-preview",
      { objectToken },
      { headers: adminHeaders() },
    )
    .then((response) => response.data);
