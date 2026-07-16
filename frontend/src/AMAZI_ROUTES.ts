/** User-facing paths consumed by both React Router and the Amazi preview navigation. */
export const AMAZI_ROUTES = {
  account: "/account",
  adminDashboard: "/admin/dashboard",
  adminLogin: "/admin/login",
  home: "/",
  login: "/login",
} as const;

/** Non-navigable fallback kept outside the preview route catalog. */
export const AMAZI_FALLBACK_ROUTE = "*" as const;
