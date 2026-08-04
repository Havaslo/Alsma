import { apiOrigins, apiUrl } from "@/lib/api/api-base-url";

const normalizeMediaPath = (path: string): string =>
  path.replace(/^\/api\/api(?=\/media\/)/, "/api");

const isManagedMediaPath = (path: string): boolean =>
  path.startsWith("/api/media/") || path.startsWith("/api/api/media/");

export const canonicalMediaUrl = (url: string): string => {
  if (url.startsWith("/")) return normalizeMediaPath(url);

  try {
    const parsed = new URL(url);
    if (!apiOrigins.has(parsed.origin) || !isManagedMediaPath(parsed.pathname))
      return url;
    return `${normalizeMediaPath(parsed.pathname)}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
};

export const resolveMediaUrl = (url: string): string => {
  const canonicalUrl = canonicalMediaUrl(url);
  return canonicalUrl.startsWith("/api/") ? apiUrl(canonicalUrl) : canonicalUrl;
};
