const configuredApiBaseUrl = import.meta.env.DEV
  ? import.meta.env.VITE_API_DEVELOPMENT_URL
  : import.meta.env.VITE_API_PRODUCTION_URL;

if (!configuredApiBaseUrl) {
  throw new Error("The project backend URL is not configured.");
}

export const apiBaseUrl = configuredApiBaseUrl.replace(/\/+$/, "");

export const apiOrigins = new Set(
  [
    import.meta.env.VITE_API_DEVELOPMENT_URL,
    import.meta.env.VITE_API_PRODUCTION_URL,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => new URL(value).origin),
);

const apiBasePath = new URL(apiBaseUrl).pathname.replace(/\/+$/, "");

export const apiUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const pathWithoutDuplicateApi =
    apiBasePath.endsWith("/api") &&
    (normalizedPath === "/api" || normalizedPath.startsWith("/api/"))
      ? normalizedPath.slice(4)
      : normalizedPath;
  return `${apiBaseUrl}${pathWithoutDuplicateApi}`;
};
