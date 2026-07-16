/** User-facing paths consumed by both React Router and the Amazi preview navigation. */
export const AMAZI_ROUTES = {
  home: "/",
} as const;

/** Non-navigable fallback kept outside the preview route catalog. */
export const AMAZI_FALLBACK_ROUTE = "*" as const;
