const configuredApiBaseUrl = import.meta.env.DEV
  ? import.meta.env.VITE_API_DEVELOPMENT_URL
  : import.meta.env.VITE_API_PRODUCTION_URL;

if (!configuredApiBaseUrl) {
  throw new Error("The project backend URL is not configured.");
}

export const apiBaseUrl = configuredApiBaseUrl.replace(/\/+$/, "");

export const apiUrl = (path: string): string =>
  `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
