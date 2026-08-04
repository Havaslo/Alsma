import { apiUrl } from "@/lib/api/api-base-url";

export const resolveMediaUrl = (url: string): string =>
  url.startsWith("/api/") ? apiUrl(url) : url;
